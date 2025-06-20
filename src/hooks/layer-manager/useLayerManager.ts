
"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Map } from 'ol';
import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import type Feature from 'ol/Feature';
import type { Geometry } from 'ol/geom';
import { useToast } from "@/hooks/use-toast";
import { findSentinel2Footprints as fetchSentinelFootprints } from '@/services/sentinel';
import type { MapLayer, VectorMapLayer } from '@/lib/types';
import { nanoid } from 'nanoid';
import { Style, Stroke, Fill } from 'ol/style';

interface UseLayerManagerProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  drawingLayerRef: React.RefObject<VectorLayer<VectorSource>>;
  drawingSourceRef: React.RefObject<VectorSource>;
  onShowTableRequest: (features: Feature[], layerName: string) => void;
  updateGeoServerDiscoveredLayerState: (layerName: string, added: boolean, type: 'wms' | 'wfs') => void;
}

export const useLayerManager = ({
  mapRef,
  isMapReady,
  drawingSourceRef,
  onShowTableRequest,
  updateGeoServerDiscoveredLayerState
}: UseLayerManagerProps) => {
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const { toast } = useToast();
  const [isFindingSentinelFootprints, setIsFindingSentinelFootprints] = useState(false);

  const addLayer = useCallback((newLayer: MapLayer) => {
    if (!mapRef.current) return;
    mapRef.current.addLayer(newLayer.olLayer);
    setLayers(prev => [newLayer, ...prev]);
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
  
  const toggleLayerVisibility = useCallback((layerId: string) => {
    setLayers(prev => prev.map(l => {
      if (l.id === layerId) {
        const newVisibility = !l.visible;
        l.olLayer.setVisible(newVisibility);
        return { ...l, visible: newVisibility };
      }
      return l;
    }));
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

  const zoomToLayerExtent = useCallback((layerId: string) => {
    if (!mapRef.current) return;
    const layer = layers.find(l => l.id === layerId);
    if (layer && 'getSource' in layer.olLayer) {
        const source = (layer.olLayer as VectorLayer<VectorSource>).getSource();
        if (source && source.getFeatures().length > 0) {
            const extent = source.getExtent();
            mapRef.current.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000,
                maxZoom: 16,
            });
        } else {
            toast({ description: "La capa no tiene extensión o está vacía." });
        }
    } else {
        toast({ description: "No se puede obtener la extensión de esta capa." });
    }
  }, [mapRef, layers, toast]);

  const handleShowLayerTable = useCallback((layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (layer && 'getSource' in layer.olLayer) {
      const source = (layer.olLayer as VectorLayer<VectorSource>).getSource();
      if (source) {
        onShowTableRequest(source.getFeatures(), layer.name);
      }
    }
  }, [layers, onShowTableRequest]);

  const isDrawingSourceEmptyOrNotPolygon = useMemo(() => {
    const features = drawingSourceRef.current?.getFeatures() ?? [];
    if (features.length === 0) return true;
    const isPolygon = features.some(f => f.getGeometry()?.getType() === 'Polygon');
    return !isPolygon;
  }, [drawingSourceRef.current?.getFeatures()]);

  const handleExtractFeaturesByPolygon = useCallback((layerIdToExtract: string) => {
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
  
  const findSentinel2FootprintsInCurrentView = useCallback(async () => {
    if (!mapRef.current) return;
    setIsFindingSentinelFootprints(true);
    try {
        const view = mapRef.current.getView();
        const extent = view.calculateExtent(mapRef.current.getSize());
        const features = await fetchSentinelFootprints(extent, view.getProjection());
        
        if (features.length === 0) {
            toast({ description: "No se encontraron escenas de Sentinel-2 en la vista actual." });
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
    toggleLayerVisibility,
    setLayerOpacity,
    zoomToLayerExtent,
    handleShowLayerTable,
    isDrawingSourceEmptyOrNotPolygon,
    handleExtractFeaturesByPolygon,
    findSentinel2FootprintsInCurrentView,
    isFindingSentinelFootprints,
    clearSentinel2FootprintsLayer
  };
};

