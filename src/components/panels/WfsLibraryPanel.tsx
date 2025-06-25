"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Library, Layers, Plus } from 'lucide-react';
import type { WfsServer, WfsDiscoveredLayer } from '@/hooks/wfs-library/useWfsLibrary';

interface WfsLibraryPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
  predefinedServers: WfsServer[];
  isLoading: boolean;
  discoveredLayers: WfsDiscoveredLayer[];
  onFetchLayers: (url: string) => void;
  onAddLayer: (layerName: string, layerTitle: string) => void;
}

const WfsLibraryPanel: React.FC<WfsLibraryPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  style,
  predefinedServers,
  isLoading,
  discoveredLayers,
  onFetchLayers,
  onAddLayer,
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [selectedServerUrl, setSelectedServerUrl] = useState('');

  const handleFetch = () => {
    const urlToFetch = customUrl.trim() || selectedServerUrl;
    if (urlToFetch) {
      onFetchLayers(urlToFetch);
    }
  };
  
  const handleSelectChange = (value: string) => {
    setSelectedServerUrl(value);
    setCustomUrl(''); // Clear custom URL when a predefined server is selected
  };

  return (
    <DraggablePanel
      title="Biblioteca WFS"
      icon={Library}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 350, height: 500 }}
    >
      <div className="space-y-3 flex flex-col h-full">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-white/90">Servidores Predefinidos</Label>
          <Select onValueChange={handleSelectChange} value={selectedServerUrl}>
            <SelectTrigger className="w-full text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary">
              <SelectValue placeholder="Seleccionar un servidor..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 text-white border-gray-600">
              {predefinedServers.map((server) => (
                <SelectItem key={server.name} value={server.url} className="text-xs">
                  {server.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="custom-wfs-url" className="text-xs font-medium text-white/90">URL de Servidor Personalizado</Label>
          <Input
            id="custom-wfs-url"
            placeholder="https://servidor.com/geoserver"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value);
              setSelectedServerUrl(''); // Clear selection when typing
            }}
            className="text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary"
          />
        </div>

        <Button onClick={handleFetch} disabled={isLoading || (!customUrl.trim() && !selectedServerUrl)} className="w-full h-9">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
          Cargar Capas del Servidor
        </Button>

        <Separator className="bg-white/15" />

        <div className="flex-grow flex flex-col min-h-0">
          <Label className="text-xs font-medium text-white/90 mb-1">Capas Disponibles</Label>
          <ScrollArea className="flex-grow border border-white/10 p-2 rounded-md bg-black/10">
            {discoveredLayers.length > 0 ? (
              <ul className="space-y-1.5 w-full">
                {discoveredLayers.map((layer) => (
                  <li key={layer.name} className="flex items-center justify-between p-1.5 rounded-md border border-white/15 bg-black/10 hover:bg-white/15 transition-colors">
                    <span className="text-xs font-medium text-white flex-1 truncate" title={layer.title}>
                      {layer.title}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2 bg-teal-600/30 hover:bg-teal-500/50 border-teal-500/50 text-white disabled:opacity-50"
                      onClick={() => onAddLayer(layer.name, layer.title)}
                      disabled={isLoading || layer.added}
                      title={layer.added ? "Capa ya añadida" : `Añadir "${layer.title}" al mapa`}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Añadir
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400/80 text-center py-2">Seleccione un servidor y cargue sus capas.</p>
            )}
          </ScrollArea>
        </div>
      </div>
    </DraggablePanel>
  );
};

export default WfsLibraryPanel;
