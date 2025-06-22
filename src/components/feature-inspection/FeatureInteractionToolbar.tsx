
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MousePointerClick, BoxSelect, Eraser, Inspect } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from '@/components/ui/separator';

interface FeatureInteractionToolbarProps {
  isInteractionActive: boolean;
  onToggleInteraction: () => void;
  selectionMode: 'click' | 'box';
  onSetSelectionMode: (mode: 'click' | 'box') => void;
  onClearSelection: () => void;
}

const FeatureInteractionToolbar: React.FC<FeatureInteractionToolbarProps> = ({
  isInteractionActive,
  onToggleInteraction,
  selectionMode,
  onSetSelectionMode,
  onClearSelection,
}) => {
  const iconButtonBaseClass = "h-8 w-8 p-0 flex items-center justify-center focus-visible:ring-primary";
  
  const masterActiveClass = "bg-primary hover:bg-primary/90 text-primary-foreground";
  const masterInactiveClass = "border border-white/30 text-white/90 bg-black/20 hover:bg-black/40";
  
  const toolActiveClass = "bg-accent hover:bg-accent/90 text-accent-foreground";
  const toolInactiveClass = "border border-white/30 text-white/90 bg-black/20 hover:bg-black/40";
  
  const masterTooltipText = isInteractionActive ? 'Desactivar selección' : 'Activar selección de entidades';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              onClick={onToggleInteraction} 
              className={`${iconButtonBaseClass} ${
                isInteractionActive ? masterActiveClass : masterInactiveClass
              }`}
              aria-label={masterTooltipText}
            >
              <Inspect className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
            <p className="text-xs">{masterTooltipText}</p>
          </TooltipContent>
        </Tooltip>

        {isInteractionActive && (
          <>
            <Separator orientation="vertical" className="h-6 bg-white/20 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => onSetSelectionMode('click')}
                  className={`${iconButtonBaseClass} ${
                    selectionMode === 'click' ? toolActiveClass : toolInactiveClass
                  }`}
                  aria-label="Seleccionar con clic"
                >
                  <MousePointerClick className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
                <p className="text-xs">Seleccionar con clic</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={() => onSetSelectionMode('box')}
                  className={`${iconButtonBaseClass} ${
                    selectionMode === 'box' ? toolActiveClass : toolInactiveClass
                  }`}
                  aria-label="Seleccionar con rectángulo"
                >
                  <BoxSelect className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
                <p className="text-xs">Seleccionar con rectángulo</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onClearSelection}
                  className={`${iconButtonBaseClass} border border-white/30 text-white/90 bg-black/20 hover:bg-red-500/20 hover:text-red-300`}
                  aria-label="Limpiar selección"
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
                <p className="text-xs">Limpiar selección</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default FeatureInteractionToolbar;
