
"use client";

import { useState, useCallback } from 'react';
import type VectorSource from 'ol/source/Vector';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer, OSMCategoryConfig } from '@/lib/types';
import { nanoid } from 'nanoid';
import { transformExtent } from 'ol/proj';
import { get as getProjection } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';
import shp from 'shpjs';
import JSZip from 'jszip';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';


interface UseOSMDataProps {
  drawingSourceRef: React.RefObject<VectorSource>;
  addLayer: (layer: MapLayer) => void;
  osmCategoryConfigs: OSMCategoryConfig[];
}

export const useOSMData = ({ drawingSourceRef, addLayer, osmCategoryConfigs }: UseOSMDataProps) => {
  const { toast } = useToast();
  const [isFetchingOSM, setIsFetchingOSM] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedOSMCategoryIds, setSelectedOSMCategoryIds] = useState<string[]>(['watercourses', 'water_bodies']);
  const [downloadFormat, setDownloadFormat] = useState('geojson');

  const fetchOSMData = useCallback(async () => {
    const drawingSource = drawingSourceRef.current;
    if (!drawingSource || drawingSource.getFeatures().length === 0) {
      toast({ description: 'Por favor, dibuje un polígono en el mapa primero.' });
      return;
    }
    
    const polygonFeature = drawingSource.getFeatures().find(f => f.getGeometry()?.getType() === 'Polygon');
    if (!polygonFeature) {
        toast({ description: "No se encontró un polígono. La obtención de datos OSM requiere un área poligonal." });
        return;
    }

    if (selectedOSMCategoryIds.length === 0) {
      toast({ description: 'Por favor, seleccione al menos una categoría de OSM.' });
      return;
    }

    setIsFetchingOSM(true);
    toast({ description: 'Obteniendo datos de OpenStreetMap...' });

    try {
        const mapProjection = getProjection('EPSG:3857');
        const dataProjection = getProjection('EPSG:4326');
        const extent = polygonFeature.getGeometry()!.getExtent();
        const transformedExtent = transformExtent(extent, mapProjection!, dataProjection!);
        const bboxStr = `${transformedExtent[1]},${transformedExtent[0]},${transformedExtent[3]},${transformedExtent[2]}`;
        
        const selectedConfigs = osmCategoryConfigs.filter(c => selectedOSMCategoryIds.includes(c.id));

        const queryFragments = selectedConfigs.map(c => c.overpassQueryFragment(bboxStr)).join('');
        // Use [out:geojson] to get a valid GeoJSON FeatureCollection directly from Overpass API
        const overpassQuery = `[out:geojson][timeout:60];(${queryFragments});out;`;
        
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Overpass API error: ${response.status} ${errorText}`);
        }
        const osmDataAsGeoJSON = await response.json();

        const geojsonFormat = new GeoJSON({
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
        });
        
        // Parse all features from the GeoJSON response
        const allFeatures = geojsonFormat.readFeatures(osmDataAsGeoJSON);

        // Separate features by category
        const featuresByCategory: Record<string, Feature<Geometry>[]> = {};
        selectedConfigs.forEach(c => featuresByCategory[c.id] = []);

        allFeatures.forEach((feature) => {
            const properties = feature.getProperties(); // OSM tags are in properties
            for (const config of selectedConfigs) {
                if (config.matcher(properties)) {
                    featuresByCategory[config.id].push(feature);
                    break; // Add to first matching category only
                }
            }
        });
        
        let totalFeaturesAdded = 0;
        for (const config of selectedConfigs) {
            const categoryFeatures = featuresByCategory[config.id];
            if (categoryFeatures.length > 0) {
                const vectorSource = new VectorSource({ features: categoryFeatures });
                const layerName = `${config.name} (${categoryFeatures.length})`;
                const newLayer = new VectorLayer({
                    source: vectorSource,
                    style: config.style,
                    properties: {
                        id: `osm-${config.id}-${nanoid()}`,
                        name: layerName,
                        type: 'osm'
                    }
                });

                addLayer({
                    id: newLayer.get('id'),
                    name: layerName,
                    olLayer: newLayer,
                    visible: true,
                    opacity: 1,
                    type: 'osm'
                });
                totalFeaturesAdded += categoryFeatures.length;
            }
        }
        
        if (totalFeaturesAdded > 0) {
            toast({ description: `${totalFeaturesAdded} entidades OSM añadidas al mapa.` });
        } else {
            toast({ description: 'No se encontraron entidades OSM para las categorías seleccionadas.' });
        }

    } catch (error: any) {
      console.error("Error fetching OSM data:", error);
      toast({ description: `Error al obtener datos de OSM: ${error.message}` });
    } finally {
      setIsFetchingOSM(false);
    }
  }, [drawingSourceRef, toast, selectedOSMCategoryIds, osmCategoryConfigs, addLayer]);

  const handleDownloadOSMLayers = useCallback(async (currentLayers: MapLayer[]) => {
      const osmLayers = currentLayers.filter(l => l.type === 'osm' && 'getSource' in l.olLayer);
      if (osmLayers.length === 0) {
          toast({ description: "No hay capas OSM para descargar." });
          return;
      }
      setIsDownloading(true);
      try {
          const geojsonFormat = new GeoJSON({
              featureProjection: 'EPSG:3857',
              dataProjection: 'EPSG:4326'
          });

          if (downloadFormat === 'shp') {
              const zip = new JSZip();
              for (const layer of osmLayers) {
                  const vectorLayer = layer.olLayer as VectorLayer<any>;
                  const features = vectorLayer.getSource().getFeatures();
                  const geoJson = JSON.parse(geojsonFormat.writeFeatures(features));
                  // shp.write requires a features array
                  const shpBuffer = await shp.write(geoJson.features, 'GEOMETRY', {});
                  zip.file(`${layer.name.replace(/ /g, '_')}.zip`, shpBuffer);
              }
              const content = await zip.generateAsync({ type: "blob" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(content);
              link.download = "osm_layers_shp.zip";
              link.click();

          } else { // Handle KML and GeoJSON
              let combinedString = '';
              let fileExtension = downloadFormat;

              if (downloadFormat === 'geojson') {
                  const allFeatures = osmLayers.flatMap(l => (l.olLayer as VectorLayer<any>).getSource().getFeatures());
                  combinedString = geojsonFormat.writeFeatures(allFeatures);
              } else if (downloadFormat === 'kml') {
                  const kmlFormat = new KML({ extractStyles: true });
                  const allFeatures = osmLayers.flatMap(l => (l.olLayer as VectorLayer<any>).getSource().getFeatures());
                  combinedString = kmlFormat.writeFeatures(allFeatures);
              }
              
              const blob = new Blob([combinedString], { type: 'text/plain' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `osm_layers.${fileExtension}`;
              link.click();
          }
          toast({ description: `Capas OSM descargadas como ${downloadFormat.toUpperCase()}.` });
      } catch (error: any) {
          console.error("Error downloading OSM layers:", error);
          toast({ description: `Error al descargar: ${error.message}` });
      } finally {
          setIsDownloading(false);
      }
  }, [downloadFormat, toast]);


  return {
    isFetchingOSM,
    selectedOSMCategoryIds,
    setSelectedOSMCategoryIds,
    fetchOSMData,
    downloadFormat,
    setDownloadFormat,
    isDownloading,
    handleDownloadOSMLayers,
  };
};
