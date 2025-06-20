
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
    toast
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
                        return reject(new Error("File content is empty."));
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
                        case 'zip':
                            const geojsonData = await shp(content as ArrayBuffer);
                            features = geojsonFormat.readFeatures(geojsonData);
                            break;
                        default:
                            return reject(new Error(`Unsupported file type: .${fileExtension}`));
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

            reader.onerror = (err) => reject(new Error(`FileReader error: ${err}`));

            if (fileExtension === 'zip') {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file);
            }
        });
    };

    if (selectedFile) {
        try {
            await processFile(selectedFile);
        } catch (error: any) {
            console.error("Error processing file:", error);
            toast({ description: `Error al procesar ${selectedFile.name}: ${error.message}` });
        }
    } else if (selectedMultipleFiles) {
        // Handle Shapefile components
        const files = Array.from(selectedMultipleFiles);
        const shpFile = files.find(f => getFileExtension(f.name) === 'shp');
        const dbfFile = files.find(f => getFileExtension(f.name) === 'dbf');

        if (shpFile && dbfFile) {
            const zip = new JSZip();
            files.forEach(file => zip.file(file.name, file));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const zipFile = new File([zipBlob], 'shapefile.zip');

            try {
                await processFile(zipFile);
            } catch (error: any) {
                console.error("Error processing shapefile components:", error);
                toast({ description: `Error al procesar shapefile: ${error.message}` });
            }
        } else {
             for (const file of files) {
                try {
                    await processFile(file);
                } catch (error: any) {
                    console.error(`Error processing file ${file.name}:`, error);
                    toast({ description: `Error al procesar ${file.name}: ${error.message}` });
                }
            }
        }
    }
};
