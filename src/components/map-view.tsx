
"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { Map as OLMap, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import {defaults as defaultControls} from 'ol/control';
import { fromLonLat } from 'ol/proj';
import type { Layer } from 'ol/layer';

interface MapViewProps {
  setMapInstanceAndElement: (map: OLMap, element: HTMLDivElement) => void;
  onMapClick?: (event: any) => void; 
  activeBaseLayerId?: string; 
}

export type Band = 'red' | 'green' | 'blue' | 'none';

type BaseLayerDefinition = {
  id: string;
  name: string;
  band?: Band;
  parentLayerId?: string;
  createLayer?: () => TileLayer<XYZ | OSM>;
}

// Definitions for all potential base layers and views
export const BASE_LAYER_DEFINITIONS: readonly BaseLayerDefinition[] = [
  {
    id: 'osm-standard',
    name: 'OpenStreetMap',
    createLayer: () => new TileLayer({
      source: new OSM(),
      properties: { baseLayerId: 'osm-standard', isBaseLayer: true, name: 'OSMBaseLayer' },
    }),
  },
  {
    id: 'carto-light',
    name: 'OSM Gris (Carto)',
    createLayer: () => new TileLayer({
      source: new XYZ({ 
        url: 'https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        attributions: 'Map tiles by <a href="https://carto.com/attributions">Carto</a>, under CC BY 3.0. Data by <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, under ODbL.',
        maxZoom: 20,
        crossOrigin: 'Anonymous'
      }),
      properties: { baseLayerId: 'carto-light', isBaseLayer: true, name: 'CartoGrayscaleBaseLayer' },
    }),
  },
  {
    id: 'esri-satellite',
    name: 'ESRI Satelital',
    createLayer: () => new TileLayer({
      source: new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attributions: 'Tiles © Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
        crossOrigin: 'Anonymous'
      }),
      properties: { baseLayerId: 'esri-satellite', isBaseLayer: true, name: 'ESRISatelliteBaseLayer' },
    }),
  },
  {
    id: 'esri-red',
    name: 'ESRI - Banda Roja',
    band: 'red',
    parentLayerId: 'esri-satellite'
  },
  {
    id: 'esri-green',
    name: 'ESRI - Banda Verde',
    band: 'green',
    parentLayerId: 'esri-satellite'
  },
  {
    id: 'esri-blue',
    name: 'ESRI - Banda Azul',
    band: 'blue',
    parentLayerId: 'esri-satellite'
  },
] as const;


// Function to apply a grayscale filter based on a color band
const applyBandFilter = (layer: Layer, band: Band) => {
  const postRenderCallback = (event: any) => {
    const context = event.context;
    if (!context) return;

    try {
      const canvas = context.canvas;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        let grayValue = 0;
        switch (band) {
          case 'red': grayValue = data[i]; break;
          case 'green': grayValue = data[i + 1]; break;
          case 'blue': grayValue = data[i + 2]; break;
        }
        data[i] = grayValue;
        data[i + 1] = grayValue;
        data[i + 2] = grayValue;
      }
      context.putImageData(imageData, 0, 0);
    } catch (e) {
      // This can happen due to CORS issues if crossOrigin is not set correctly on the source
      // We'll silence it for now as it's a known potential issue with tile servers.
    }
  };

  layer.removeEventListener('postrender', layer.get('bandFilterListener'));
  
  if (band !== 'none') {
    layer.on('postrender', postRenderCallback);
    layer.set('bandFilterListener', postRenderCallback);
  } else {
    layer.set('bandFilterListener', null);
  }
  
  // Trigger a re-render
  layer.getSource()?.refresh();
};

const MapView: React.FC<MapViewProps> = ({ setMapInstanceAndElement, onMapClick, activeBaseLayerId }) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const olMapInstanceRef = useRef<OLMap | null>(null); 
  const baseLayerRefs = useRef<Record<string, TileLayer<any>>>({});

  useEffect(() => {
    if (!mapElementRef.current || olMapInstanceRef.current) { 
      return;
    }

    const initialBaseLayers = BASE_LAYER_DEFINITIONS
      .filter(def => def.createLayer)
      .map(def => {
        const layer = def.createLayer!();
        layer.setVisible(def.id === (activeBaseLayerId || BASE_LAYER_DEFINITIONS[0].id));
        baseLayerRefs.current[def.id] = layer;
        return layer;
    });

    const map = new OLMap({
      target: mapElementRef.current,
      layers: [...initialBaseLayers], 
      view: new View({
        center: fromLonLat([-60.0, -36.5], 'EPSG:3857'),
        zoom: 7,
        projection: 'EPSG:3857', 
        constrainResolution: true, 
      }),
      controls: defaultControls({
        attributionOptions: {
          collapsible: false,
        },
        zoom: true,
        rotate: false, 
      }),
    });
    
    olMapInstanceRef.current = map; 
    setMapInstanceAndElement(map, mapElementRef.current);

    return () => {
      if (olMapInstanceRef.current) {
        olMapInstanceRef.current.setTarget(undefined); 
        olMapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMapInstanceAndElement]); 

  useEffect(() => {
    if (!olMapInstanceRef.current) return; 
    const currentMap = olMapInstanceRef.current;

    if (onMapClick) {
      currentMap.on('singleclick', onMapClick);
    }
    return () => {
      if (onMapClick) { 
        currentMap.un('singleclick', onMapClick);
      }
    };
  }, [onMapClick]); 

  useEffect(() => {
    if (!olMapInstanceRef.current || !activeBaseLayerId) return;

    const selectedDef = BASE_LAYER_DEFINITIONS.find(d => d.id === activeBaseLayerId);
    if (!selectedDef) return;

    const layerIdToShow = selectedDef.parentLayerId || selectedDef.id;

    // Set visibility for all "real" base layers
    Object.values(baseLayerRefs.current).forEach(layer => {
      layer.setVisible(layer.get('baseLayerId') === layerIdToShow);
    });
    
    // Find the ESRI layer to apply/remove filters
    const esriLayer = baseLayerRefs.current['esri-satellite'];
    if (esriLayer) {
       if (selectedDef.parentLayerId === 'esri-satellite') {
         // This is a band view, apply the filter
         applyBandFilter(esriLayer, selectedDef.band || 'none');
       } else {
         // Any other view is selected, remove the filter
         applyBandFilter(esriLayer, 'none');
       }
    }

  }, [activeBaseLayerId]);

  return <div ref={mapElementRef} className="w-full h-full bg-gray-200" />;
};

export default MapView;
