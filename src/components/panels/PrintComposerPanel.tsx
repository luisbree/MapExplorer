
"use client";

import React, { useState } from 'react';
import DraggablePanel from './DraggablePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';

interface PrintComposerPanelProps {
  mapImage: string;
  panelRef: React.RefObject<HTMLDivElement>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClosePanel: () => void;
  onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}

// Re-creating these graphical components here to keep the panel self-contained
const DeaLogo = () => (
    <svg width="60" height="60" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="none" stroke="#000" strokeWidth="4"/>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#000" strokeWidth="2"/>
      <circle cx="50" cy="50" r="32" fill="none" stroke="#000" strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="24" fill="none" stroke="#000" strokeWidth="1"/>
      <path d="M50 15 A 35 35 0 0 1 50 85 A 35 35 0 0 1 50 15" fill="none" stroke="#000" strokeWidth="2"/>
      <text x="50" y="55" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="bold" textAnchor="middle" fill="#000">DEA</text>
    </svg>
  );

const NorthArrow = () => (
    <svg width="40" height="60" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
        <polygon points="20,0 30,35 20,30 10,35" fill="#333"/>
        <text x="16" y="12" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" fill="#333">N</text>
    </svg>
);

const ArgentinaMap = () => (
    <svg width="60" height="120" viewBox="0 0 150 290" xmlns="http://www.w3.org/2000/svg" stroke="#555" strokeWidth="2" fill="#E0E0E0">
        <path d="M83.1,1.5 C79,1.5 75.3,3.5 72.8,4.7 C62,10 50,23 45,30 C38,40 35,50 35,65 C35,80 43,90 43,105 C43,115 37,128 35,135 C30,150 28,160 28,175 C28,190 33,200 33,215 C33,230 25,240 25,255 C25,270 30,280 40,285 C50,290 60,288 70,285 C80,282 90,275 100,265 C110,255 115,245 120,230 C125,215 128,200 128,185 C128,170 125,155 120,140 C115,125 110,110 105,95 C100,80 100,65 102,50 C104,35 105,20 95,10 C90,5 87.1,1.5 83.1,1.5Z"/>
    </svg>
);

const BuenosAiresMap = () => (
    <svg width="100" height="100" viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
        <path d="M10,80 L5,70 L15,50 L20,30 L35,15 L55,5 L75,10 L90,25 L95,45 L90,65 L70,80 L40,85 Z" fill="#009688" stroke="#333" strokeWidth="1"/>
        <rect x="75" y="22" width="20" height="15" fill="none" stroke="red" strokeWidth="1.5"/>
    </svg>
);

const ScaleBar = () => (
  <div className="flex flex-col items-center">
    <div className="flex items-end h-4">
      <div className="h-1 border-b border-black"></div>
      <div className="h-2 border-l border-r border-black w-10"></div>
      <div className="h-2 border-r border-black w-10 bg-black"></div>
      <div className="h-2 border-r border-black w-10"></div>
      <div className="h-2 border-r border-black w-10 bg-black"></div>
    </div>
    <div className="flex justify-between w-40 text-xs mt-1">
      <span>0</span>
      <span>50</span>
      <span>100</span>
      <span>150</span>
      <span>200</span>
    </div>
    <div className="text-xs">kilómetros</div>
  </div>
);


const PrintComposerPanel: React.FC<PrintComposerPanelProps> = ({
  mapImage,
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  style,
}) => {
  const [title, setTitle] = useState("TÍTULO DEL MAPA ENCODE SANS BOLD 16PT MAYÚSCULA");
  const [subtitle, setSubtitle] = useState("Subtítulo del mapa - ENCODE SANS Medium 14pt Mayúscula - minúscula");

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <DraggablePanel
        title="Compositor de Impresión"
        icon={Printer}
        panelRef={panelRef}
        initialPosition={{ x: 0, y: 0 }}
        onMouseDownHeader={onMouseDownHeader}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onClose={onClosePanel}
        showCloseButton={true}
        style={style}
        zIndex={style?.zIndex as number | undefined}
        initialSize={{ width: 400, height: 'auto' }}
        minSize={{ width: 350, height: 200 }}
      >
        <div className="space-y-4">
            <div>
                <Label htmlFor="map-title-input" className="text-xs text-white">Título</Label>
                <Input id="map-title-input" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm bg-black/20" />
            </div>
            <div>
                <Label htmlFor="map-subtitle-input" className="text-xs text-white">Subtítulo</Label>
                <Input id="map-subtitle-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-8 text-sm bg-black/20" />
            </div>
            <Button onClick={handlePrint} className="w-full h-9 bg-primary hover:bg-primary/90">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / Guardar como PDF
            </Button>
        </div>
      </DraggablePanel>

      {/* Printable Layout (hidden from view, only for printing) */}
      <div id="print-layout-container" className="fixed top-0 left-0 w-screen h-screen z-[-1] invisible print:visible print:z-[9999] bg-gray-400 p-4 overflow-auto">
        <div id="print-layout" className="bg-white shadow-lg w-[29.7cm] h-[21cm] p-4 flex flex-col text-black font-body">
            {/* Main Content Area */}
            <div className="flex-grow flex border border-black">
                {/* Map Area */}
                <div className="flex-grow h-full border-r border-black relative">
                <img src={mapImage} alt="Mapa Capturado" className="w-full h-full object-cover" />
                </div>
                {/* Right Gutter */}
                <div className="w-32 flex-shrink-0 flex flex-col justify-between items-center p-2">
                <NorthArrow />
                <DeaLogo />
                </div>
            </div>
            {/* Footer Area */}
            <div className="h-28 flex-shrink-0 flex pt-2">
                {/* Titles */}
                <div className="flex-grow flex flex-col justify-start">
                <h1 className="font-headline text-xl font-bold uppercase">{title}</h1>
                <h2 className="font-body text-lg">{subtitle}</h2>
                </div>
                {/* Right Footer */}
                <div className="w-80 flex-shrink-0 flex flex-col items-end justify-between">
                    <div className="flex gap-2">
                    <div className="border border-gray-400 p-1"><ArgentinaMap/></div>
                    <div className="border border-gray-400 p-1"><BuenosAiresMap/></div>
                    </div>
                    <div className="self-center">
                        <ScaleBar />
                    </div>
                    <div className="text-right text-[8px] text-gray-600">
                        <p>Sistema de Coordenadas: POSGAR 2007 Argentina Faja 5</p>
                        <p>Fuente: DEAS, elaborado en base a...</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </>
  );
};

export default PrintComposerPanel;
