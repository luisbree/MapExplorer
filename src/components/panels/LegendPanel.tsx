"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import LayerList from '@/components/layer-manager/LayerList';
import FileUploadControl from '@/components/layer-manager/FileUploadControl';
import FeatureInteractionToolbar from '@/components/feature-inspection/FeatureInteractionToolbar';
import { Separator } from '@/components/ui/separator';
import type { MapLayer } from '@/lib/types';
import { ListTree } from 'lucide-react'; 

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
  onExtractBySelection: (layerId: string) => void;
  isDrawingSourceEmptyOrNotPolygon: boolean;
  isSelectionEmpty: boolean;
  onSetLayerOpacity: (layerId: string, opacity: number) => void; 
  onReorderLayers: (startIndex: number, endIndex: number) => void;


  onAddLayer: (layer: MapLayer) => void;

  isInteractionActive: boolean;
  onToggleInteraction: () => void;
  selectionMode: 'click' | 'box';
  onSetSelectionMode: (mode: 'click' | 'box') => void;
  onClearSelection: () => void;

  style?: React.CSSProperties;
}


const LegendPanel: React.FC<LegendPanelProps> = ({
  panelRef, isCollapsed, onToggleCollapse, onClosePanel, onMouseDownHeader,
  layers, onToggleLayerVisibility, onRemoveLayer, onZoomToLayerExtent, onShowLayerTable,
  onExtractByPolygon, onExtractBySelection, isDrawingSourceEmptyOrNotPolygon, isSelectionEmpty, onSetLayerOpacity, onReorderLayers,
  onAddLayer, 
  isInteractionActive, onToggleInteraction, selectionMode, onSetSelectionMode, onClearSelection,
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
          <FeatureInteractionToolbar
            isInteractionActive={isInteractionActive}
            onToggleInteraction={onToggleInteraction}
            selectionMode={selectionMode}
            onSetSelectionMode={onSetSelectionMode}
            onClearSelection={onClearSelection}
          />
        </div>
        <Separator className="bg-white/10" /> 
        <LayerList
          layers={layers}
          onToggleVisibility={onToggleLayerVisibility}
          onZoomToExtent={onZoomToLayerExtent}
          onShowLayerTable={onShowLayerTable}
          onRemoveLayer={onRemoveLayer}
          onExtractByPolygon={onExtractByPolygon}
          onExtractBySelection={onExtractBySelection}
          isDrawingSourceEmptyOrNotPolygon={isDrawingSourceEmptyOrNotPolygon}
          isSelectionEmpty={isSelectionEmpty}
          onSetLayerOpacity={onSetLayerOpacity}
          onReorderLayers={onReorderLayers}
        />
      </div>
    </DraggablePanel>
  );
};

export default LegendPanel;
