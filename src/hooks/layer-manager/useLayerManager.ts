
"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Map } from 'ol';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import { useToast } from "@/hooks/use-toast";
import { findSentinel2Footprints as fetchSentinelFootprints } from '@/services/sentinel';
import type { MapLayer, VectorMapLayer } from '@/lib/types';
import { nanoid } from 'nanoid';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { transformExtent } from 'ol/proj';
import { asArray as asOlColorArray } from 'ol/color';
import GeoJSON from 'ol/format/GeoJSON';
import KML from 'ol/format/KML';


interface UseLayerManagerProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  drawingSourceRef: React.RefObject<VectorSource>;
  onShowTableRequest: (features: Feature[], layerName: string) => void;
  updateGeoServerDiscoveredLayerState: (layerName: string, added: boolean, type: 'wms' | 'wfs') => void;
  selectedFeaturesForExtraction: Feature<Geometry>[];
  clearSelectionAfterExtraction: () => void;
}

const USER_LAYER_START_Z_INDEX = 10;
const DEAS_LAYER_Z_INDEX = 1;

const colorMap: { [key: string]: string } = {
  rojo: '#e63946',
  verde: '#2a9d8f',
  azul: '#0077b6',
  amarillo: '#ffbe0b',
  naranja: '#f4a261',
  violeta: '#8338ec',
  negro: '#000000',
  blanco: '#ffffff',
  gris: '#adb5bd',
  cian: '#00ffff',
  magenta: '#ff00ff',
};

export const useLayerManager = ({
  mapRef,
  isMapReady,
  drawingSourceRef,
  onShowTableRequest,
  updateGeoServerDiscoveredLayerState,
  selectedFeaturesForExtraction,
  clearSelectionAfterExtraction,
}: UseLayerManagerProps) => {
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const { toast } = useToast();
  const [isFindingSentinelFootprints, setIsFindingSentinelFootprints] = useState(false);

  useEffect(() => {
    // This effect ensures z-ordering is correct whenever the layers array changes.
    const userLayers = layers.filter(l => !l.isDeas);
    const userLayerCount = userLayers.length;
    userLayers.forEach((layer, index) => {
      // UI has top layer at index 0. Map has top layer at highest z-index.
      layer.olLayer.setZIndex(USER_LAYER_START_Z_INDEX + (userLayerCount - 1 - index));
    });

    const deasLayers = layers.filter(l => l.isDeas);
    deasLayers.forEach(l => {
      l.olLayer.setZIndex(DEAS_LAYER_Z_INDEX);
    });
  }, [layers]);

  const addLayer = useCallback((newLayer: MapLayer) => {
    if (!mapRef.current) return;
    mapRef.current.addLayer(newLayer.olLayer);
    
    setLayers(prev => {
        // New user layers go to the top of the user layer section.
        // DEAS layers go to the bottom of the list.
        if (newLayer.isDeas) {
            return [...prev, newLayer];
        } else {
            const deasLayers = prev.filter(l => l.isDeas);
            const userLayers = prev.filter(l => !l.isDeas);
            return [newLayer, ...userLayers, ...deasLayers];
        }
    });

  }, [mapRef]);

  const removeLayer = useCallback((layerId: string) => {
    if (!mapRef.current) return;
    const layerToRemove = layers.find(l => l.id === layerId);
    if (layerToRemove) {
      mapRef.current.removeLayer(layerToRemove.olLayer);
      const gsLayerName = layerToRemove.olLayer.get('gsLayerName');
      if (gsLayerName) {
        updateGeoServerDiscoveredLayerState(gsLayerName, false, layerToRemove.type as 'wms'|'wfs');
      }
      setLayers(prev => prev.filter(l => l.id !== layerId));
      toast({ description: `Capa "${layerToRemove.name}" eliminada.` });
    }
  }, [mapRef, layers, toast, updateGeoServerDiscoveredLayerState]);

  const reorderLayers = useCallback((startIndex: number, endIndex: number) => {
      setLayers(prevLayers => {
          // Prevent reordering DEAS layers or dropping onto them.
          // This assumes that all user layers appear before all DEAS layers in the array.
          if (prevLayers[startIndex].isDeas || prevLayers[endIndex].isDeas) {
              return prevLayers;
          }

          const result = Array.from(prevLayers);
          const [removed] = result.splice(startIndex, 1);
          result.splice(endIndex, 0, removed);
          
          return result;
      });
      toast({ description: 'Orden de capas actualizado.' });
  }, [toast]);
  
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => {
        const newLayers = prev.map(l => {
            if (l.id === layerId) {
                const newVisibility = !l.visible;
                l.olLayer.setVisible(newVisibility);
                
                // If a DEAS layer is made visible, it becomes a user layer
                if (l.isDeas && newVisibility) {
                    return { ...l, visible: newVisibility, isDeas: false };
                }
                
                return { ...l, visible: newVisibility };
            }
            return l;
        });

        // Re-sort the array so that user layers are always first
        const userLayers = newLayers.filter(l => !l.isDeas);
        const deasLayers = newLayers.filter(l => l.isDeas);
        return [...userLayers, ...deasLayers];
    });
  }, []);

  const setLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers(prev => prev.map(l => {
      if (l.id === layerId) {
        l.olLayer.setOpacity(opacity);
        return { ...l, opacity };
      }
      return l;
    }));
  }, []);

  const changeLayerStyle = useCallback((layerId: string, styleOptions: { strokeColor?: string; fillColor?: string; lineStyle?: 'solid' | 'dashed' | 'dotted'; lineWidth?: number }) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !(layer.olLayer instanceof VectorLayer)) {
        toast({ description: "Solo se puede cambiar el estilo de capas vectoriales." });
        return;
    }

    const olLayer = layer.olLayer as VectorLayer<any>;
    const existingStyle = olLayer.getStyle();
    let baseStyle: Style;

    // If there is an existing style object (not a function), clone it.
    // Otherwise, create a new default style. This effectively replaces style functions.
    if (existingStyle instanceof Style) {
        baseStyle = existingStyle.clone();
    } else if (Array.isArray(existingStyle) && existingStyle.length > 0 && existingStyle[0] instanceof Style) {
        baseStyle = existingStyle[0].clone();
    } else {
        // This will be the case for layers with no style or a style function.
        // We create a new default style to be modified.
        baseStyle = new Style({
            stroke: new Stroke({ color: '#3399CC', width: 2 }), // Default blue-ish stroke
            fill: new Fill({ color: 'rgba(51, 153, 204, 0.2)' }), // Default blue-ish fill
            image: new CircleStyle({
                radius: 5,
                fill: new Fill({ color: 'rgba(51, 153, 204, 0.2)' }),
                stroke: new Stroke({ color: '#3399CC', width: 1 })
            })
        });
    }

    const stroke = baseStyle.getStroke() ?? new Stroke();
    const fill = baseStyle.getFill() ?? new Fill();
    // For point geometries, we need to handle the image style
    const image = baseStyle.getImage() instanceof CircleStyle ? baseStyle.getImage().clone() as CircleStyle : new CircleStyle({
        radius: 5,
        fill: new Fill({ color: 'rgba(51, 153, 204, 0.2)' }),
        stroke: new Stroke({ color: '#3399CC', width: 1 })
    });
    
    let styleChanged = false;

    if (styleOptions.strokeColor) {
        const colorHex = colorMap[styleOptions.strokeColor.toLowerCase()];
        if (colorHex) {
            styleChanged = true;
            stroke.setColor(colorHex);
            if (image.getStroke()) {
                image.getStroke().setColor(colorHex);
            }
        } else {
            toast({ description: `Color de borde "${styleOptions.strokeColor}" no reconocido.` });
        }
    }

    if (styleOptions.fillColor) {
        const colorHex = colorMap[styleOptions.fillColor.toLowerCase()];
        if (colorHex) {
            styleChanged = true;
            const olColor = asOlColorArray(colorHex);
            const fillColorRgba = [...olColor.slice(0, 3), 0.6] as [number, number, number, number];
            fill.setColor(fillColorRgba);
            if (image.getFill()) {
                image.getFill().setColor(fillColorRgba);
            }
        } else {
            toast({ description: `Color de relleno "${styleOptions.fillColor}" no reconocido.` });
        }
    }


    if (styleOptions.lineWidth) {
        styleChanged = true;
        stroke.setWidth(styleOptions.lineWidth);
        if (image.getStroke()) {
            image.getStroke().setWidth(styleOptions.lineWidth > 3 ? styleOptions.lineWidth / 2 : 1.5);
        }
    }

    if (styleOptions.lineStyle) {
        styleChanged = true;
        let lineDash: number[] | undefined;
        if (styleOptions.lineStyle === 'dashed') lineDash = [10, 10];
        else if (styleOptions.lineStyle === 'dotted') lineDash = [1, 5];
        stroke.setLineDash(lineDash);
    }
    
    if (styleChanged) {
        const newStyle = new Style({ stroke, fill, image });
        olLayer.setStyle(newStyle);
        toast({ description: `Estilo de la capa "${layer.name}" actualizado.` });
    }
  }, [layers, toast]);

  const zoomToLayerExtent = useCallback((layerId: string) => {
    if (!mapRef.current) return;
    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;
    
    if (layer.olLayer instanceof VectorLayer) {
        const source = layer.olLayer.getSource();
        if (source && source.getFeatures().length > 0) {
            const extent = source.getExtent();
            mapRef.current.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000,
                maxZoom: 16,
            });
        } else {
            toast({ description: "La capa no tiene entidades para hacer zoom." });
        }
    } else if (layer.olLayer.get('bbox')) { // Check for WMS layers with a bbox
        const bbox4326: [number, number, number, number] = layer.olLayer.get('bbox');
        try {
            const extent3857 = transformExtent(bbox4326, 'EPSG:4326', 'EPSG:3857');
            if (extent3857 && extent3857.every(isFinite) && (extent3857[2] - extent3857[0] > 0) && (extent3857[3] - extent3857[1] > 0)) {
                mapRef.current.getView().fit(extent3857, {
                    padding: [50, 50, 50, 50],
                    duration: 1000,
                    maxZoom: 16
                });
            } else {
                toast({ description: 'La extensión de la capa WMS no es válida.' });
            }
        } catch (e) {
            console.error('Error transforming WMS extent:', e);
            toast({ description: 'Error al calcular la extensión de la capa WMS.' });
        }
    } else {
        toast({ description: "No se puede hacer zoom a la extensión de este tipo de capa." });
    }
  }, [mapRef, layers, toast]);

  const handleShowLayerTable = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer && layer.olLayer instanceof VectorLayer) {
        const source = layer.olLayer.getSource();
        if (source) {
            const features = source.getFeatures();
            if (features.length > 0) {
                onShowTableRequest(features, layer.name);
            } else {
                toast({ description: `La capa "${layer.name}" no tiene entidades para mostrar en la tabla.` });
            }
        }
    } else {
        toast({ description: "Solo se puede mostrar la tabla de atributos para capas vectoriales." });
    }
  }, [layers, onShowTableRequest, toast]);

  const isDrawingSourceEmptyOrNotPolygon = useMemo(() => {
    const features = drawingSourceRef.current?.getFeatures() ?? [];
    if (features.length === 0) return true;
    const isPolygon = features.some(f => f.getGeometry()?.getType() === 'Polygon');
    return !isPolygon;
  }, [drawingSourceRef.current?.getFeatures()]);

  const handleExtractByPolygon = useCallback((layerIdToExtract: string) => {
    const targetLayer = layers.find(l => l.id === layerIdToExtract) as VectorMapLayer | undefined;
    const drawingFeatures = drawingSourceRef.current?.getFeatures() ?? [];
    const polygonFeature = drawingFeatures.find(f => f.getGeometry()?.getType() === 'Polygon');

    if (!targetLayer || !polygonFeature) {
        toast({ description: "Se requiere una capa vectorial y un polígono dibujado." });
        return;
    }
    const polygonGeometry = polygonFeature.getGeometry();
    if (!polygonGeometry) return;

    const targetSource = targetLayer.olLayer.getSource();
    if (!targetSource) return;

    const intersectingFeatures = targetSource.getFeatures().filter(feature => {
        const featureGeometry = feature.getGeometry();
        return featureGeometry && polygonGeometry.intersectsExtent(featureGeometry.getExtent());
    });

    if (intersectingFeatures.length === 0) {
        toast({ description: "No se encontraron entidades dentro del polígono." });
        return;
    }
    
    const newSourceName = `Extracción de ${targetLayer.name}`;
    const newSource = new VectorSource({ features: intersectingFeatures.map(f => f.clone()) });
    const newLayer = new VectorLayer({
        source: newSource,
        properties: {
            id: `extract-${targetLayer.id}-${nanoid()}`,
            name: newSourceName,
            type: 'vector'
        },
        style: targetLayer.olLayer.getStyle()
    });

    addLayer({
        id: newLayer.get('id'),
        name: newSourceName,
        olLayer: newLayer,
        visible: true,
        opacity: 1,
        type: 'vector'
    });
    toast({ description: `${intersectingFeatures.length} entidades extraídas a una nueva capa.` });
  }, [layers, drawingSourceRef, addLayer, toast]);
  
  const handleExtractBySelection = useCallback(() => {
    if (selectedFeaturesForExtraction.length === 0) {
        toast({ description: "No hay entidades seleccionadas para extraer." });
        return;
    }

    const clonedFeatures = selectedFeaturesForExtraction.map(f => f.clone());
    
    let style;
    let originalLayerName = 'Selección'; // Default name if layer is not found
    const firstFeature = selectedFeaturesForExtraction[0];

    // Find the original layer of the first feature to get its name and style
    if (firstFeature) {
      for (const layer of layers) {
        if (layer.olLayer instanceof VectorLayer) {
          const source = layer.olLayer.getSource();
          // Check if the source contains the *original* feature, not a clone
          if (source && source.hasFeature(firstFeature)) {
            style = layer.olLayer.getStyle();
            originalLayerName = layer.name;
            break;
          }
        }
      }
    }

    const newSourceName = `Extraidas_${originalLayerName}`;
    const newSource = new VectorSource({ features: clonedFeatures });
    const newLayer = new VectorLayer({
        source: newSource,
        properties: {
            id: `extract-sel-${nanoid()}`,
            name: newSourceName,
            type: 'vector'
        },
        style: style // Apply style from original layer if found
    });

    addLayer({
        id: newLayer.get('id'),
        name: newSourceName,
        olLayer: newLayer,
        visible: true,
        opacity: 1,
        type: 'vector'
    });

    toast({ description: `${clonedFeatures.length} entidades extraídas a la capa "${newSourceName}".` });
    
    // Clear selection AFTER creating the new layer
    clearSelectionAfterExtraction();

  }, [selectedFeaturesForExtraction, layers, addLayer, toast, clearSelectionAfterExtraction]);

  const handleExportSelection = useCallback((format: 'geojson' | 'kml') => {
    if (selectedFeaturesForExtraction.length === 0) {
      toast({ description: "No hay entidades seleccionadas para exportar." });
      return;
    }

    try {
      let fileContent = '';
      let fileExtension = format;
      let mimeType = 'application/json';
      const featuresToExport = selectedFeaturesForExtraction.map(f => f.clone());

      if (format === 'geojson') {
        const geojsonFormat = new GeoJSON({
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:4326'
        });
        fileContent = geojsonFormat.writeFeatures(featuresToExport, {
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:4326'
        });
      } else if (format === 'kml') {
        const kmlFormat = new KML({
          extractStyles: true,
          showPointNames: true,
        });
        fileContent = kmlFormat.writeFeatures(featuresToExport, {
          featureProjection: 'EPSG:3857',
          dataProjection: 'EPSG:4326',
        });
        mimeType = 'application/vnd.google-earth.kml+xml';
      }

      const blob = new Blob([fileContent], { type: mimeType });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `seleccion_exportada_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({ description: `Selección exportada como ${format.toUpperCase()}.` });

    } catch (error) {
      console.error('Error exporting selection:', error);
      toast({ description: 'Ocurrió un error al exportar la selección.', variant: 'destructive' });
    }
  }, [selectedFeaturesForExtraction, toast]);
  
  const findSentinel2FootprintsInCurrentView = useCallback(async (dateRange?: { startDate?: string; completionDate?: string }) => {
    if (!mapRef.current) return;
    setIsFindingSentinelFootprints(true);
    try {
        const view = mapRef.current.getView();
        const extent = view.calculateExtent(mapRef.current.getSize());
        const features = await fetchSentinelFootprints(extent, view.getProjection(), dateRange?.startDate, dateRange?.completionDate);
        
        if (features.length === 0) {
            toast({ description: "No se encontraron escenas de Sentinel-2 en la vista actual para el rango de fechas especificado." });
            return;
        }

        const existingLayer = layers.find(l => l.id === 'sentinel-footprints') as VectorMapLayer;
        if (existingLayer) {
            existingLayer.olLayer.getSource()?.clear();
            existingLayer.olLayer.getSource()?.addFeatures(features);
            toast({ description: `Capa de Sentinel-2 actualizada con ${features.length} footprints.` });
        } else {
            const sentinelSource = new VectorSource({ features });
            const sentinelLayer = new VectorLayer({
                source: sentinelSource,
                style: new Style({
                    stroke: new Stroke({ color: 'rgba(255, 0, 255, 1.0)', width: 2 }),
                    fill: new Fill({ color: 'rgba(255, 0, 255, 0.1)' }),
                }),
                properties: { id: 'sentinel-footprints', name: 'Footprints Sentinel-2', type: 'sentinel' }
            });

            addLayer({
                id: 'sentinel-footprints',
                name: 'Footprints Sentinel-2',
                olLayer: sentinelLayer,
                visible: true,
                opacity: 1,
                type: 'sentinel'
            });
            toast({ description: `${features.length} footprints de Sentinel-2 añadidos al mapa.` });
        }
    } catch (error: any) {
        console.error("Error finding Sentinel-2 footprints:", error);
        toast({ description: `Error al buscar escenas: ${error.message}` });
    } finally {
        setIsFindingSentinelFootprints(false);
    }
  }, [mapRef, layers, addLayer, toast]);

  const clearSentinel2FootprintsLayer = useCallback(() => {
    const sentinelLayer = layers.find(l => l.id === 'sentinel-footprints');
    if (sentinelLayer) {
        removeLayer(sentinelLayer.id);
    } else {
        toast({ description: "No hay capa de footprints de Sentinel-2 para limpiar." });
    }
  }, [layers, removeLayer, toast]);


  return {
    layers,
    addLayer,
    removeLayer,
    reorderLayers,
    toggleLayerVisibility,
    setLayerOpacity,
    changeLayerStyle,
    zoomToLayerExtent,
    handleShowLayerTable,
    isDrawingSourceEmptyOrNotPolygon,
    handleExtractByPolygon,
    handleExtractBySelection,
    handleExportSelection,
    findSentinel2FootprintsInCurrentView,
    isFindingSentinelFootprints,
    clearSentinel2FootprintsLayer
  };
};
