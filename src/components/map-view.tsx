
"use client";

import React, { useEffect, useRef } from 'react';
import { Map as OLMap, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import XYZ from 'ol/source/XYZ';
import {defaults as defaultControls} from 'ol/control';
import { fromLonLat } from 'ol/proj';

interface MapViewProps {
  setMapInstanceAndElement: (map: OLMap, element: HTMLDivElement) => void;
  onMapClick?: (event: any) => void; 
  activeBaseLayerId?: string; 
}

// Definitions for all potential base layers
export const ALL_BASE_LAYER_DEFINITIONS = [
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
] as const;

// Definitions for base layers to be shown in the selector
// Now includes all layers from ALL_BASE_LAYER_DEFINITIONS
export const BASE_LAYER_DEFINITIONS = [...ALL_BASE_LAYER_DEFINITIONS];


const MapView: React.FC<MapViewProps> = ({ setMapInstanceAndElement, onMapClick, activeBaseLayerId }) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const olMapInstanceRef = useRef<OLMap | null>(null); 

  useEffect(() => {
    if (!mapElementRef.current || olMapInstanceRef.current) { 
      return;
    }

    const initialBaseLayers = ALL_BASE_LAYER_DEFINITIONS.map(def => {
        const layer = def.createLayer();
        layer.setVisible(def.id === (activeBaseLayerId || BASE_LAYER_DEFINITIONS[0].id));
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
    const currentMap = olMapInstanceRef.current;

    currentMap.getLayers().forEach(layer => {
        if (layer.get('isBaseLayer')) {
            layer.setVisible(layer.get('baseLayerId') === activeBaseLayerId);
        }
    });
  }, [activeBaseLayerId]); 

  return <div ref={mapElementRef} className="w-full h-full bg-gray-200" />;
};

export default MapView;
