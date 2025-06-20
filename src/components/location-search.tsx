"use client";

import { useState, useEffect, useRef } from "react";
import { useAutocompleteService, usePlacesService } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, MapPin } from "lucide-react";
import { Button } from "./ui/button";

interface LocationSearchProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const { autocompleteService, placePredictions, isPlacePredictionsLoading } = useAutocompleteService();
  const { placesService, isPlacesServiceLoading, placeDetails } = usePlacesService();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputValue.trim()) {
      autocompleteService?.getPlacePredictions({ input: inputValue, types: ['geocode'] });
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [inputValue, autocompleteService]);

  useEffect(() => {
    if (placeDetails) {
      const lat = placeDetails.geometry?.location?.lat();
      const lng = placeDetails.geometry?.location?.lng();
      if (lat && lng) {
        onLocationSelect(lat, lng);
      }
      setShowSuggestions(false);
    }
  }, [placeDetails, onLocationSelect]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (placeId: string) => {
    const prediction = placePredictions.find(p => p.place_id === placeId);
    setInputValue(prediction?.description || '');
    placesService?.getDetails({ placeId, fields: ["geometry.location"] });
  };

  return (
    <div className="relative" ref={containerRef}>
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => inputValue && setShowSuggestions(true)}
                placeholder="Search for a location..."
                className="pl-10 bg-card/80 backdrop-blur-sm"
            />
             {(isPlacePredictionsLoading || isPlacesServiceLoading) && <Loader2 className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
        </div>
        {showSuggestions && placePredictions.length > 0 && (
            <Card className="absolute top-full mt-2 w-full shadow-lg bg-card/80 backdrop-blur-sm">
                <CardContent className="p-2 max-h-80 overflow-y-auto">
                    <ul>
                    {placePredictions.map(({ place_id, description }) => (
                        <li key={place_id}>
                            <Button
                                variant="ghost"
                                className="w-full justify-start font-normal h-auto py-2 px-3 text-left gap-2"
                                onClick={() => handleSelect(place_id)}
                            >
                                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="truncate">{description}</span>
                            </Button>
                        </li>
                    ))}
                    </ul>
                </CardContent>
            </Card>
        )}
    </div>
  );
}
