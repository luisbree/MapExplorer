
"use client";

import { useState, useCallback, useEffect } from 'react';
import type { Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import TileWMS from 'ol/source/TileWMS';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer, GeoServerDiscoveredLayer } from '@/lib/types';
import { nanoid } from 'nanoid';

interface UseGeoServerLayersProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  addLayer: (layer: MapLayer) => void;
  onLayerStateUpdate: (layerName: string, added: boolean, type: 'wms' | 'wfs') => void;
  setIsWfsLoading: (isLoading: boolean) => void;
}

export const useGeoServerLayers = ({
  mapRef,
  isMapReady,
  addLayer,
  onLayerStateUpdate,
  setIsWfsLoading
}: UseGeoServerLayersProps) => {
  const { toast } = useToast();
  const [geoServerUrlInput, setGeoServerUrlInput] = useState('');
  const [isLoadingGeoServerLayers, setIsLoadingGeoServerLayers] = useState(false);

  const handleFetchGeoServerLayers = useCallback(async (): Promise<GeoServerDiscoveredLayer[]> => {
    if (!geoServerUrlInput.trim()) {
      toast({ description: 'Por favor, ingrese una URL de GeoServer válida.' });
      return [];
    }
    setIsLoadingGeoServerLayers(true);
    const getCapabilitiesUrl = `${geoServerUrlInput.trim()}/wms?service=WMS&version=1.3.0&request=GetCapabilities`;
    const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(getCapabilitiesUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error al obtener capas de GeoServer: ${response.statusText}. Detalles: ${errorData}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const errorNode = xml.querySelector('ServiceException, ServiceExceptionReport');
      if (errorNode) {
          throw new Error(`Error en la respuesta de GeoServer: ${errorNode.textContent || 'Error desconocido'}`);
      }
      const layerNodes = Array.from(xml.querySelectorAll('Layer[queryable="1"]'));

      const discoveredLayers = layerNodes.map(node => {
          const name = node.querySelector('Name')?.textContent ?? '';
          const title = node.querySelector('Title')?.textContent ?? name;
          return { name, title, wmsAddedToMap: false, wfsAddedToMap: false };
      }).filter(l => l.name); // Filter out layers without a name

      if (discoveredLayers.length > 0) {
        toast({ description: `${discoveredLayers.length} capas encontradas en GeoServer.` });
      } else {
        toast({ description: 'No se encontraron capas publicadas en la URL de GeoServer proporcionada.' });
      }
      return discoveredLayers;

    } catch (error: any) {
      console.error("Error fetching GeoServer layers:", error);
      toast({ description: `Error al conectar con GeoServer: ${error.message}` });
      return [];
    } finally {
      setIsLoadingGeoServerLayers(false);
    }
  }, [geoServerUrlInput, toast]);

  const handleAddGeoServerLayerToMap = useCallback((layerName: string, layerTitle: string, isVisible: boolean = true) => {
    if (!isMapReady || !mapRef.current || !geoServerUrlInput) return;

    const wmsSource = new TileWMS({
      url: `${geoServerUrlInput}/wms`,
      params: { 'LAYERS': layerName, 'TILED': true },
      serverType: 'geoserver',
      transition: 0,
      crossOrigin: 'anonymous',
    });

    const wmsLayer = new TileLayer({
      source: wmsSource,
      visible: isVisible,
      properties: {
        id: `wms-${layerName}-${nanoid()}`,
        name: layerTitle || layerName,
        type: 'wms',
        gsLayerName: layerName
      }
    });

    addLayer({
      id: wmsLayer.get('id'),
      name: wmsLayer.get('name'),
      olLayer: wmsLayer,
      visible: isVisible,
      opacity: 1,
      type: 'wms',
      isDeas: true,
    });
    
    onLayerStateUpdate(layerName, true, 'wms');
    if (isVisible) {
      toast({ description: `Capa WMS "${layerTitle}" añadida al mapa.` });
    }
  }, [isMapReady, mapRef, geoServerUrlInput, addLayer, onLayerStateUpdate, toast]);
  
  const handleAddGeoServerLayerAsWFS = useCallback(async (layerName: string, layerTitle: string) => {
    if (!isMapReady || !geoServerUrlInput) return;

    setIsWfsLoading(true);
    const wfsUrl = `${geoServerUrlInput}/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=${layerName}&outputFormat=application/json&srsname=EPSG:3857`;
    const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(wfsUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error en la solicitud WFS: ${response.statusText}. Detalles: ${errorData}`);
      }

      const geojsonData = await response.json();
      if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
        toast({ description: `La capa WFS "${layerTitle}" no contiene entidades.` });
        return;
      }
      
      const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(geojsonData),
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        properties: {
          id: `wfs-${layerName}-${nanoid()}`,
          name: layerTitle || layerName,
          type: 'wfs',
          gsLayerName: layerName
        }
      });
      
      addLayer({
        id: vectorLayer.get('id'),
        name: vectorLayer.get('name'),
        olLayer: vectorLayer,
        visible: true,
        opacity: 1,
        type: 'wfs',
      });
      
      onLayerStateUpdate(layerName, true, 'wfs');
      toast({ description: `Capa WFS "${layerTitle}" añadida con ${geojsonData.features.length} entidades.` });
    } catch (error: any) {
      console.error("Error adding WFS layer:", error);
      toast({ description: `Error al cargar capa WFS: ${error.message}` });
    } finally {
      setIsWfsLoading(false);
    }
  }, [isMapReady, geoServerUrlInput, addLayer, onLayerStateUpdate, setIsWfsLoading, toast]);


  return {
    geoServerUrlInput,
    setGeoServerUrlInput,
    isLoadingGeoServerLayers,
    handleFetchGeoServerLayers,
    handleAddGeoServerLayerToMap,
    handleAddGeoServerLayerAsWFS,
  };
};
