
"use client";

import React from 'react';
import DraggablePanel from './DraggablePanel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy, Map, Layers, Wrench, Sparkles, ClipboardCheck, Library, MousePointerClick, Square, CloudDownload, ImageUp, Plus, Trash2 } from 'lucide-react';

interface HelpPanelProps {
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

const HelpSectionTrigger: React.FC<{ icon: React.ElementType; title: string }> = ({ icon: Icon, title }) => (
    <div className="flex items-center w-full">
        <Icon className="h-5 w-5 mr-3 text-primary/90" />
        <span className="text-sm font-semibold">{title}</span>
    </div>
);

const HelpPanel: React.FC<HelpPanelProps> = ({
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  style,
}) => {
  return (
    <DraggablePanel
      title="Guía de Usuario"
      icon={LifeBuoy}
      panelRef={panelRef}
      initialPosition={{ x: 0, y: 0 }}
      onMouseDownHeader={onMouseDownHeader}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onClose={onClosePanel}
      showCloseButton={true}
      style={style}
      zIndex={style?.zIndex as number | undefined}
      initialSize={{ width: 400, height: 600 }}
      minSize={{ width: 350, height: 300 }}
    >
      <div className="text-sm leading-relaxed text-gray-200">
        <Accordion type="multiple" defaultValue={['navigation']} className="w-full">
          <AccordionItem value="navigation">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Map} title="Navegación y Datos Base" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>El <strong>Panel de Datos</strong> le permite controlar la vista del mapa:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><strong>Buscador de Ubicaciones:</strong> Escriba el nombre de una ciudad o lugar para centrar el mapa allí.</li>
                <li><strong>Selector de Capa Base:</strong> Cambie el mapa de fondo entre vistas como OpenStreetMap, Satelital y más.</li>
                <li><ImageUp className="inline-block h-4 w-4 mr-1" /><strong>Buscador de Escenas Satelitales:</strong> Busque huellas (footprints) de imágenes Sentinel-2 y Landsat en la vista actual del mapa. Los resultados se añaden como capas vectoriales con atributos.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="layers">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Layers} title="Gestión de Capas" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>El <strong>Panel de Capas</strong> es el centro de control para todas sus capas de datos:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><Plus className="inline-block h-4 w-4 mr-1" /><strong>Importar Capa:</strong> Cargue archivos locales como KML, GeoJSON o Shapefiles (en formato .zip).</li>
                <li><Trash2 className="inline-block h-4 w-4 mr-1" /><strong>Eliminar Selección:</strong> Borre una o varias capas seleccionadas de la lista.</li>
                <li><MousePointerClick className="inline-block h-4 w-4 mr-1" /><strong>Inspección/Selección:</strong> Active el modo interactivo para hacer clic en entidades y ver sus atributos o seleccionarlas para otras acciones.</li>
                <li><strong>Lista de Capas:</strong> Arrastre para reordenar, use el ojo para alternar la visibilidad y acceda al menú contextual (rueda dentada) para más opciones como zoom, ver tabla de atributos, cambiar opacidad o extraer datos.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tools">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Wrench} title="Herramientas" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>El <strong>Panel de Herramientas</strong> ofrece capacidades de dibujo y análisis:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><Square className="inline-block h-4 w-4 mr-1" /><strong>Herramientas de Dibujo:</strong> Dibuje polígonos, líneas o puntos en el mapa. Puede guardar sus dibujos como un archivo KML.</li>
                <li><CloudDownload className="inline-block h-4 w-4 mr-1" /><strong>Datos de OpenStreetMap:</strong> Dibuje un polígono y luego use esta herramienta para descargar datos de OSM (como ríos, calles, etc.) dentro de esa área.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ai">
            <AccordionTrigger>
              <HelpSectionTrigger icon={Sparkles} title="Asistente Drax (IA)" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Converse con <strong>Drax</strong> para controlar el mapa con lenguaje natural. Pruebe comandos como:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li>"Carga la capa de cuencas como WFS"</li>
                <li>"Busca imágenes Sentinel en Buenos Aires"</li>
                <li>"Pinta el borde de las rutas de color rojo y más grueso"</li>
                <li>"Elimina todas las capas de hidrografía"</li>
                <li>"Crea una tarjeta en Trello para revisar este análisis"</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          
           <AccordionItem value="integrations">
            <AccordionTrigger>
              <HelpSectionTrigger icon={ClipboardCheck} title="Integraciones" />
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pl-4">
              <p>Conecte la aplicación con otros servicios:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-gray-300">
                <li><Library className="inline-block h-4 w-4 mr-1" /><strong>Biblioteca WFS:</strong> Conéctese a servidores WFS predefinidos o personalizados para cargar capas vectoriales directamente desde servicios externos.</li>
                <li><ClipboardCheck className="inline-block h-4 w-4 mr-1" /><strong>Trello:</strong> Configure sus credenciales en el archivo `.env.local` para crear y buscar tarjetas de Trello directamente desde la aplicación o a través de Drax.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </DraggablePanel>
  );
};

export default HelpPanel;

    