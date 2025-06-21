
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import { useToast } from "@/hooks/use-toast";

interface UseMapCaptureProps {
  mapRef: React.RefObject<Map | null>;
  activeBaseLayerId: string;
}

export const useMapCapture = ({ mapRef, activeBaseLayerId }: UseMapCaptureProps) => {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

  const captureMap = useCallback((outputType: 'jpeg-full' | 'jpeg-red' | 'jpeg-green' | 'jpeg-blue') => {
    if (!mapRef.current) {
      toast({ description: 'El mapa no está listo para ser capturado.' });
      return;
    }
    setIsCapturing(true);
    toast({ description: 'Iniciando captura del mapa...' });

    const map = mapRef.current;
    
    const allLayers = map.getLayers().getArray();
    const esriLayer = allLayers.find(layer => layer.get('baseLayerId') === 'esri-satellite');
    const currentActiveBaseLayer = allLayers.find(layer => layer.get('baseLayerId') === activeBaseLayerId);

    if (!esriLayer) {
        toast({ description: 'No se encontró la capa base satelital de ESRI.' });
        setIsCapturing(false);
        return;
    }

    const wasEsriVisible = esriLayer.getVisible();

    const restoreOriginalState = () => {
        if (!wasEsriVisible) {
            esriLayer.setVisible(false);
            if (currentActiveBaseLayer) {
                currentActiveBaseLayer.setVisible(true);
            }
        }
        setIsCapturing(false);
    };

    if (!wasEsriVisible) {
        if (currentActiveBaseLayer) {
            currentActiveBaseLayer.setVisible(false);
        }
        esriLayer.setVisible(true);
    }
    
    map.once('rendercomplete', () => {
      try {
        const mapCanvas = document.createElement('canvas');
        const size = map.getSize();
        if (!size) {
            throw new Error("Map size is not available.");
        }
        mapCanvas.width = size[0];
        mapCanvas.height = size[1];
        const mapContext = mapCanvas.getContext('2d');
        if (!mapContext) {
            throw new Error("Could not get canvas context.");
        }

        Array.from(map.getViewport().querySelectorAll('.ol-layer canvas')).forEach(canvas => {
            if (canvas instanceof HTMLCanvasElement) {
                const opacity = parseFloat(canvas.style.opacity);
                mapContext.globalAlpha = isNaN(opacity) ? 1 : opacity;
                const transform = canvas.style.transform;
                const matrix = new DOMMatrix(transform);
                mapContext.setTransform(matrix);
                mapContext.drawImage(canvas, 0, 0);
            }
        });
        
        mapContext.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        
        if (outputType !== 'jpeg-full') {
            const imageData = mapContext.getImageData(0, 0, mapCanvas.width, mapCanvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                switch (outputType) {
                    case 'jpeg-red':
                        data[i+1] = 0; // Green
                        data[i+2] = 0; // Blue
                        break;
                    case 'jpeg-green':
                        data[i] = 0;   // Red
                        data[i+2] = 0; // Blue
                        break;
                    case 'jpeg-blue':
                        data[i] = 0;   // Red
                        data[i+1] = 0; // Green
                        break;
                }
            }
            mapContext.putImageData(imageData, 0, 0);
        }

        const link = document.createElement('a');
        link.href = mapCanvas.toDataURL('image/jpeg', 0.9);
        link.download = `map_capture_${outputType}_${new Date().getTime()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast({ description: 'Captura de mapa guardada exitosamente.' });
      } catch (error) {
        console.error('Error capturing map:', error);
        toast({ description: `Error al capturar el mapa: ${error instanceof Error ? error.message : String(error)}` });
      } finally {
        restoreOriginalState();
        map.renderSync();
      }
    });

    map.renderSync();
  }, [mapRef, toast, activeBaseLayerId]);

  return {
    captureMap,
    isCapturing,
  };
};
