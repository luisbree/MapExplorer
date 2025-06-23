"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import type Feature from 'ol/Feature';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style';
import { useToast } from "@/hooks/use-toast";
import type { Geometry } from 'ol/geom';
import Select, { type SelectEvent } from 'ol/interaction/Select';
import DragBox from 'ol/interaction/DragBox';
import { singleClick, never } from 'ol/events/condition';

interface UseFeatureInspectionProps {
  mapRef: React.RefObject<Map | null>;
  mapElementRef: React.RefObject<HTMLDivElement | null>;
  isMapReady: boolean;
  onNewSelection: () => void;
}

const highlightStyle = new Style({
  stroke: new Stroke({
    color: '#00FFFF', // Cyan
    width: 4,
  }),
  fill: new Fill({
    color: 'rgba(0, 255, 255, 0.2)',
  }),
  image: new CircleStyle({
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
  onNewSelection,
}: UseFeatureInspectionProps) => {
  const { toast } = useToast();
  const [isInspectModeActive, setIsInspectModeActive] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'click' | 'box'>('click');
  const [selectedFeatures, setSelectedFeatures] = useState<Feature<Geometry>[]>([]);
  const [selectedFeatureAttributes, setSelectedFeatureAttributes] = useState<Record<string, any>[] | null>(null);
  const [currentInspectedLayerName, setCurrentInspectedLayerName] = useState<string | null>(null);

  const selectInteractionRef = useRef<Select | null>(null);
  const dragBoxInteractionRef = useRef<DragBox | null>(null);
  
  const onNewSelectionRef = useRef(onNewSelection);
  useEffect(() => {
    onNewSelectionRef.current = onNewSelection;
  }, [onNewSelection]);


  const processAndDisplayFeatures = useCallback((features: Feature<Geometry>[], layerName: string) => {
    if (features.length === 0) {
      setSelectedFeatureAttributes(null);
      setCurrentInspectedLayerName(null);
      return;
    }
    
    const attributes = features.map(feature => {
      const props = feature.getProperties();
      if (props.geometry) {
        delete props.geometry;
      }
      return props;
    });

    setSelectedFeatureAttributes(attributes);
    setCurrentInspectedLayerName(layerName);
    toast({ description: `${features.length} entidad(es) de "${layerName}" seleccionada(s).` });
    
    // Ensure panel is opened whenever attributes are displayed.
    onNewSelectionRef.current();
  }, [toast, onNewSelectionRef]);
  
  const clearSelection = useCallback(() => {
    if (selectInteractionRef.current) {
      selectInteractionRef.current.getFeatures().clear();
    }
    // The 'select' event on the interaction will handle clearing attributes and features state.
  }, []);

  const toggleInspectMode = useCallback(() => {
    const nextState = !isInspectModeActive;
    setIsInspectModeActive(nextState);

    if (!nextState) {
        if (selectInteractionRef.current) {
            selectInteractionRef.current.getFeatures().clear();
        }
        if (mapElementRef.current) {
            mapElementRef.current.style.cursor = 'default';
        }
        toast({ description: 'Modo selección desactivado.' });
    } else {
        toast({ description: 'Modo selección activado.' });
    }
  }, [isInspectModeActive, mapElementRef, toast]);
  
  // Effect to manage interactions based on active state and mode
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Always clean up previous interactions before setting up new ones
    if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
    if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
    selectInteractionRef.current = null;
    dragBoxInteractionRef.current = null;
    if (mapElementRef.current) mapElementRef.current.style.cursor = 'default';

    if (isInspectModeActive) {
      // 1. Create the main Select interaction. It will always be active in inspect mode.
      const select = new Select({
        style: highlightStyle,
        multi: true,
        // The condition for selection depends on the mode.
        condition: selectionMode === 'click' ? singleClick : never, // Disable click in box mode
        filter: (feature, layer) => !layer.get('isBaseLayer') && !layer.get('isDrawingLayer'),
      });
      selectInteractionRef.current = select;
      map.addInteraction(select);

      // 2. This 'select' event handler is the SINGLE source of truth for updating React state.
      select.on('select', (e: SelectEvent) => {
        const currentSelectedFeatures = e.target.getFeatures().getArray();
        
        // Update React state for selected features
        setSelectedFeatures(currentSelectedFeatures);

        if (currentSelectedFeatures.length > 0) {
          const firstFeature = currentSelectedFeatures[0];
          let layerName = 'Capa seleccionada';
          map.getLayers().forEach(layer => {
            if (layer instanceof VectorLayer) {
              const source = layer.getSource();
              if (source && source.hasFeature(firstFeature)) {
                layerName = layer.get('name') || layerName;
              }
            }
          });
          processAndDisplayFeatures(currentSelectedFeatures, layerName);
        } else {
          // This case handles deselection
          setSelectedFeatureAttributes(null);
          setCurrentInspectedLayerName(null);
        }
      });

      // 3. Add DragBox interaction ONLY if in 'box' mode
      if (selectionMode === 'box') {
        if (mapElementRef.current) mapElementRef.current.style.cursor = 'crosshair';
        
        const dragBox = new DragBox({});
        dragBoxInteractionRef.current = dragBox;
        map.addInteraction(dragBox);

        dragBox.on('boxend', (e) => {
          const extent = dragBox.getGeometry().getExtent();
          const selectedFeaturesInBox: Feature<Geometry>[] = [];
          
          map.getLayers().forEach(layer => {
            if (layer instanceof VectorLayer && layer.getVisible() && !layer.get('isBaseLayer') && !layer.get('isDrawingLayer')) {
              const source = layer.getSource();
              if (source) {
                source.forEachFeatureIntersectingExtent(extent, (feature) => {
                  selectedFeaturesInBox.push(feature as Feature<Geometry>);
                });
              }
            }
          });
          
          // Modify the Select interaction's collection. This will fire the 'select' event,
          // which will then update all React state correctly.
          select.getFeatures().clear();
          select.getFeatures().extend(selectedFeaturesInBox);
        });
      } else { // 'click' mode
        if (mapElementRef.current) mapElementRef.current.style.cursor = 'help';
      }
    }

    // Cleanup function to remove interactions when component unmounts or dependencies change
    return () => {
      if (map) {
        if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
        if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
      }
    };
  }, [isInspectModeActive, selectionMode, isMapReady, mapRef, mapElementRef, processAndDisplayFeatures]);

  return {
    isInspectModeActive,
    toggleInspectMode,
    selectionMode,
    setSelectionMode,
    selectedFeatures,
    selectedFeatureAttributes,
    currentInspectedLayerName,
    clearSelection,
    processAndDisplayFeatures,
  };
};