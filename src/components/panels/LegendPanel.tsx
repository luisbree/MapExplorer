
"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import LayerList from '@/components/layer-manager/LayerList';
import FileUploadControl from '@/components/layer-manager/FileUploadControl';
import InspectToolToggle from '@/components/feature-inspection/InspectToolToggle';
import { Separator } from '@/components/ui/separator';
import type { MapLayer } from '@/lib/types';
import { ListTree, Library } from 'lucide-react'; 

interface LegendPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;

  layers: MapLayer[];
  onToggleLayerVisibility: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onZoomToLayerExtent: (layerId: string) => void;
  onShowLayerTable: (layerId: string) => void;
  onExtractByPolygon: (layerId: string) => void;
  isDrawingSourceEmptyOrNotPolygon: boolean;
  onSetLayerOpacity: (layerId: string, opacity: number) => void; 

  onAddLayer: (layer: MapLayer) => void;
  isInspectModeActive: boolean;
  onToggleInspectMode: () => void;
  style?: React.CSSProperties;
}


const LegendPanel: React.FC<LegendPanelProps> = ({
  panelRef, isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  layers, onToggleLayerVisibility, onRemoveLayer, onZoomToLayerExtent, onShowLayerTable,
  onExtractByPolygon, isDrawingSourceEmptyOrNotPolygon, onSetLayerOpacity, 
  onAddLayer, isInspectModeActive, onToggleInspectMode,
  style,
}) => {

  return (
    <DraggablePanel
      title="Capas"
      icon={ListTree} 
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
      <div className="space-y-2"> 
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-md"> 
          <FileUploadControl onAddLayer={onAddLayer} uniqueIdPrefix="legendpanel-upload" />
          <InspectToolToggle
            isInspectModeActive={isInspectModeActive}
            onToggleInspectMode={onToggleInspectMode}
          />
        </div>
        <Separator className="bg-white/10" /> 
        <LayerList
          layers={layers}
          onToggleVisibility={onToggleLayerVisibility}
          onZoomToExtent={onZoomToLayerExtent}
          onShowTable={onShowLayerTable}
          onRemoveLayer={onRemoveLayer}
          onExtractByPolygon={onExtractByPolygon}
          isDrawingSourceEmptyOrNotPolygon={isDrawingSourceEmptyOrNotPolygon}
          onSetLayerOpacity={onSetLayerOpacity} 
        />
        <Separator className="bg-white/15 mt-3" />
        <div>
          <h3 className="text-xs font-semibold text-white/90 mb-1.5 mt-2 flex items-center">
            <Library className="h-3.5 w-3.5 mr-1.5 text-primary/80" /> 
            DEAS
          </h3>
          <p className="text-xs text-gray-400/70 mt-1">
            Herramientas y datos específicos de DEAS se gestionarán aquí.
          </p>
          {/* Aquí puedes añadir botones, selectores u otros controles para la sección DEAS */}
        </div>
      </div>
    </DraggablePanel>
  );
};

export default LegendPanel;
