"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Send } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import * as ai from '@/ai/flows/find-layer-flow';

interface AIPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  availableLayers: { name: string; title: string }[];
  onLayerFound: (layerName: string) => void;
  style?: React.CSSProperties;
}

const AIPanel: React.FC<AIPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  availableLayers,
  onLayerFound,
  style,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await ai.findLayer({
        query: query,
        availableLayers: availableLayers,
      });

      if (result?.name) {
        toast({ description: `Capa encontrada: ${result.name}. Añadiendo al mapa...` });
        onLayerFound(result.name);
        setQuery(''); // Clear input on success
      } else {
        toast({ description: 'No se pudo encontrar una capa que coincida con la búsqueda.' });
      }
    } catch (error) {
      console.error("AI layer search error:", error);
      toast({ description: 'Ocurrió un error al buscar la capa con la IA.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DraggablePanel
      title="Asistente IA"
      icon={Sparkles}
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
      <div className="flex flex-col h-full space-y-3">
        <p className="text-xs text-gray-300">
          Pide al asistente que cargue una capa del GeoServer inicial. Por ejemplo: "Cargar capa de rutas"
        </p>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="¿Qué capa buscamos?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="flex-grow text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary placeholder:text-gray-400/70"
          />
          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 flex-shrink-0 bg-primary/80 hover:bg-primary text-primary-foreground p-0"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <div className="flex-grow">
            {/* Future content like chat history can go here */}
        </div>
      </div>
    </DraggablePanel>
  );
};

export default AIPanel;
