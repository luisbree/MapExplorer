
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import JSZip from 'jszip';
import shp from 'shpjs';
import { nanoid } from 'nanoid';
import type { MapLayer } from '@/lib/types';
import type { Toast } from '@/hooks/use-toast';

interface FileUploadParams {
    selectedFile: File | null;
    selectedMultipleFiles: FileList | null;
    onAddLayer: (layer: MapLayer) => void;
    toast: (options: Parameters<typeof Toast>[0]) => void;
    uniqueIdPrefix: string;
}

const getFileExtension = (filename: string) => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
};

const createVectorLayer = (features: any[], fileName: string): MapLayer => {
    const source = new VectorSource({ features });
    const layerId = `${fileName}-${nanoid()}`;
    const olLayer = new VectorLayer({
        source,
        properties: { id: layerId, name: fileName, type: 'vector' },
    });
    return {
        id: layerId,
        name: fileName,
        olLayer,
        visible: true,
        opacity: 1,
        type: 'vector',
    };
};

export const handleFileUpload = async ({
    selectedFile,
    selectedMultipleFiles,
    onAddLayer,
    toast,
}: FileUploadParams): Promise<void> => {

    const geojsonFormat = new GeoJSON({ featureProjection: 'EPSG:3857' });
    const kmlFormat = new KML({ extractStyles: true, showPointNames: true });

    const processFile = async (file: File) => {
        const fileName = file.name;
        const fileExtension = getFileExtension(fileName);
        const reader = new FileReader();

        return new Promise<void>((resolve, reject) => {
            reader.onload = async (e) => {
                try {
                    const content = e.target?.result;
                    if (!content) {
                        return reject(new Error("El contenido del archivo está vacío."));
                    }

                    let features;
                    switch (fileExtension) {
                        case 'geojson':
                        case 'json':
                            features = geojsonFormat.readFeatures(content);
                            break;
                        case 'kml':
                            features = kmlFormat.readFeatures(content, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857'});
                            break;
                        case 'kmz': {
                            const zip = await JSZip.loadAsync(content as ArrayBuffer);
                            const kmlFile = Object.values(zip.files).find(
                                (file) => getFileExtension(file.name) === 'kml' && !file.dir
                            );

                            if (!kmlFile) {
                                throw new Error('No se encontró un archivo .kml dentro del .kmz.');
                            }

                            const kmlContent = await kmlFile.async('string');
                            features = kmlFormat.readFeatures(kmlContent, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
                            break;
                        }
                        case 'zip': // This now handles both user-provided zips and our on-the-fly created ones
                            const geojsonData = await shp(content as ArrayBuffer);
                            features = geojsonFormat.readFeatures(geojsonData);
                            break;
                        default:
                            return reject(new Error(`Tipo de archivo no soportado: .${fileExtension}`));
                    }
                    
                    if (features && features.length > 0) {
                        onAddLayer(createVectorLayer(features, fileName));
                        toast({ description: `Capa "${fileName}" cargada con ${features.length} entidades.` });
                    } else {
                       toast({ description: `No se encontraron entidades en "${fileName}".` });
                    }
                    resolve();

                } catch (err) {
                    reject(err);
                }
            };

            reader.onerror = (err) => reject(new Error(`Error de FileReader: ${err}`));

            if (['zip', 'kmz'].includes(fileExtension)) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        });
    };

    if (selectedFile) { // Single file selected
        const fileExtension = getFileExtension(selectedFile.name);
        if (['shp', 'dbf', 'shx', 'prj', 'cpg'].includes(fileExtension)) {
            toast({
                title: "Shapefile Incompleto",
                description: "Para cargar un Shapefile, debe seleccionar todos sus archivos (.shp, .dbf, .shx, etc.) juntos, o subir un único archivo .zip.",
                variant: 'destructive',
            });
            return;
        }

        try {
            await processFile(selectedFile);
        } catch (error: any) {
            console.error("Error processing file:", error);
            toast({ description: `Error al procesar ${selectedFile.name}: ${error.message}`, variant: 'destructive' });
        }
    } else if (selectedMultipleFiles) { // Multiple files selected
        let filesToProcess = Array.from(selectedMultipleFiles);
        const shpFile = filesToProcess.find(f => getFileExtension(f.name) === 'shp');

        // Handle shapefile group if present
        if (shpFile) {
            const shpBaseName = shpFile.name.substring(0, shpFile.name.lastIndexOf('.'));
            const allFileNames = filesToProcess.map(f => f.name);
            const requiredDbf = `${shpBaseName}.dbf`;
            const requiredShx = `${shpBaseName}.shx`;

            if (!allFileNames.includes(requiredDbf)) {
                toast({ description: `Para el shapefile, falta el archivo requerido: ${requiredDbf}`, variant: 'destructive' });
                return;
            }
            if (!allFileNames.includes(requiredShx)) {
                toast({ description: `Para el shapefile, falta el archivo requerido: ${requiredShx}`, variant: 'destructive' });
                return;
            }

            // Group all files belonging to the shapefile by basename
            const shapefileParts = filesToProcess.filter(f => f.name.startsWith(shpBaseName));
            
            const zip = new JSZip();
            shapefileParts.forEach(part => zip.file(part.name, part));
            
            try {
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const zipFile = new File([zipBlob], `${shpBaseName}.zip`);
                await processFile(zipFile);
                
                // Exclude shapefile parts from further processing
                const shapefilePartNames = shapefileParts.map(p => p.name);
                filesToProcess = filesToProcess.filter(f => !shapefilePartNames.includes(f.name));

            } catch (err: any) {
                 console.error("Error processing shapefile components:", err);
                 toast({ description: `Error al procesar el Shapefile: ${err.message}`, variant: 'destructive' });
                 return; // Stop if shapefile processing fails
            }
        }
        
        // Process any remaining files (e.g., KMLs, GeoJSONs selected alongside a shapefile)
        for (const file of filesToProcess) {
            try {
                await processFile(file);
            } catch (error: any) {
                console.error(`Error processing file ${file.name}:`, error);
                toast({ description: `Error al procesar ${file.name}: ${error.message}`, variant: 'destructive' });
            }
        }
    }
};
