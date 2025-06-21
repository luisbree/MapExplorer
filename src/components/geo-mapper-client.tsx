
"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapPin, Database, Wrench, ListTree, ListChecks, Sparkles } from 'lucide-react';
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style';
import { transformExtent } from 'ol/proj';
import type { Extent } from 'ol/extent';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


import MapView, { BASE_LAYER_DEFINITIONS } from '@/components/map-view';
import AttributesPanel from '@/components/panels/AttributesPanel'; 
import LayersPanel from '@/components/panels/LayersPanel';
import ToolsPanel from '@/components/panels/ToolsPanel';
import LegendPanel from '@/components/panels/LegendPanel';
import AIPanel from '@/components/panels/AIPanel';
import WfsLoadingIndicator from '@/components/feedback/WfsLoadingIndicator';

import { useOpenLayersMap } from '@/hooks/map-core/useOpenLayersMap';
import { useLayerManager } from '@/hooks/layer-manager/useLayerManager';
import { useFeatureInspection } from '@/hooks/feature-inspection/useFeatureInspection';
import { useDrawingInteractions } from '@/hooks/drawing-tools/useDrawingInteractions';
import { useOSMData } from '@/hooks/osm-integration/useOSMData';
import { useGeoServerLayers } from '@/hooks/geoserver-connection/useGeoServerLayers';
import { useFloatingPanels } from '@/hooks/panels/useFloatingPanels';
import { useMapCapture } from '@/hooks/map-tools/useMapCapture';
import { useToast } from "@/hooks/use-toast";

import type { OSMCategoryConfig, GeoServerDiscoveredLayer, BaseLayerOptionForSelect, MapLayer } from '@/lib/types';
import type { MapAssistantOutput } from '@/ai/flows/find-layer-flow';


const osmCategoryConfig: OSMCategoryConfig[] = [
  {
    id: 'watercourses', name: 'OSM Cursos de Agua',
    overpassQueryFragment: (bboxStr) => `nwr[waterway~"^(river|stream|canal)$"](${bboxStr});`,
    matcher: (tags) => tags && (tags.waterway === 'river' || tags.waterway === 'stream' || tags.waterway === 'canal'),
    style: new Style({ stroke: new Stroke({ color: '#3a86ff', width: 2 }) })
  },
  {
    id: 'water_bodies', name: 'OSM Cuerpos de Agua',
    overpassQueryFragment: (bboxStr) => `nwr[natural="water"](${bboxStr});\nnwr[landuse="reservoir"](${bboxStr});`,
    matcher: (tags) => tags && (tags.natural === 'water' || tags.landuse === 'reservoir'),
    style: new Style({ fill: new Fill({ color: 'rgba(58,134,255,0.4)' }), stroke: new Stroke({ color: '#3a86ff', width: 1 }) })
  },
  {
    id: 'roads_paths', name: 'OSM Rutas y Caminos',
    overpassQueryFragment: (bboxStr) => `nwr[highway](${bboxStr});`,
    matcher: (tags) => tags && !!tags.highway,
    style: new Style({ stroke: new Stroke({ color: '#adb5bd', width: 3 }) })
  },
  {
    id: 'admin_boundaries', name: 'OSM Límites Admin.',
    overpassQueryFragment: (bboxStr) => `nwr[boundary="administrative"][admin_level](${bboxStr});`,
    matcher: (tags) => tags && tags.boundary === 'administrative' && tags.admin_level,
    style: new Style({ stroke: new Stroke({ color: '#ff006e', width: 2, lineDash: [4, 8] }) })
  },
  {
    id: 'green_areas', name: 'OSM Áreas Verdes',
    overpassQueryFragment: (bboxStr) => `nwr[leisure="park"](${bboxStr});\nnwr[landuse="forest"](${bboxStr});\nnwr[natural="wood"](${bboxStr});`,
    matcher: (tags) => tags && (tags.leisure === 'park' || tags.landuse === 'forest' || tags.natural === 'wood'),
    style: new Style({ fill: new Fill({ color: 'rgba(13,166,75,0.4)' }), stroke: new Stroke({ color: '#0da64b', width: 1 }) })
  },
  {
    id: 'health_centers', name: 'OSM Centros de Salud',
    overpassQueryFragment: (bboxStr) => `nwr[amenity~"^(hospital|clinic|doctors|pharmacy)$"](${bboxStr});`,
    matcher: (tags) => tags && ['hospital', 'clinic', 'doctors', 'pharmacy'].includes(tags.amenity),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#d90429'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
  {
    id: 'educational', name: 'OSM Educacionales',
    overpassQueryFragment: (bboxStr) => `nwr[amenity~"^(school|university|college|kindergarten)$"](${bboxStr});`,
    matcher: (tags) => tags && ['school', 'university', 'college', 'kindergarten'].includes(tags.amenity),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#8338ec'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
   {
    id: 'social_institutions', name: 'OSM Instituciones Sociales',
    overpassQueryFragment: (bboxStr) => `nwr[amenity~"^(community_centre|social_facility|place_of_worship)$"](${bboxStr}); nwr[office="ngo"](${bboxStr}); nwr[leisure="club"](${bboxStr});`,
    matcher: (tags) => tags && (tags.amenity === 'community_centre' || tags.amenity === 'social_facility' || tags.amenity === 'place_of_worship' || tags.office === 'ngo' || tags.leisure === 'club'),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#ff6b6b'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
  {
    id: 'cultural_heritage', name: 'OSM Patrimonio Cultural',
    overpassQueryFragment: (bboxStr) => `nwr[historic](${bboxStr}); nwr[tourism="museum"](${bboxStr}); nwr[tourism="artwork"](${bboxStr}); nwr[amenity="place_of_worship"][historic](${bboxStr}); nwr[amenity="place_of_worship"][heritage](${bboxStr});`,
    matcher: (tags) => tags && (tags.historic || tags.tourism === 'museum' || tags.tourism === 'artwork' || (tags.amenity === 'place_of_worship' && (tags.historic || tags.heritage))),
    style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({color: '#8d6e63'}), stroke: new Stroke({color: 'white', width: 1.5})})})
  },
];
const osmCategoriesForSelection = osmCategoryConfig.map(({ id, name }) => ({ id, name }));
const availableBaseLayersForSelect: BaseLayerOptionForSelect[] = BASE_LAYER_DEFINITIONS.map(def => ({ id: def.id, name: def.name }));

const PANEL_WIDTH = 350;
const PANEL_PADDING = 8;

const panelToggleConfigs = [
  { id: 'layers', IconComponent: Database, name: "Datos" },
  { id: 'tools', IconComponent: Wrench, name: "Herramientas" },
  { id: 'legend', IconComponent: ListTree, name: "Capas" },
  { id: 'attributes', IconComponent: ListChecks, name: "Atributos" },
  { id: 'ai', IconComponent: Sparkles, name: "Asistente IA" },
];


export default function GeoMapperClient() {
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const layersPanelRef = useRef<HTMLDivElement>(null);
  const toolsPanelRef = useRef<HTMLDivElement>(null);
  const legendPanelRef = useRef<HTMLDivElement>(null);
  const attributesPanelRef = useRef<HTMLDivElement>(null);
  const aiPanelRef = useRef<HTMLDivElement>(null);

  const { mapRef, mapElementRef, drawingSourceRef, drawingLayerRef, setMapInstanceAndElement, isMapReady } = useOpenLayersMap();
  const { toast } = useToast();

  const [activeBaseLayerId, setActiveBaseLayerId] = useState<string>(BASE_LAYER_DEFINITIONS[0].id);
  const handleChangeBaseLayer = useCallback((newBaseLayerId: string) => {
    setActiveBaseLayerId(newBaseLayerId);
  }, []);

  const featureInspectionHook = useFeatureInspection({
    mapRef, mapElementRef, isMapReady, drawingSourceRef, drawingLayerRef,
  });

  const [isWfsLoading, setIsWfsLoading] = useState(false);
  const [discoveredGeoServerLayers, setDiscoveredGeoServerLayers] = useState<GeoServerDiscoveredLayer[]>([]);

  const updateDiscoveredLayerState = useCallback((layerName: string, added: boolean, type: 'wms' | 'wfs') => {
    setDiscoveredGeoServerLayers(prev => prev.map(l => {
      if (l.name === layerName) {
        if (type === 'wms') return { ...l, wmsAddedToMap: added };
        if (type === 'wfs') return { ...l, wfsAddedToMap: added };
      }
      return l;
    }));
  }, []);

  const layerManagerHook = useLayerManager({
    mapRef,
    isMapReady,
    drawingLayerRef,
    drawingSourceRef,
    onShowTableRequest: featureInspectionHook.processAndDisplayFeatures,
    updateGeoServerDiscoveredLayerState: updateDiscoveredLayerState
  });
  
  const {
    geoServerUrlInput, setGeoServerUrlInput, isLoadingGeoServerLayers,
    handleFetchGeoServerLayers, handleAddGeoServerLayerToMap, handleAddGeoServerLayerAsWFS
  } = useGeoServerLayers({
      mapRef,
      isMapReady,
      addLayer: layerManagerHook.addLayer,
      onLayerStateUpdate: updateDiscoveredLayerState,
      setIsWfsLoading
  });

  // Effect for initial GeoServer layer loading
  useEffect(() => {
    const loadInitialLayers = async () => {
      const initialUrl = 'https://www.minfra.gba.gob.ar/ambientales/geoserver';
      try {
        const discovered = await handleFetchGeoServerLayers(initialUrl);
        if (discovered && discovered.length > 0) {
          setDiscoveredGeoServerLayers(discovered);
          discovered.forEach(layer => {
            const isVisible = layer.name === 'cuencas_light';
            if (isVisible) {
              handleAddGeoServerLayerToMap(layer.name, layer.title, isVisible, initialUrl, layer.bbox);
            }
          });
          toast({ description: `${discovered.length} capas de GeoServer cargadas en segundo plano.` });
        }
      } catch (error) {
        console.error("Failed to load initial GeoServer layers:", error);
      }
    };
    
    if (isMapReady) {
       loadInitialLayers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapReady]);

  const {
    isFetchingOSM, selectedOSMCategoryIds, setSelectedOSMCategoryIds, fetchOSMData,
    downloadFormat, setDownloadFormat, isDownloading, handleDownloadOSMLayers,
  } = useOSMData({ drawingSourceRef, addLayer: layerManagerHook.addLayer, osmCategoryConfigs: osmCategoryConfig });

  const drawingInteractions = useDrawingInteractions({
    mapRef, isMapReady, drawingSourceRef,
    isInspectModeActive: featureInspectionHook.isInspectModeActive,
    toggleInspectMode: featureInspectionHook.toggleInspectMode,
  });

  const { panels, handlePanelMouseDown, togglePanelCollapse, togglePanelMinimize } = useFloatingPanels({
    layersPanelRef,
    toolsPanelRef,
    legendPanelRef,
    attributesPanelRef,
    aiPanelRef,
    mapAreaRef,
    panelWidth: PANEL_WIDTH,
    panelPadding: PANEL_PADDING,
  });

  const { captureMap, isCapturing: isMapCapturing } = useMapCapture({ mapRef });

  const zoomToBoundingBox = useCallback((bbox: [number, number, number, number]) => {
    if (!mapRef.current) return;
    const extent4326: Extent = [bbox[0], bbox[1], bbox[2], bbox[3]];
    try {
        const extent3857 = transformExtent(extent4326, 'EPSG:4326', 'EPSG:3857');

        if (extent3857 && extent3857.every(isFinite) && (extent3857[2] - extent3857[0] > 0.000001) && (extent3857[3] - extent3857[1] > 0.000001)) {
            mapRef.current.getView().fit(extent3857, {
            padding: [50, 50, 50, 50],
            duration: 1000,
            maxZoom: 17,
            });
            setTimeout(() => {
              toast({ description: "Ubicación encontrada y centrada en el mapa." });
            }, 0);
        } else {
            setTimeout(() => {
              toast({ description: "No se pudo determinar una extensión válida para la ubicación." });
            }, 0);
        }
    } catch (error) {
        console.error("Error transforming extent or fitting view:", error);
        setTimeout(() => {
          toast({ description: "Error al procesar la ubicación seleccionada." });
        }, 0);
    }
  }, [mapRef, toast]);

  const handleAiAction = useCallback((action: MapAssistantOutput) => {
    if (action.layerToAdd) {
      const layerData = discoveredGeoServerLayers.find(l => l.name === action.layerToAdd);
      if (layerData) {
          const initialUrl = 'https://www.minfra.gba.gob.ar/ambientales/geoserver';
          handleAddGeoServerLayerToMap(layerData.name, layerData.title, true, initialUrl, layerData.bbox);
      } else {
          toast({description: `Drax sugirió una capa no encontrada: ${action.layerToAdd}`});
      }
    }

    if (action.layerToRemove) {
      const layerToRemove = layerManagerHook.layers.find(l => l.name === action.layerToRemove);
      if (layerToRemove) {
        layerManagerHook.removeLayer(layerToRemove.id);
      } else {
        toast({description: `Drax intentó eliminar una capa no encontrada: ${action.layerToRemove}`});
      }
    }

    if (action.zoomToLayer) {
      const layerToZoom = layerManagerHook.layers.find(l => l.name === action.zoomToLayer);
       if (layerToZoom) {
        layerManagerHook.zoomToLayerExtent(layerToZoom.id);
      } else {
        toast({description: `Drax intentó hacer zoom a una capa no encontrada: ${action.zoomToLayer}`});
      }
    }

  }, [discoveredGeoServerLayers, handleAddGeoServerLayerToMap, toast, layerManagerHook]);


  useEffect(() => {
    featureInspectionHook.updateLayers(layerManagerHook.layers);
  }, [layerManagerHook.layers, featureInspectionHook]);

   useEffect(() => {
    featureInspectionHook.activeDrawTool = drawingInteractions.activeDrawTool;
    featureInspectionHook.stopDrawingTool = drawingInteractions.stopDrawingTool;
  }, [drawingInteractions.activeDrawTool, drawingInteractions.stopDrawingTool, featureInspectionHook ]);

  useEffect(() => {
    if (featureInspectionHook.selectedFeatureAttributes && featureInspectionHook.selectedFeatureAttributes.length > 0) {
      if (panels.attributes && panels.attributes.isMinimized) {
        togglePanelMinimize('attributes'); 
      }
    } 
  }, [featureInspectionHook.selectedFeatureAttributes, panels.attributes, togglePanelMinimize]);


  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      <header className="bg-gray-800/60 backdrop-blur-md text-white p-2 shadow-md flex items-center">
        <MapPin className="mr-2 h-6 w-6 text-primary" />
        <h1 className="text-xl font-semibold">Departamento de Estudios Ambientales y Sociales</h1>
      </header>
      <div ref={mapAreaRef} className="relative flex-1 overflow-visible">
        <MapView
          setMapInstanceAndElement={setMapInstanceAndElement}
          activeBaseLayerId={activeBaseLayerId}
        />

        <WfsLoadingIndicator isVisible={isWfsLoading} />
        
        <div className="absolute top-2 right-2 z-20 flex flex-row space-x-1">
          <TooltipProvider delayDuration={200}>
            {panelToggleConfigs.map((panelConfig) => {
              const panelState = panels[panelConfig.id as keyof typeof panels];
              if (!panelState) return null;

              const isPanelOpen = !panelState.isMinimized;
              const tooltipText = isPanelOpen
                ? `Minimizar Panel de ${panelConfig.name}`
                : `Restaurar Panel de ${panelConfig.name}`;
              
              return (
                <Tooltip key={panelConfig.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={"outline"}
                      size="icon"
                      className={`h-8 w-8 focus-visible:ring-primary ${
                        isPanelOpen
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary/80'
                          : 'bg-gray-700/80 text-white hover:bg-gray-600/90 border-gray-600/70'
                      }`}
                      onClick={() => togglePanelMinimize(panelConfig.id as any)}
                      aria-label={tooltipText}
                    >
                      <panelConfig.IconComponent className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-700 text-white border-gray-600">
                    <p className="text-xs">{tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {panels.layers && !panels.layers.isMinimized && (
          <LayersPanel
            panelRef={layersPanelRef}
            isCollapsed={panels.layers.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('layers')}
            onClosePanel={() => togglePanelMinimize('layers')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'layers')}
            availableBaseLayers={availableBaseLayersForSelect}
            activeBaseLayerId={activeBaseLayerId}
            onChangeBaseLayer={handleChangeBaseLayer}
            onZoomToBoundingBox={zoomToBoundingBox}
            captureMap={captureMap}
            isCapturingMap={isMapCapturing}
            geoServerUrlInput={geoServerUrlInput}
            onGeoServerUrlChange={setGeoServerUrlInput}
            onFetchGeoServerLayers={async () => {
              const discovered = await handleFetchGeoServerLayers();
              if(discovered && discovered.length > 0) {
                setDiscoveredGeoServerLayers(discovered);
              }
            }}
            isLoadingGeoServerLayers={isLoadingGeoServerLayers}
            geoServerDiscoveredLayers={discoveredGeoServerLayers}
            onAddGeoServerLayerToMap={(layerName, layerTitle) => handleAddGeoServerLayerToMap(layerName, layerTitle, true, geoServerUrlInput)}
            onAddGeoServerLayerAsWFS={(layerName, layerTitle) => handleAddGeoServerLayerAsWFS(layerName, layerTitle, geoServerUrlInput)}
            onFindSentinel2Footprints={layerManagerHook.findSentinel2FootprintsInCurrentView}
            onClearSentinel2Footprints={layerManagerHook.clearSentinel2FootprintsLayer}
            isFindingSentinelFootprints={layerManagerHook.isFindingSentinelFootprints}
            style={{ top: `${panels.layers.position.y}px`, left: `${panels.layers.position.x}px`, zIndex: panels.layers.zIndex }}
          />
        )}

        {panels.tools && !panels.tools.isMinimized && (
          <ToolsPanel
            panelRef={toolsPanelRef}
            isCollapsed={panels.tools.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('tools')}
            onClosePanel={() => togglePanelMinimize('tools')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'tools')}
            activeDrawTool={drawingInteractions.activeDrawTool}
            onToggleDrawingTool={drawingInteractions.toggleDrawingTool}
            onClearDrawnFeatures={drawingInteractions.clearDrawnFeatures}
            onSaveDrawnFeaturesAsKML={drawingInteractions.saveDrawnFeaturesAsKML}
            isFetchingOSM={isFetchingOSM}
            onFetchOSMDataTrigger={fetchOSMData}
            osmCategoriesForSelection={osmCategoriesForSelection}
            selectedOSMCategoryIds={selectedOSMCategoryIds}
            onSelectedOSMCategoriesChange={setSelectedOSMCategoryIds}
            downloadFormat={downloadFormat}
            onDownloadFormatChange={setDownloadFormat}
            isDownloading={isDownloading}
            onDownloadOSMLayers={() => handleDownloadOSMLayers(layerManagerHook.layers)}
            style={{ top: `${panels.tools.position.y}px`, left: `${panels.tools.position.x}px`, zIndex: panels.tools.zIndex }}
          />
        )}

        {panels.legend && !panels.legend.isMinimized && (
          <LegendPanel
            panelRef={legendPanelRef}
            isCollapsed={panels.legend.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('legend')}
            onClosePanel={() => togglePanelMinimize('legend')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'legend')}
            layers={layerManagerHook.layers}
            onToggleLayerVisibility={layerManagerHook.toggleLayerVisibility}
            onRemoveLayer={layerManagerHook.removeLayer}
            onZoomToLayerExtent={layerManagerHook.zoomToLayerExtent}
            onShowLayerTable={layerManagerHook.handleShowLayerTable} 
            onExtractByPolygon={layerManagerHook.handleExtractFeaturesByPolygon}
            isDrawingSourceEmptyOrNotPolygon={layerManagerHook.isDrawingSourceEmptyOrNotPolygon}
            onSetLayerOpacity={layerManagerHook.setLayerOpacity}
            onReorderLayers={layerManagerHook.reorderLayers}
            onAddLayer={layerManagerHook.addLayer as (layer: MapLayer) => void}
            isInspectModeActive={featureInspectionHook.isInspectModeActive}
            onToggleInspectMode={featureInspectionHook.toggleInspectMode}
            style={{ top: `${panels.legend.position.y}px`, left: `${panels.legend.position.x}px`, zIndex: panels.legend.zIndex }}
          />
        )}

        {panels.attributes && !panels.attributes.isMinimized && (
          <AttributesPanel
            panelRef={attributesPanelRef}
            isCollapsed={panels.attributes.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('attributes')}
            onClosePanel={() => {
              featureInspectionHook.clearInspectedAttributes(); 
              togglePanelMinimize('attributes'); 
            }}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'attributes')}
            featuresAttributes={featureInspectionHook.selectedFeatureAttributes}
            layerName={featureInspectionHook.currentInspectedLayerName}
            style={{ top: `${panels.attributes.position.y}px`, left: `${panels.attributes.position.x}px`, zIndex: panels.attributes.zIndex }}
          />
        )}

        {panels.ai && !panels.ai.isMinimized && (
          <AIPanel
            panelRef={aiPanelRef}
            isCollapsed={panels.ai.isCollapsed}
            onToggleCollapse={() => togglePanelCollapse('ai')}
            onClosePanel={() => togglePanelMinimize('ai')}
            onMouseDownHeader={(e) => handlePanelMouseDown(e, 'ai')}
            availableLayers={discoveredGeoServerLayers.map(l => ({ name: l.name, title: l.title }))}
            activeLayers={layerManagerHook.layers.map(l => ({ name: l.name, title: l.name }))}
            onLayerAction={handleAiAction}
            style={{ top: `${panels.ai.position.y}px`, left: `${panels.ai.position.x}px`, zIndex: panels.ai.zIndex }}
          />
        )}
      </div>
    </div>
  );
}
