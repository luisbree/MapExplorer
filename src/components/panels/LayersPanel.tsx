
"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import BaseLayerSelector from '@/components/layer-manager/BaseLayerSelector';
import LocationSearch, { type NominatimResult } from '@/components/location-search/LocationSearch';
import MapCaptureControl from '@/components/map-tools/MapCaptureControl';
import GeoServerUrlInput from '@/components/geoserver-connection/GeoServerUrlInput';
import GeoServerLayerList from '@/components/geoserver-connection/GeoServerLayerList';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import type { BaseLayerOptionForSelect, GeoServerDiscoveredLayer } from '@/lib/types'; 
import { Database, Search, ImageUp, Cloud, ImageOff, Loader2 } from 'lucide-react'; 

interface LayersPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void; 
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;

  availableBaseLayers: BaseLayerOptionForSelect[];
  activeBaseLayerId: string;
  onChangeBaseLayer: (id: string) => void;

  onZoomToBoundingBox: (bbox: [number, number, number, number]) => void;

  captureMap: (outputType: 'jpeg-full' | 'jpeg-red' | 'jpeg-green' | 'jpeg-blue') => void;
  isCapturingMap: boolean;

  geoServerUrlInput: string;
  onGeoServerUrlChange: (url: string) => void;
  onFetchGeoServerLayers: () => Promise<GeoServerDiscoveredLayer[]>; 
  geoServerDiscoveredLayers: GeoServerDiscoveredLayer[];
  setGeoServerDiscoveredLayers: React.Dispatch<React.SetStateAction<GeoServerDiscoveredLayer[]>>;
  isLoadingGeoServerLayers: boolean;
  onAddGeoServerLayerToMap: (layerName: string, layerTitle: string) => void;
  onAddGeoServerLayerAsWFS: (layerName: string, layerTitle: string) => Promise<void>;
  
  onFindSentinel2Footprints: () => void;
  onClearSentinel2Footprints: () => void;
  isFindingSentinelFootprints: boolean; 

  style?: React.CSSProperties; 
}


const LayersPanel: React.FC<LayersPanelProps> = ({
  panelRef, isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  availableBaseLayers, activeBaseLayerId, onChangeBaseLayer,
  onZoomToBoundingBox,
  captureMap, isCapturingMap,
  geoServerUrlInput, onGeoServerUrlChange, onFetchGeoServerLayers, 
  geoServerDiscoveredLayers, setGeoServerDiscoveredLayers,
  isLoadingGeoServerLayers, onAddGeoServerLayerToMap, onAddGeoServerLayerAsWFS,
  onFindSentinel2Footprints, onClearSentinel2Footprints, isFindingSentinelFootprints,
  style, 
}) => {
  
  const handleLocationSelection = (location: NominatimResult) => {
    const [sLat, nLat, wLon, eLon] = location.boundingbox.map(coord => parseFloat(coord));
    onZoomToBoundingBox([wLon, sLat, eLon, nLat]);
  };
  
  const handleFetchGeoServer = async () => {
    const discovered = await onFetchGeoServerLayers();
    setGeoServerDiscoveredLayers(discovered);
  };

  return (
    <DraggablePanel
      title="Datos"
      icon={Database}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }} 
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style} 
      zIndex={style?.zIndex as number | undefined} 
    >
      <div className="space-y-3"> 
        
        <LocationSearch onLocationSelect={handleLocationSelection} />

        <div className="flex items-center gap-2"> 
            <div className="flex-grow">
                <BaseLayerSelector
                    availableBaseLayers={availableBaseLayers}
                    activeBaseLayerId={activeBaseLayerId}
                    onChangeBaseLayer={onChangeBaseLayer}
                />
            </div>
            <MapCaptureControl
                onCapture={captureMap}
                isCapturing={isCapturingMap}
            />
        </div>
        
        <Separator className="bg-white/15" />

        <div>
            <h3 className="text-xs font-semibold text-white/90 mb-1.5 flex items-center">
                <Cloud className="h-3.5 w-3.5 mr-1.5 text-primary/80" />
                GeoServer
            </h3>
            <GeoServerUrlInput
                geoServerUrlInput={geoServerUrlInput}
                onGeoServerUrlChange={onGeoServerUrlChange}
                onFetchGeoServerLayers={handleFetchGeoServer}
                isLoadingGeoServerLayers={isLoadingGeoServerLayers}
                uniqueIdPrefix="layerspanel-geoserver"
            />
            {geoServerDiscoveredLayers && geoServerDiscoveredLayers.length > 0 && (
            <div className="mt-2">
                <GeoServerLayerList
                geoServerDiscoveredLayers={geoServerDiscoveredLayers}
                onAddGeoServerLayerToMap={onAddGeoServerLayerToMap}
                onAddGeoServerLayerAsWFS={onAddGeoServerLayerAsWFS}
                />
            </div>
            )}
        </div>
        
        <Separator className="bg-white/15" />

        <div>
          <h3 className="text-xs font-semibold text-white/90 mb-1.5 flex items-center">
            <ImageUp className="h-3.5 w-3.5 mr-1.5 text-primary/80" /> 
            Sentinel-2
          </h3>
          <div className="flex items-center gap-2">
            <Button 
              onClick={onFindSentinel2Footprints} 
              className="h-8 w-8 p-0 flex items-center justify-center bg-black/20 hover:bg-black/40 border border-white/30 text-white/90"
              disabled={isFindingSentinelFootprints}
              title={isFindingSentinelFootprints ? "Buscando..." : "Buscar footprints de escenas Sentinel-2 en la vista actual del mapa"}
            >
              {isFindingSentinelFootprints ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={onClearSentinel2Footprints} 
              variant="destructive"
              className="h-8 w-8 p-0 flex items-center justify-center bg-red-700/30 hover:bg-red-600/50 border border-red-500/50 text-white/90"
              title="Limpiar los footprints de Sentinel-2 del mapa"
            >
              <ImageOff className="h-4 w-4" /> 
            </Button>
          </div>
           <p className="text-xs text-gray-400/70 mt-1">Busca footprints de Sentinel-2 L2A. Puede requerir paciencia.</p>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default LayersPanel;
