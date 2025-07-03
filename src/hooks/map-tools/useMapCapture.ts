
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import { useToast } from "@/hooks/use-toast";

interface UseMapCaptureProps {
  mapRef: React.RefObject<Map | null>;
  activeBaseLayerId: string;
}

export const useMapCapture = ({ mapRef }: UseMapCaptureProps) => {
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);

  const captureMapDataUrl = useCallback(async (): Promise<string | null> => {
    if (!mapRef.current) {
      toast({ description: 'El mapa no está listo para ser capturado.' });
      return null;
    }

    setIsCapturing(true);

    const map = mapRef.current;
    
    return new Promise((resolve) => {
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
                  if (canvas.width > 0 && canvas.height > 0) {
                    const opacity = parseFloat(canvas.style.opacity);
                    mapContext.globalAlpha = isNaN(opacity) ? 1 : opacity;
                    const transform = canvas.style.transform;
                    const matrix = new DOMMatrix(transform);
                    mapContext.setTransform(matrix);
                    mapContext.drawImage(canvas, 0, 0);
                  }
              }
          });
          
          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          
          const dataUrl = mapCanvas.toDataURL('image/jpeg', 0.9);
          resolve(dataUrl);

        } catch (error) {
          console.error('Error capturing map:', error);
          toast({ description: `Error al capturar el mapa: ${error instanceof Error ? error.message : String(error)}` });
          resolve(null);
        } finally {
            setIsCapturing(false);
        }
      });
      map.renderSync();
    });

  }, [mapRef, toast]);

  return {
    captureMapDataUrl,
    isCapturing,
  };
};
