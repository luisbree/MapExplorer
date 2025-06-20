"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { APIProvider } from "@vis.gl/react-google-maps";
import CoordinateDisplay from "@/components/coordinate-display";
import { Skeleton } from "./ui/skeleton";

export type Coordinates = [number, number];

const OpenLayersMap = dynamic(() => import('@/components/open-layers-map'), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />
});

const LocationSearch = dynamic(() => import('@/components/location-search'), {
    ssr: false,
    loading: () => <Skeleton className="h-10 w-full" />
});

export default function MapExplorer() {
  const [coords, setCoords] = useState<Coordinates | null>([ -74.006, 40.7128 ]); // Default to NYC
  const [markerCoords, setMarkerCoords] = useState<Coordinates | null>([ -74.006, 40.7128 ]);
  const [zoom, setZoom] = useState<number>(12);
  
  const handleLocationSelect = (lat: number, lng: number) => {
    const newCoords: Coordinates = [lng, lat];
    setCoords(newCoords);
    setMarkerCoords(newCoords);
    setZoom(15);
  };

  const handleMapClick = (newCoords: Coordinates) => {
    setCoords(newCoords);
    setMarkerCoords(newCoords);
  };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={['places']}>
      <div className="relative w-full h-screen">
        <OpenLayersMap
          center={coords}
          zoom={zoom}
          markerCoords={markerCoords}
          onMapClick={handleMapClick}
        />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-2rem)] sm:w-auto sm:left-4 sm:translate-x-0 max-w-sm">
          <LocationSearch onLocationSelect={handleLocationSelect} />
        </div>
        {coords && (
          <div className="absolute bottom-4 left-4 z-10">
            <CoordinateDisplay coordinates={coords} />
          </div>
        )}
      </div>
    </APIProvider>
  );
}
