
"use client";

import React, { useState, useRef } from 'react';
import DraggablePanel from './DraggablePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Loader2, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Extent } from 'ol/extent';
import * as htmlToImage from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

// Helper to format degree labels
const formatCoord = (coord: number): string => {
    const absCoord = Math.abs(coord);
    if (absCoord > 10) return coord.toFixed(2);
    if (absCoord > 1) return coord.toFixed(3);
    return coord.toFixed(4);
};

interface GraticuleProps {
    extent: Extent; // [minLon, minLat, maxLon, maxLat]
}

const Graticule: React.FC<GraticuleProps> = ({ extent }) => {
    const [minLon, minLat, maxLon, maxLat] = extent;
    const lonSpan = maxLon - minLon;
    const latSpan = maxLat - minLat;

    // Calculate positions for exactly two lines per axis, creating a 3x3 grid
    const lonLines: number[] = [
        minLon + lonSpan / 3,
        minLon + (2 * lonSpan) / 3,
    ];
    const latLines: number[] = [
        minLat + latSpan / 3,
        minLat + (2 * latSpan) / 3,
    ];

    const lonToX = (lon: number) => ((lon - minLon) / lonSpan) * 100;
    const latToY = (lat: number) => (1 - (lat - minLat) / latSpan) * 100;

    return (
        <svg
            width="100%"
            height="100%"
            className="absolute top-0 left-0 overflow-visible pointer-events-none"
        >
            <g stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" strokeDasharray="2 3">
                {lonLines.map(lon => (
                    <line key={`lon-${lon}`} x1={`${lonToX(lon)}%`} y1="0%" x2={`${lonToX(lon)}%`} y2="100%" />
                ))}
                {latLines.map(lat => (
                    <line key={`lat-${lat}`} x1="0%" y1={`${latToY(lat)}%`} x2="100%" y2={`${latToY(lat)}%`} />
                ))}
            </g>

            <g fill="#333" fontSize="8px" fontFamily="Arial, sans-serif">
                {lonLines.map(lon => (
                    <text key={`lon-top-${lon}`} x={`${lonToX(lon)}%`} y="-5" textAnchor="middle">
                        {formatCoord(lon)}
                    </text>
                ))}
                {lonLines.map(lon => (
                    <text key={`lon-bottom-${lon}`} x={`${lonToX(lon)}%`} y="102%" dy="0.5em" textAnchor="middle">
                        {formatCoord(lon)}
                    </text>
                ))}
                {latLines.map(lat => (
                    <text key={`lat-left-${lat}`} x="-5" y={`${latToY(lat)}%`} textAnchor="end" dominantBaseline="middle">
                        {formatCoord(lat)}
                    </text>
                ))}
                {latLines.map(lat => (
                    <text key={`lat-right-${lat}`} x="101%" y={`${latToY(lat)}%`} textAnchor="start" dominantBaseline="middle">
                        {formatCoord(lat)}
                    </text>
                ))}
            </g>
        </svg>
    );
};


// Graphical components for the layout
const DeaLogo = () => (
    <svg width="220" height="70" viewBox="0 0 220 70" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
      {/* DEA Text */}
      <text x="95" y="55" fontFamily="Arial, sans-serif" fontSize="50" fill="#000" fontWeight="300">DEA</text>
      
      {/* Isologo */}
      <g transform="translate(45, 35)">
        <defs>
          {/* Path for the curved text */}
          <path id="dea-logo-text-path"
                d="M -32,0 A 32,32 0 1,1 32,0 A 32,32 0 1,1 -32,0" 
          />
          {/* Clipping path for the pattern */}
          <clipPath id="dea-logo-clip">
            <circle cx="0" cy="0" r="27" />
          </clipPath>
        </defs>
        
        {/* Curved text */}
        <text fontFamily="Arial, sans-serif" fontSize="6.8" fill="#000" letterSpacing="0.9" fontWeight="500">
          <textPath href="#dea-logo-text-path" startOffset="76%" textAnchor="middle">
            DEPARTAMENTO DE ESTUDIOS AMBIENTALES
          </textPath>
        </text>

        {/* The geometric pattern, clipped */}
        <g clipPath="url(#dea-logo-clip)" stroke="#000" strokeWidth="1.2" fill="none">
          <circle cx="0" cy="-19" r="19" />
          <circle cx="0" cy="19" r="19" />
          <circle cx="-19" cy="0" r="19" />
          <circle cx="19" cy="0" r="19" />
          <circle cx="-13.4" cy="-13.4" r="19" />
          <circle cx="13.4" cy="-13.4" r="19" />
          <circle cx="-13.4" cy="13.4" r="19" />
          <circle cx="13.4" cy="13.4" r="19" />
        </g>

        {/* Central black circle */}
        <circle cx="0" cy="0" r="10" fill="#000" stroke="none" />
        
        {/* Rings drawn on top of the clipped pattern */}
        <g stroke="#000" strokeWidth="1.2" fill="none">
          <circle cx="0" cy="0" r="15" />
          <circle cx="0" cy="0" r="21" />
          <circle cx="0" cy="0" r="27" />
        </g>
      </g>
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

interface PrintComposerPanelProps {
    mapImage: string;
    mapExtent: Extent | null;
    panelRef: React.RefObject<HTMLDivElement>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onClosePanel: () => void;
    onMouseDownHeader: (e: React.MouseEvent<HTMLDivElement>) => void;
    style?: React.CSSProperties;
    isRefreshing: boolean;
}

// Reusable Layout Component
const PrintLayout = React.forwardRef<HTMLDivElement, { mapImage: string; mapExtent: Extent | null; title: string; subtitle: string; }>(
  ({ mapImage, mapExtent, title, subtitle }, ref) => {
    return (
      <div ref={ref} className="bg-white shadow-lg p-4 flex flex-col text-black font-body h-full w-full">
        {/* Main Content Area */}
        <div className="flex-grow flex border border-black min-h-0">
          {/* Map Area */}
          <div className="flex-grow h-full border-r border-black relative">
            {mapImage ? (
                <>
                    <img src={mapImage} alt="Mapa Capturado" className="w-full h-full object-cover" />
                    {mapExtent && <Graticule extent={mapExtent} />}
                </>
            ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">Cargando imagen del mapa...</div>
            )}
          </div>
          {/* Right Gutter */}
          <div className="w-32 flex-shrink-0 flex flex-col justify-between items-center p-2">
            <NorthArrow />
            <div className="w-full">
                <DeaLogo />
            </div>
          </div>
        </div>
        {/* Footer Area */}
        <div className="h-28 flex-shrink-0 flex pt-2">
          {/* Titles */}
          <div className="flex-grow flex flex-col justify-start overflow-hidden">
            <h1 className="font-headline text-xl font-bold uppercase truncate" title={title}>{title}</h1>
            <h2 className="font-body text-lg truncate" title={subtitle}>{subtitle}</h2>
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
    );
  }
);
PrintLayout.displayName = "PrintLayout";


const PrintComposerPanel: React.FC<PrintComposerPanelProps> = ({
  mapImage,
  mapExtent,
  panelRef,
  isCollapsed,
  onToggleCollapse,
  onClosePanel,
  onMouseDownHeader,
  style,
  isRefreshing,
}) => {
  const [title, setTitle] = useState("TÍTULO DEL MAPA ENCODE SANS BOLD 16PT MAYÚSCULA");
  const [subtitle, setSubtitle] = useState("Subtítulo del mapa - ENCODE SANS Medium 14pt Mayúscula - minúscula");
  const [dpi, setDpi] = useState(150);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const printLayoutRef = useRef<HTMLDivElement>(null);


  const handlePrint = () => {
    // Use a small timeout to ensure the dropdown menu has closed and is not part
    // of the captured document, which can interfere with the print layout.
    setTimeout(() => {
        window.print();
    }, 100);
  };
  
  const handleDownloadJpeg = async () => {
    if (!printLayoutRef.current) {
        toast({ description: "El layout de impresión no está listo.", variant: "destructive" });
        return;
    }
    setIsExporting(true);
    toast({ description: `Generando JPEG a ${dpi} DPI... Esto puede tardar unos segundos.` });

    try {
        const dataUrl = await htmlToImage.toJpeg(printLayoutRef.current, {
            quality: 0.98,
            pixelRatio: dpi / 96, // Standard screen DPI is 96.
            backgroundColor: '#ffffff',
            // Increase canvas size to improve quality for higher DPI
            canvasWidth: printLayoutRef.current.offsetWidth * (dpi / 96),
            canvasHeight: printLayoutRef.current.offsetHeight * (dpi / 96),
        });

        const link = document.createElement('a');
        link.download = `${title.replace(/ /g, '_')}_${dpi}dpi.jpeg`;
        link.href = dataUrl;
        link.click();
        link.remove();
        toast({ description: "Descarga de JPEG iniciada." });
    } catch (error) {
        console.error('Error al generar JPEG:', error);
        toast({ description: "Error al generar el JPEG.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
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
        initialSize={{ width: 550, height: 650 }}
        minSize={{ width: 400, height: 400 }}
      >
        <div className="flex flex-col h-full">
            <div className="space-y-2 mb-2 flex-shrink-0">
                <div>
                    <Label htmlFor="map-title-input" className="text-xs text-white">Título</Label>
                    <Input id="map-title-input" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm bg-black/20" />
                </div>
                <div>
                    <Label htmlFor="map-subtitle-input" className="text-xs text-white">Subtítulo</Label>
                    <Input id="map-subtitle-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="h-8 text-sm bg-black/20" />
                </div>
                 <div className="flex items-end gap-2 pt-1">
                    <div>
                        <Label htmlFor="print-dpi" className="text-xs text-white/90">DPI (JPEG)</Label>
                        <Select value={String(dpi)} onValueChange={(val) => setDpi(Number(val))}>
                            <SelectTrigger id="print-dpi" className="h-9 w-[150px] text-sm bg-black/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-700 text-white border-gray-600">
                                <SelectItem value="96" className="text-xs">96 (Borrador)</SelectItem>
                                <SelectItem value="150" className="text-xs">150 (Estándar)</SelectItem>
                                <SelectItem value="300" className="text-xs">300 (Alta Calidad)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="flex-grow h-9 bg-primary hover:bg-primary/90" disabled={isExporting}>
                                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                                Imprimir / Exportar
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-700 text-white border-gray-600 w-56">
                            <DropdownMenuItem onSelect={handlePrint} className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer">
                                <Printer className="mr-2 h-3.5 w-3.5" />
                                Imprimir / Guardar como PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={handleDownloadJpeg} className="text-xs hover:bg-gray-600 focus:bg-gray-600 cursor-pointer">
                                <Download className="mr-2 h-3.5 w-3.5" />
                                Descargar como JPEG
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            
            <div className="relative flex-grow overflow-auto bg-gray-900 p-2 rounded-md border border-gray-700 flex items-center justify-center">
                {isRefreshing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                )}
                {/* Scaled preview */}
                <div 
                    className="w-[1058px] h-[748px] transform-origin-top-left flex-shrink-0" 
                    style={{ transform: `scale(0.45)` }}
                >
                    <PrintLayout mapImage={mapImage} mapExtent={mapExtent} title={title} subtitle={subtitle} />
                </div>
            </div>
        </div>
      </DraggablePanel>

      {/* Hidden, full-size div for printing and exporting */}
      <div id="print-layout-container" className="fixed top-0 left-[-9999px] z-[-1] print:visible print:static print:w-auto print:h-auto print:z-[9999] bg-white">
        <div ref={printLayoutRef} className="w-[29.7cm] h-[21cm] bg-white">
          <PrintLayout mapImage={mapImage} mapExtent={mapExtent} title={title} subtitle={subtitle} />
        </div>
      </div>
    </>
  );
};

export default PrintComposerPanel;
