
"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getGeeTileLayer } from '@/ai/flows/gee-flow';
import type { Map } from 'ol';
import { transformExtent } from 'ol/proj';

interface GeeProcessingPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  onAddGeeLayer: (tileUrl: string, layerName: string) => void;
  mapRef: React.RefObject<Map | null>;
  style?: React.CSSProperties;
}

const GeeProcessingPanel: React.FC<GeeProcessingPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  onAddGeeLayer,
  mapRef,
  style,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateLayer = async () => {
    if (!mapRef.current) {
        toast({ description: "El mapa no está listo.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    
    try {
        const view = mapRef.current.getView();
        const extent = view.calculateExtent(mapRef.current.getSize()!);
        const center = view.getCenter() || [0,0];
        const zoom = view.getZoom() || 2;
        
        // Transform extent to EPSG:4326 for GEE
        const extent4326 = transformExtent(extent, view.getProjection(), 'EPSG:4326');

        const result = await getGeeTileLayer({
            aoi: {
                minLon: extent4326[0],
                minLat: extent4326[1],
                maxLon: extent4326[2],
                maxLat: extent4326[3],
            },
            zoom: zoom
        });
        
        if (result && result.tileUrl) {
            onAddGeeLayer(result.tileUrl, 'Sentinel-2 (8-4-3) GEE');
        } else {
            throw new Error("La respuesta del servidor no contenía una URL de teselas.");
        }

    } catch (error: any) {
      console.error("Error generating GEE layer:", error);
      toast({
        title: "Error de GEE",
        description: error.message || "No se pudo generar la capa de Earth Engine.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DraggablePanel
      title="Procesamiento GEE"
      icon={BrainCircuit}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 350, height: "auto" }}
    >
      <div className="bg-white/5 rounded-md p-3 space-y-3">
        <div>
            <h3 className="text-sm font-semibold text-white mb-1">Sentinel-2 Falso Color (Urbano)</h3>
            <p className="text-xs text-gray-300/80 mb-2">
                Genera una composición de bandas 8 (NIR), 4 (Rojo) y 3 (Verde) para la vista actual del mapa.
            </p>
        </div>
        <Button onClick={handleGenerateLayer} disabled={isLoading} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Procesando en GEE..." : "Generar y Añadir Capa"}
        </Button>
      </div>
    </DraggablePanel>
  );
};

export default GeeProcessingPanel;
