
"use client";

import { useState, useCallback } from 'react';
import type { Map } from 'ol';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { useToast } from "@/hooks/use-toast";
import type { MapLayer } from '@/lib/types';
import { nanoid } from 'nanoid';

// Type for a server in the library
export interface WfsServer {
  name: string;
  url: string;
}

// Type for a discovered layer from a WFS GetCapabilities response
export interface WfsDiscoveredLayer {
  name: string;
  title: string;
  added: boolean;
}

interface UseWfsLibraryProps {
  mapRef: React.RefObject<Map | null>;
  isMapReady: boolean;
  addLayer: (layer: MapLayer) => void;
}

// Predefined list of WFS servers. User will provide these later.
export const PREDEFINED_WFS_SERVERS: WfsServer[] = [
  {
    name: 'INTA NODO Nacional',
    url: 'https://geo-backend.inta.gob.ar/geoserver/wfs'
  },
  {
    name: 'IGN - Capas Vectoriales',
    url: 'https://wms.ign.gob.ar/geoserver/ows'
  },
  {
    name: 'IGN - Riesgo de Desastres',
    url: 'https://wms.ign.gob.ar/geoserver/ign_riesgo/ows'
  }
];

export const useWfsLibrary = ({
  isMapReady,
  addLayer
}: UseWfsLibraryProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [discoveredLayers, setDiscoveredLayers] = useState<WfsDiscoveredLayer[]>([]);
  const [activeServerUrl, setActiveServerUrl] = useState<string>('');

  const fetchWfsLayers = useCallback(async (url: string) => {
    if (!url.trim()) {
      toast({ description: 'Por favor, ingrese una URL de servidor WFS válida.' });
      return;
    }
    setIsLoading(true);
    setDiscoveredLayers([]); // Clear previous results
    setActiveServerUrl(url);

    const baseUrl = url.trim().split('?')[0].replace(/\/$/, ''); // Get URL without existing params and trailing slash
    const getCapabilitiesUrl = `${baseUrl}?service=WFS&version=2.0.0&request=GetCapabilities`;
    const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(getCapabilitiesUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error al obtener capas WFS: ${response.statusText}. Detalles: ${errorData}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const errorNode = xml.querySelector('ServiceException, ServiceExceptionReport, ows\\:Exception');
      if (errorNode) {
        throw new Error(`Error en la respuesta del servidor WFS: ${errorNode.textContent || 'Error desconocido'}`);
      }
      const layerNodes = Array.from(xml.querySelectorAll('FeatureType, wfs\\:FeatureType'));

      const layers: WfsDiscoveredLayer[] = layerNodes.map(node => {
        const nameNode = node.querySelector('Name, wfs\\:Name');
        const titleNode = node.querySelector('Title, wfs\\:Title');
        const name = nameNode?.textContent ?? '';
        const title = titleNode?.textContent ?? name;
        return { name, title, added: false };
      }).filter(l => l.name);

      if (layers.length > 0) {
        toast({ description: `${layers.length} capas encontradas en el servidor WFS.` });
        setDiscoveredLayers(layers);
      } else {
        toast({ description: 'No se encontraron capas en el servidor WFS proporcionado.' });
      }
    } catch (error: any) {
      console.error("Error fetching WFS layers:", error);
      toast({ description: `Error al conectar con el servidor WFS: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const addWfsLayerToMap = useCallback(async (layerName: string, layerTitle: string) => {
    if (!isMapReady || !activeServerUrl) return;

    setIsLoading(true);
    const baseUrl = activeServerUrl.split('?')[0].replace(/\/$/, '');
    const getFeatureUrl = `${baseUrl}?service=WFS&version=1.1.0&request=GetFeature&typename=${layerName}&outputFormat=application/json&srsname=EPSG:3857`;
    const proxyUrl = `/api/geoserver-proxy?url=${encodeURIComponent(getFeatureUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Error en la solicitud GetFeature: ${response.statusText}. Detalles: ${errorData}`);
      }

      const geojsonData = await response.json();
      if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
        toast({ description: `La capa "${layerTitle}" no contiene entidades o no pudo ser cargada.` });
        return;
      }
      
      const vectorSource = new VectorSource({
        features: new GeoJSON().readFeatures(geojsonData),
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
        properties: {
          id: `wfs-lib-${layerName}-${nanoid()}`,
          name: layerTitle || layerName,
          type: 'wfs',
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
      
      setDiscoveredLayers(prev => prev.map(l => l.name === layerName ? { ...l, added: true } : l));
      toast({ description: `Capa "${layerTitle}" añadida con ${geojsonData.features.length} entidades.` });
    } catch (error: any) {
      console.error("Error adding WFS layer:", error);
      toast({ description: `Error al cargar capa WFS: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  }, [isMapReady, activeServerUrl, addLayer, toast]);

  return {
    isLoading,
    discoveredLayers,
    fetchWfsLayers,
    addWfsLayerToMap,
  };
};
