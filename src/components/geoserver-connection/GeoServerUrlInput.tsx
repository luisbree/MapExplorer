
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Layers } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GeoServerUrlInputProps {
  geoServerUrlInput: string;
  onGeoServerUrlChange: (url: string) => void;
  onFetchGeoServerLayers: () => void;
  isLoadingGeoServerLayers: boolean;
  uniqueIdPrefix?: string;
}

const GeoServerUrlInput: React.FC<GeoServerUrlInputProps> = ({
  geoServerUrlInput,
  onGeoServerUrlChange,
  onFetchGeoServerLayers,
  isLoadingGeoServerLayers,
  uniqueIdPrefix = "geoserverurl"
}) => {
  return (
    <div className="space-y-1">
      <Label htmlFor={`${uniqueIdPrefix}-input`} className="text-xs font-medium text-white/90 block">URL de GeoServer (WMS)</Label>
      <div className="flex items-center gap-2">
        <Input 
          id={`${uniqueIdPrefix}-input`}
          type="text"
          placeholder="Ej: http://localhost:8080/geoserver"
          value={geoServerUrlInput}
          onChange={(e) => onGeoServerUrlChange(e.target.value)}
          className="flex-grow text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary placeholder:text-gray-400/70"
        />
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={onFetchGeoServerLayers} 
                size="icon"
                className="h-8 w-8 flex-shrink-0 bg-primary/80 hover:bg-primary text-primary-foreground p-0"
                disabled={isLoadingGeoServerLayers || !geoServerUrlInput.trim()}
              >
                {isLoadingGeoServerLayers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-gray-700 text-white border-gray-600">
              <p className="text-xs">{isLoadingGeoServerLayers ? 'Cargando...' : 'Cargar Capas de GeoServer'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default GeoServerUrlInput;
