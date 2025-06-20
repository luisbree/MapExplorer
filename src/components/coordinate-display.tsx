"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import type { Coordinates } from "./map-explorer";

interface CoordinateDisplayProps {
  coordinates: Coordinates;
}

export default function CoordinateDisplay({ coordinates }: CoordinateDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [lon, lat] = coordinates;
  
  const handleCopy = () => {
    const textToCopy = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="shadow-lg bg-card/80 backdrop-blur-sm">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">Coordinates</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4 p-4 pt-0">
          <div className="font-mono text-xs">
              <p>Lat: {lat.toFixed(6)}</p>
              <p>Lon: {lon.toFixed(6)}</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleCopy} aria-label="Copy coordinates">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
      </CardContent>
    </Card>
  );
}
