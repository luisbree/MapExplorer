
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MousePointerClick } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InspectToolToggleProps {
  isInspectModeActive: boolean;
  onToggleInspectMode: () => void;
}

const InspectToolToggle: React.FC<InspectToolToggleProps> = ({
  isInspectModeActive,
  onToggleInspectMode,
}) => {
  const iconButtonBaseClass = "h-8 w-8 p-0 flex items-center justify-center focus-visible:ring-primary";
  const activeClass = "bg-primary hover:bg-primary/90 text-primary-foreground";
  const inactiveClass = "border border-white/30 text-white/90 bg-black/20 hover:bg-black/40 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary";
  
  const tooltipText = isInspectModeActive ? 'Desactivar modo inspector' : 'Activar modo inspector';

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={onToggleInspectMode} 
            className={`${iconButtonBaseClass} ${
              isInspectModeActive ? activeClass : inactiveClass
            }`}
            aria-label={tooltipText}
          >
            <MousePointerClick className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default InspectToolToggle;
