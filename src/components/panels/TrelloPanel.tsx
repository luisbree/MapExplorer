
"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, ClipboardCheck, Send, Search } from 'lucide-react';
import { Label } from '../ui/label';

interface TrelloPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  onCreateCard: (details: { title: string; description: string; listName: string }) => Promise<void>;
  onSearchCard: (searchTerm: string) => Promise<void>;
  isLoading: boolean;
  style?: React.CSSProperties;
}

const TrelloPanel: React.FC<TrelloPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  onCreateCard,
  onSearchCard,
  isLoading,
  style,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listName, setListName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAccordionItem, setActiveAccordionItem] = useState<string>('create-card');

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !listName.trim() || isLoading) return;
    await onCreateCard({ title, description, listName });
    // Optionally clear fields after submission
    setTitle('');
    setDescription('');
    setListName('');
  };
  
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim() || isLoading) return;
    await onSearchCard(searchTerm);
    setSearchTerm('');
  };

  return (
    <DraggablePanel
      title="Integración con Trello"
      icon={ClipboardCheck}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 350, height: 400 }}
    >
      <Accordion type="single" collapsible value={activeAccordionItem} onValueChange={setActiveAccordionItem} className="w-full">
        <AccordionItem value="create-card" className="border-b-0 bg-white/5 rounded-md">
          <AccordionTrigger className="p-3 hover:no-underline hover:bg-white/10 rounded-t-md data-[state=open]:rounded-b-none">
            <h3 className="text-sm font-semibold text-white">Crear Tarjeta</h3>
          </AccordionTrigger>
          <AccordionContent className="p-3 pt-2 space-y-3 border-t border-white/10 bg-transparent rounded-b-md">
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="trello-title" className="text-xs text-white/90">Título</Label>
                <Input
                  id="trello-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título de la tarjeta"
                  disabled={isLoading}
                  className="text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trello-description" className="text-xs text-white/90">Descripción (Opcional)</Label>
                <Textarea
                  id="trello-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles de la tarjeta..."
                  disabled={isLoading}
                  className="text-xs border-white/30 bg-black/20 text-white/90 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trello-list" className="text-xs text-white/90">Nombre de la Lista</Label>
                <Input
                  id="trello-list"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Ej: Tareas, Ideas, Errores"
                  disabled={isLoading}
                  className="text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary"
                />
              </div>
              <Button type="submit" disabled={isLoading || !title.trim() || !listName.trim()} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Crear Tarjeta
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="search-card" className="border-b-0 bg-white/5 rounded-md mt-2">
          <AccordionTrigger className="p-3 hover:no-underline hover:bg-white/10 rounded-t-md data-[state=open]:rounded-b-none">
            <h3 className="text-sm font-semibold text-white">Buscar Tarjeta</h3>
          </AccordionTrigger>
          <AccordionContent className="p-3 pt-2 space-y-3 border-t border-white/10 bg-transparent rounded-b-md">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
               <div className="space-y-1">
                <Label htmlFor="trello-search" className="text-xs text-white/90">Término de Búsqueda</Label>
                <Input
                  id="trello-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Palabra clave o título..."
                  disabled={isLoading}
                  className="text-xs h-8 border-white/30 bg-black/20 text-white/90 focus:ring-primary"
                />
              </div>
              <Button type="submit" disabled={isLoading || !searchTerm.trim()} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar y Abrir Tarjeta
              </Button>
            </form>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </DraggablePanel>
  );
};

export default TrelloPanel;
