
"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Loader2, Image as ImageIcon, ShieldCheck, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getGeeTileLayer, authenticateWithGee } from '@/ai/flows/gee-flow';
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
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  const handleAuthentication = async () => {
    setIsAuthenticating(true);
    try {
      const result = await authenticateWithGee();
      if (result.success) {
        toast({
          title: "Autenticación Exitosa",
          description: result.message,
        });
        setIsAuthenticated(true);
      } else {
        // This case might not be hit if errors are always thrown, but it's good practice.
        throw new Error('La autenticación no tuvo éxito pero no arrojó un error.');
      }
    } catch (error: any) {
      console.error("GEE Authentication Error:", error);
      toast({
        title: "Error de Autenticación",
        description: error.message || "Ocurrió un error desconocido durante la autenticación.",
        variant: "destructive",
      });
      setIsAuthenticated(false);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGenerateLayer = async () => {
    if (!mapRef.current) {
        toast({ description: "El mapa no está listo.", variant: "destructive" });
        return;
    }
    if (!isAuthenticated) {
        toast({ description: "Debe autenticarse con GEE primero.", variant: "destructive" });
        return;
    }
    setIsGenerating(true);
    
    try {
        const view = mapRef.current.getView();
        const extent = view.calculateExtent(mapRef.current.getSize()!);
        const zoom = view.getZoom() || 2;
        
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
      setIsGenerating(false);
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
        <div className="space-y-2">
          <Button onClick={handleAuthentication} disabled={isAuthenticating || isAuthenticated} className="w-full">
            {isAuthenticating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isAuthenticated ? (
              <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            {isAuthenticating ? "Autenticando..." : isAuthenticated ? "Autenticado" : "1. Autenticar con GEE"}
          </Button>

          <Button onClick={handleGenerateLayer} disabled={isGenerating || !isAuthenticated} className="w-full">
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? "Procesando..." : "2. Generar y Añadir Capa"}
          </Button>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default GeeProcessingPanel;
