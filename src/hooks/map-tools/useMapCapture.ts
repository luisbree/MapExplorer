
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

  const performCapture = useCallback(async (outputType: 'jpeg-full' | 'jpeg-red' | 'jpeg-green' | 'jpeg-blue', download: boolean): Promise<string | null> => {
    if (!mapRef.current) {
      toast({ description: 'El mapa no está listo para ser capturado.' });
      return null;
    }
    setIsCapturing(true);
    if (download) {
      toast({ description: 'Iniciando captura del mapa...' });
    }

    const map = mapRef.current;
    
    const allLayers = map.getLayers().getArray();
    const esriLayer = allLayers.find(layer => layer.get('baseLayerId') === 'esri-satellite');
    const currentActiveBaseLayer = allLayers.find(layer => layer.get('baseLayerId') === activeBaseLayerId);

    if (!esriLayer) {
        toast({ description: 'No se encontró la capa base satelital de ESRI.' });
        setIsCapturing(false);
        return null;
    }

    const wasEsriVisible = esriLayer.getVisible();
    
    return new Promise((resolve) => {
      const restoreOriginalStateAndFinish = (result: string | null) => {
          if (!wasEsriVisible) {
              esriLayer.setVisible(false);
              if (currentActiveBaseLayer) {
                  currentActiveBaseLayer.setVisible(true);
              }
          }
          setIsCapturing(false);
          map.renderSync();
          resolve(result);
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
          
          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          
          if (outputType !== 'jpeg-full') {
              const imageData = mapContext.getImageData(0, 0, mapCanvas.width, mapCanvas.height);
              const data = imageData.data;
              for (let i = 0; i < data.length; i += 4) {
                  const r = data[i];
                  const g = data[i+1];
                  const b = data[i+2];
                  let grayValue = 0;
                  
                  switch (outputType) {
                      case 'jpeg-red': grayValue = r; break;
                      case 'jpeg-green': grayValue = g; break;
                      case 'jpeg-blue': grayValue = b; break;
                  }
                  data[i] = grayValue;
                  data[i+1] = grayValue;
                  data[i+2] = grayValue;
              }
              mapContext.putImageData(imageData, 0, 0);
          }

          const dataUrl = mapCanvas.toDataURL('image/jpeg', 0.9);

          if (download) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `map_capture_${outputType}_${new Date().getTime()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast({ description: 'Captura de mapa guardada exitosamente.' });
          }
          restoreOriginalStateAndFinish(dataUrl);
        } catch (error) {
          console.error('Error capturing map:', error);
          toast({ description: `Error al capturar el mapa: ${error instanceof Error ? error.message : String(error)}` });
          restoreOriginalStateAndFinish(null);
        }
      });
      map.renderSync();
    });

  }, [mapRef, toast, activeBaseLayerId]);

  const captureMap = (outputType: 'jpeg-full' | 'jpeg-red' | 'jpeg-green' | 'jpeg-blue') => {
    performCapture(outputType, true);
  };
  
  const captureMapDataUrl = (outputType: 'jpeg-full' | 'jpeg-red' | 'jpeg-green' | 'jpeg-blue') => {
    return performCapture(outputType, false);
  };


  return {
    captureMap,
    captureMapDataUrl,
    isCapturing,
  };
};
