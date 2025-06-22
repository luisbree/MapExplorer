
"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Map } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import Feature from 'ol/Feature';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { useToast } from "@/hooks/use-toast";
import { Geometry } from 'ol/geom';
import Select, { type SelectEvent } from 'ol/interaction/Select';
import DragBox from 'ol/interaction/DragBox';
import { singleClick } from 'ol/events/condition';

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
  }, [toast]);
  
  const clearSelection = useCallback(() => {
    if (selectInteractionRef.current) {
      selectInteractionRef.current.getFeatures().clear();
    }
    // The 'select' event on the interaction will handle clearing attributes and features.
  }, []);

  const toggleInspectMode = useCallback(() => {
    const nextState = !isInspectModeActive;
    setIsInspectModeActive(nextState);

    // If turning off, clear selection
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

    // Clean up old interactions
    if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
    if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
    selectInteractionRef.current = null;
    dragBoxInteractionRef.current = null;
    if (mapElementRef.current) mapElementRef.current.style.cursor = 'default';

    if (isInspectModeActive) {
      // Create and add the main Select interaction
      const select = new Select({
        style: highlightStyle,
        multi: true,
        hitTolerance: 3,
        // When in 'box' mode, we don't want clicks to trigger selection.
        // We manage selection programmatically via the DragBox.
        // When in 'click' mode, we use the default singleClick condition.
        condition: selectionMode === 'click' ? singleClick : () => false,
        filter: (feature, layer) => !layer.get('isBaseLayer') && !layer.get('isDrawingLayer'),
      });
      selectInteractionRef.current = select;
      map.addInteraction(select);

      // Listen for selection changes to update the attributes panel
      select.on('select', (e: SelectEvent) => {
        const currentSelectedFeatures = e.selected;
        setSelectedFeatures(currentSelectedFeatures);

        if (currentSelectedFeatures.length > 0) {
          const firstFeature = currentSelectedFeatures[0];
          let layerName = 'Capa seleccionada';
          
          // Try to find the layer of the first selected feature
          map.getLayers().forEach(layer => {
            if (layer instanceof VectorLayer) {
              const source = layer.getSource();
              if (source && source.hasFeature(firstFeature)) {
                layerName = layer.get('name') || layerName;
              }
            }
          });
          processAndDisplayFeatures(currentSelectedFeatures, layerName);
          onNewSelection(); // Signal that a new selection was made
        } else {
          setSelectedFeatureAttributes(null);
          setCurrentInspectedLayerName(null);
        }
      });

      // Add DragBox interaction if in 'box' mode
      if (selectionMode === 'box') {
        const dragBox = new DragBox({});
        dragBoxInteractionRef.current = dragBox;
        map.addInteraction(dragBox);

        dragBox.on('boxstart', () => {
          if (selectInteractionRef.current) {
            selectInteractionRef.current.getFeatures().clear();
          }
        });

        dragBox.on('boxend', (e) => {
          const extent = dragBox.getGeometry().getExtent();
          const selectedInBox: Feature<Geometry>[] = [];
          
          map.getLayers().forEach(layer => {
            if (layer instanceof VectorLayer && layer.getVisible() && !layer.get('isBaseLayer') && !layer.get('isDrawingLayer')) {
              const source = layer.getSource();
              if (source) {
                source.forEachFeatureIntersectingExtent(extent, (feature) => {
                  selectedInBox.push(feature as Feature<Geometry>);
                });
              }
            }
          });
          if (selectInteractionRef.current) {
            selectInteractionRef.current.getFeatures().extend(selectedInBox);
          }
        });
      } else { // 'click' mode
        if (mapElementRef.current) {
          mapElementRef.current.style.cursor = 'help';
        }
      }
    }

    // Cleanup function for when component unmounts or dependencies change
    return () => {
      if (map) {
        if (selectInteractionRef.current) map.removeInteraction(selectInteractionRef.current);
        if (dragBoxInteractionRef.current) map.removeInteraction(dragBoxInteractionRef.current);
      }
    };
  }, [isInspectModeActive, selectionMode, isMapReady, mapRef, mapElementRef, processAndDisplayFeatures, onNewSelection]);

  return {
    isInspectModeActive,
    toggleInspectMode,
    selectionMode,
    setSelectionMode,
    selectedFeatures,
    selectedFeatureAttributes,
    currentInspectedLayerName,
    clearSelection,
    processAndDisplayFeatures, // Expose for layer manager to use
  };
};
