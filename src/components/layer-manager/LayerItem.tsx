
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel, 
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider"; 
import { Eye, EyeOff, Settings2, ZoomIn, Table2, Trash2, Scissors, Percent } from 'lucide-react';
import type { MapLayer } from '@/lib/types';
import VectorLayer from 'ol/layer/Vector'; 

interface LayerItemProps {
  layer: MapLayer;
  onToggleVisibility: (layerId: string) => void;
  onZoomToExtent: (layerId: string) => void;
  onShowTable: (layerId: string) => void;
  onRemove: (layerId: string) => void;
  onExtractByPolygon: (layerId: string) => void;
  isDrawingSourceEmptyOrNotPolygon: boolean;
  onSetLayerOpacity: (layerId: string, opacity: number) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  onToggleVisibility,
  onZoomToExtent,
  onShowTable,
  onRemove,
  onExtractByPolygon,
  isDrawingSourceEmptyOrNotPolygon,
  onSetLayerOpacity,
}) => {
  const isVectorLayer = layer.olLayer instanceof VectorLayer;
  const currentOpacityPercentage = Math.round(layer.opacity * 100);

  return (
    <li className="flex items-center px-1.5 py-1 hover:bg-gray-700/30 transition-colors overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onToggleVisibility(layer.id)}
        className="h-6 w-6 text-white hover:bg-gray-600/80 p-0 mr-2 flex-shrink-0"
        aria-label={`Alternar visibilidad para ${layer.name}`}
        title={layer.visible ? "Ocultar capa" : "Mostrar capa"}
      >
        {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </Button>
      <span className="flex-1 cursor-default text-xs font-medium text-white truncate min-w-0" title={layer.name}>
        {layer.name}
      </span>
      <div className="flex items-center space-x-0.5 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-white hover:bg-gray-600/80 p-0"
              aria-label={`Acciones para ${layer.name}`}
              title="Más acciones"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="bg-gray-700 text-white border-gray-600 w-56">
            <DropdownMenuItem
              className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
              onSelect={() => onZoomToExtent(layer.id)}
            >
              <ZoomIn className="mr-2 h-3.5 w-3.5" />
              Ir a la extensión
            </DropdownMenuItem>

            {isVectorLayer && (
              <DropdownMenuItem
                className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer"
                onSelect={() => onShowTable(layer.id)}
              >
                <Table2 className="mr-2 h-3.5 w-3.5" />
                Ver tabla de atributos
              </DropdownMenuItem>
            )}

            {isVectorLayer && (
              <DropdownMenuItem
                className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onSelect={() => onExtractByPolygon(layer.id)}
                disabled={isDrawingSourceEmptyOrNotPolygon}
              >
                <Scissors className="mr-2 h-3.5 w-3.5" />
                <span title={isDrawingSourceEmptyOrNotPolygon ? "Dibuje un polígono primero" : `Extraer de ${layer.name} por polígono`}>
                  Extraer por polígono
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-gray-500/50" />
            <DropdownMenuLabel className="text-xs text-gray-300 px-2 py-1 flex items-center">
                <Percent className="mr-2 h-3.5 w-3.5" /> Opacidad: {currentOpacityPercentage}%
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent hover:bg-transparent cursor-default p-2">
                <Slider
                    defaultValue={[currentOpacityPercentage]}
                    max={100}
                    step={1}
                    onValueChange={(value) => onSetLayerOpacity(layer.id, value[0] / 100)}
                    className="w-full"
                    aria-label={`Opacidad para ${layer.name}`}
                />
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-500/50" />
            <DropdownMenuItem
              className="text-xs hover:bg-red-500/30 focus:bg-red-500/40 text-red-300 focus:text-red-200 cursor-pointer"
              onSelect={() => onRemove(layer.id)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Eliminar capa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
};

export default LayerItem;
