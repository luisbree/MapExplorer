
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

type PanelId = 'layers' | 'tools' | 'legend' | 'attributes' | 'ai';

interface PanelState {
  isMinimized: boolean;
  isCollapsed: boolean;
  position: { x: number; y: number };
  zIndex: number;
}

interface UseFloatingPanelsProps {
  layersPanelRef: React.RefObject<HTMLDivElement>;
  toolsPanelRef: React.RefObject<HTMLDivElement>;
  legendPanelRef: React.RefObject<HTMLDivElement>;
  attributesPanelRef: React.RefObject<HTMLDivElement>;
  aiPanelRef: React.RefObject<HTMLDivElement>;
  mapAreaRef: React.RefObject<HTMLDivElement>;
  panelWidth: number;
  panelPadding: number;
}

const initialZIndex = 30;

export const useFloatingPanels = ({
  layersPanelRef,
  toolsPanelRef,
  legendPanelRef,
  attributesPanelRef,
  aiPanelRef,
  mapAreaRef,
  panelWidth,
  panelPadding
}: UseFloatingPanelsProps) => {

  const panelRefs = useMemo(() => ({
    layers: layersPanelRef,
    tools: toolsPanelRef,
    legend: legendPanelRef,
    attributes: attributesPanelRef,
    ai: aiPanelRef,
  }), [attributesPanelRef, aiPanelRef, layersPanelRef, legendPanelRef, toolsPanelRef]);
  
  const [panels, setPanels] = useState<Record<PanelId, PanelState>>({
    layers: { isMinimized: true, isCollapsed: false, position: { x: panelPadding, y: panelPadding }, zIndex: initialZIndex },
    tools: { isMinimized: true, isCollapsed: false, position: { x: panelWidth + (panelPadding*2), y: panelPadding }, zIndex: initialZIndex },
    legend: { isMinimized: false, isCollapsed: false, position: { x: panelPadding, y: panelPadding }, zIndex: initialZIndex + 1 }, // Initially open
    attributes: { isMinimized: true, isCollapsed: false, position: { x: panelPadding, y: 300 }, zIndex: initialZIndex },
    ai: { isMinimized: false, isCollapsed: false, position: { x: -9999, y: panelPadding }, zIndex: initialZIndex + 2 },
  });

  const activeDragRef = useRef<{ panelId: PanelId | null, offsetX: number, offsetY: number }>({ panelId: null, offsetX: 0, offsetY: 0 });
  const zIndexCounterRef = useRef(initialZIndex + 2); // Start above AI panel
  const positionInitialized = useRef(false);
  
  useEffect(() => {
    // This effect runs once to set the initial position of the AI panel to the right side.
    if (mapAreaRef.current && !positionInitialized.current) {
        const mapWidth = mapAreaRef.current.clientWidth;
        const rightX = mapWidth - panelWidth - panelPadding;

        // Only adjust the AI panel's position as requested.
        setPanels(prev => ({
            ...prev,
            ai: {
                ...prev.ai,
                position: { x: rightX, y: prev.ai.position.y }
            }
        }));
        positionInitialized.current = true;
    }
  }, [mapAreaRef, panelWidth, panelPadding]);


  const bringToFront = useCallback((panelId: PanelId) => {
    zIndexCounterRef.current += 1;
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], zIndex: zIndexCounterRef.current }
    }));
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const { panelId, offsetX, offsetY } = activeDragRef.current;
    if (!panelId) return;

    const mapArea = mapAreaRef.current;
    const panelRef = panelRefs[panelId].current;
    if (!mapArea || !panelRef) return;

    const mapRect = mapArea.getBoundingClientRect();
    let newX = event.clientX - mapRect.left - offsetX;
    let newY = event.clientY - mapRect.top - offsetY;

    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], position: { x: newX, y: newY } }
    }));
  }, [mapAreaRef, panelRefs]);

  const handleMouseUp = useCallback(() => {
    activeDragRef.current = { panelId: null, offsetX: 0, offsetY: 0 };
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);
  
  const handlePanelMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>, panelId: PanelId) => {
    const panelRef = panelRefs[panelId].current;
    if (!panelRef) return;
    
    bringToFront(panelId);

    const rect = panelRef.getBoundingClientRect();
    activeDragRef.current = {
      panelId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    event.preventDefault();
  }, [panelRefs, bringToFront, handleMouseMove, handleMouseUp]);

  const togglePanelCollapse = useCallback((panelId: PanelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: { ...prev[panelId], isCollapsed: !prev[panelId].isCollapsed }
    }));
  }, []);
  
  const togglePanelMinimize = useCallback((panelId: PanelId) => {
    setPanels(prev => {
        const panelState = prev[panelId];
        const newIsMinimized = !panelState.isMinimized;
        // If restoring, bring to front
        if (!newIsMinimized) {
            zIndexCounterRef.current += 1;
            return {
                ...prev,
                [panelId]: { ...panelState, isMinimized: newIsMinimized, zIndex: zIndexCounterRef.current }
            }
        }
        return {
            ...prev,
            [panelId]: { ...panelState, isMinimized: newIsMinimized }
        }
    });
  }, []);

  useEffect(() => {
    const mm = (e: MouseEvent) => handleMouseMove(e);
    const mu = (e: MouseEvent) => handleMouseUp();
    
    // Add event listeners with proper types
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
    
    return () => {
      // Clean up event listeners
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  return {
    panels,
    handlePanelMouseDown,
    togglePanelCollapse,
    togglePanelMinimize,
  };
};
