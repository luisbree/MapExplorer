
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GeoServerDiscoveredLayer } from '@/lib/types';
import { Layers, Workflow } from 'lucide-react'; 

interface GeoServerLayerListProps {
  geoServerDiscoveredLayers: GeoServerDiscoveredLayer[];
  onAddGeoServerLayerToMap: (layerName: string, layerTitle: string) => void; 
  onAddGeoServerLayerAsWFS: (layerName: string, layerTitle: string) => Promise<void>; 
}

const GeoServerLayerList: React.FC<GeoServerLayerListProps> = ({
  geoServerDiscoveredLayers,
  onAddGeoServerLayerToMap,
  onAddGeoServerLayerAsWFS,
}) => {
  if (!geoServerDiscoveredLayers || geoServerDiscoveredLayers.length === 0) {
    return <p className="text-xs text-gray-400/80 text-center py-2">No hay capas de GeoServer para mostrar. Ingrese una URL y cargue capas.</p>;
  }

  const handleAddWFS = async (layerName: string, layerTitle: string) => {
    try {
      await onAddGeoServerLayerAsWFS(layerName, layerTitle);
    } catch (e) {
      console.error("Error invoking onAddGeoServerLayerAsWFS from GeoServerLayerList:", e);
    } 
  };

  const truncateTitle = (title: string, maxLength: number = 20) => { // Changed maxLength to 20
    if (title.length > maxLength) {
      return title.substring(0, maxLength) + "...";
    }
    return title;
  };

  return (
    <>
      <Label className="text-xs font-medium text-white/90 mb-1 block">Capas Disponibles en GeoServer:</Label>
      <ScrollArea className="h-40 border border-white/10 p-2 rounded-md bg-black/10">
          <ul className="space-y-1.5 w-full">
              {geoServerDiscoveredLayers.map((gsLayer) => (
                  <li key={gsLayer.name} className="flex items-center p-1.5 rounded-md border border-white/15 bg-black/10 hover:bg-white/15 transition-colors overflow-hidden">
                      <div className="flex items-center space-x-1 shrink-0 mr-2"> 
                         <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2 bg-sky-600/30 hover:bg-sky-500/50 border-sky-500/50 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            onClick={() => onAddGeoServerLayerToMap(gsLayer.name, gsLayer.title)}
                            disabled={gsLayer.wmsAddedToMap}
                            title={gsLayer.wmsAddedToMap ? "Capa WMS ya añadida" : "Añadir capa como WMS (visual)"}
                        >
                            <Layers className="h-3 w-3 mr-1" /> WMS
                        </Button>
                         <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-6 px-2 bg-teal-600/30 hover:bg-teal-500/50 border-teal-500/50 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            onClick={() => handleAddWFS(gsLayer.name, gsLayer.title)}
                            disabled={gsLayer.wfsAddedToMap}
                            title={gsLayer.wfsAddedToMap ? "Capa WFS ya añadida" : "Añadir capa como WFS (datos vectoriales)"}
                        >
                             <Workflow className="h-3 w-3 mr-1" /> WFS
                        </Button>
                      </div>
                      <span
                        className="flex-1 text-xs font-medium text-white min-w-0" 
                        title={`${gsLayer.title} (${gsLayer.name})`} 
                      >
                          {truncateTitle(gsLayer.title)}
                      </span>
                  </li>
              ))}
          </ul>
      </ScrollArea>
    </>
  );
};

export default GeoServerLayerList;
