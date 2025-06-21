
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Map, MapBrowserEvent } from 'ol';
import type VectorSource from 'ol/source/Vector';
import type VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer } from '@/lib/types';
import { Geometry } from 'ol/geom';

interface UseFeatureInspectionProps {
  mapRef: React.RefObject<Map | null>;
  mapElementRef: React.RefObject<HTMLDivElement | null>;
  isMapReady: boolean;
  drawingSourceRef: React.RefObject<VectorSource>;
  drawingLayerRef: React.RefObject<VectorLayer<VectorSource>>;
  activeDrawTool: string | null;
  stopDrawingTool: () => void;
}

const highlightStyle = new Style({
  stroke: new Stroke({
    color: '#00FFFF', // Cyan
    width: 4,
  }),
  fill: new Fill({
    color: 'rgba(0, 255, 255, 0.2)',
  }),
  image: new Circle({
    radius: 8,
    fill: new Fill({ color: 'rgba(0, 255, 255, 0.4)' }),
    stroke: new Stroke({ color: '#00FFFF', width: 2 }),
  }),
  zIndex: Infinity,
});

export const useFeatureInspection = ({
  mapRef,
  mapElementRef,
  isMapReady,
  activeDrawTool,
  stopDrawingTool,
}: UseFeatureInspectionProps) => {
  const { toast } = useToast();
  const [isInspectModeActive, setIsInspectModeActive] = useState(false);
  const [selectedFeatureAttributes, setSelectedFeatureAttributes] = useState<Record<string, any>[] | null>(null);
  const [currentInspectedLayerName, setCurrentInspectedLayerName] = useState<string | null>(null);
  const [layers, setLayers] = useState<MapLayer[]>([]);
  const highlightedFeatureRef = useRef<Feature | null>(null);
  const previousStyleRef = useRef<Style | Style[] | undefined>(undefined);

  const clearHighlight = useCallback(() => {
    if (highlightedFeatureRef.current) {
      highlightedFeatureRef.current.setStyle(previousStyleRef.current);
      highlightedFeatureRef.current = null;
      previousStyleRef.current = undefined;
    }
  }, []);
  
  const processAndDisplayFeatures = useCallback((features: Feature<Geometry>[], layerName: string) => {
    if (features.length === 0) {
      toast({ description: `No se encontraron entidades en la capa ${layerName}.` });
      setSelectedFeatureAttributes(null);
      setCurrentInspectedLayerName(null);
      return;
    }
    
    const attributes = features.map(feature => {
      const props = feature.getProperties();
      // Clean up geometry from attributes list
      if (props.geometry) {
        delete props.geometry;
      }
      return props;
    });

    setSelectedFeatureAttributes(attributes);
    setCurrentInspectedLayerName(layerName);
    toast({ description: `${features.length} entidad(es) de "${layerName}" seleccionada(s).` });
  }, [toast]);
  
  const handleMapClick = useCallback((event: MapBrowserEvent<any>) => {
    if (!isInspectModeActive || !mapRef.current) return;
    
    clearHighlight();
    let foundFeatures: Feature[] = [];
    let foundLayerName: string | null = null;
  
    mapRef.current.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
      const layerId = layer?.get('id');
      const layerName = layer?.get('name') || layerId || 'Capa desconocida';
      
      // Don't inspect features from the base layer or drawing layer
      if (layer?.get('isBaseLayer') || layer?.get('isDrawingLayer')) {
        return;
      }
      
      const castedFeature = feature as Feature;
      foundFeatures.push(castedFeature);
      foundLayerName = layerName;
      
      // Highlight the first feature found
      if (!highlightedFeatureRef.current) {
        highlightedFeatureRef.current = castedFeature;
        previousStyleRef.current = castedFeature.getStyle();
        castedFeature.setStyle(highlightStyle);
      }

      return true; // Stop after finding the first feature on the topmost layer
    });

    if (foundFeatures.length > 0 && foundLayerName) {
      processAndDisplayFeatures(foundFeatures, foundLayerName);
    } else {
      setSelectedFeatureAttributes(null);
      setCurrentInspectedLayerName(null);
    }
  }, [isInspectModeActive, mapRef, clearHighlight, processAndDisplayFeatures]);

  const toggleInspectMode = useCallback(() => {
    const newMode = !isInspectModeActive;
    setIsInspectModeActive(newMode);

    if (newMode) {
      if (activeDrawTool) {
        stopDrawingTool();
      }
      toast({ description: 'Modo inspector activado.' });
      if (mapElementRef.current) {
        mapElementRef.current.style.cursor = 'help';
      }
    } else {
      toast({ description: 'Modo inspector desactivado.' });
      if (mapElementRef.current) {
        mapElementRef.current.style.cursor = 'default';
      }
      clearHighlight();
    }
  }, [isInspectModeActive, activeDrawTool, stopDrawingTool, toast, mapElementRef, clearHighlight]);

  const clearInspectedAttributes = useCallback(() => {
    setSelectedFeatureAttributes(null);
    setCurrentInspectedLayerName(null);
    clearHighlight();
  }, [clearHighlight]);

  useEffect(() => {
    if (isMapReady && mapRef.current) {
      mapRef.current.on('singleclick', handleMapClick);
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.un('singleclick', handleMapClick);
      }
    };
  }, [isMapReady, mapRef, handleMapClick]);

  return {
    isInspectModeActive,
    toggleInspectMode,
    selectedFeatureAttributes,
    currentInspectedLayerName,
    processAndDisplayFeatures,
    clearInspectedAttributes,
    updateLayers: setLayers, // allow parent to update layers
    // These are mutable and passed from geo-mapper-client to avoid circular dependencies
    activeDrawTool: null, 
    stopDrawingTool: () => {},
  };
};
