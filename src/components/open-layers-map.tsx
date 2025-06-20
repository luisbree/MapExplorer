"use client";

import { useEffect, useRef } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { fromLonLat, toLonLat } from "ol/proj";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";
import { Style, Icon } from "ol/style";
import type { Coordinates } from "./map-explorer";

interface OpenLayersMapProps {
  center: Coordinates | null;
  zoom: number;
  markerCoords: Coordinates | null;
  onMapClick: (coords: Coordinates) => void;
}

const OpenLayersMap = ({ center, zoom, markerCoords, onMapClick }: OpenLayersMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerLayerRef = useRef<VectorLayer<any> | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter = center ? fromLonLat(center) : fromLonLat([0, 0]);

    const markerSource = new VectorSource();
    markerLayerRef.current = new VectorLayer({
      source: markerSource,
      style: new Style({
        image: new Icon({
          anchor: [0.5, 1],
          src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="hsl(217, 89%, 61%)" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
          scale: 1.5,
        }),
      }),
    });

    const newMap = new Map({
      target: mapContainerRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        markerLayerRef.current,
      ],
      view: new View({
        center: initialCenter,
        zoom: zoom,
        enableRotation: false,
        minZoom: 3,
        maxZoom: 19,
      }),
      controls: [],
    });

    newMap.on("click", (event) => {
      const clickedCoords = toLonLat(event.coordinate) as Coordinates;
      onMapClick(clickedCoords);
    });
    
    mapRef.current = newMap;
    
    return () => {
      if (mapRef.current) {
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.getView().animate({
        center: fromLonLat(center),
        zoom: zoom,
        duration: 500,
      });
    }
  }, [center, zoom]);
  
  useEffect(() => {
    if (markerLayerRef.current && markerCoords) {
      const source = markerLayerRef.current.getSource();
      source.clear();
      const markerFeature = new Feature({
        geometry: new Point(fromLonLat(markerCoords)),
      });
      source.addFeature(markerFeature);
    } else if (markerLayerRef.current) {
        markerLayerRef.current.getSource().clear();
    }
  }, [markerCoords]);

  return <div ref={mapContainerRef} className="w-full h-full bg-secondary" />;
};

export default OpenLayersMap;
