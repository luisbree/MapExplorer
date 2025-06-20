"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMapsLibrary, usePlacesService } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, MapPin } from "lucide-react";
import { Button } from "./ui/button";

interface LocationSearchProps {
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationSearch({ onLocationSelect }: LocationSearchProps) {
  const places = useMapsLibrary('places');
  const placesService = usePlacesService();
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  
  const [inputValue, setInputValue] = useState("");
  const [placePredictions, setPlacePredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isPlacePredictionsLoading, setIsPlacePredictionsLoading] = useState(false);
  const [isPlacesServiceLoading, setIsPlacesServiceLoading] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (places) {
      setAutocompleteService(new places.AutocompleteService());
    }
  }, [places]);

  const fetchPredictions = useCallback((value: string) => {
    if (!autocompleteService) {
      return;
    }
    
    setIsPlacePredictionsLoading(true);
    autocompleteService.getPlacePredictions({ input: value, types: ['geocode'] }, (predictions, status) => {
      setIsPlacePredictionsLoading(false);
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        setPlacePredictions(predictions || []);
      } else {
        setPlacePredictions([]);
      }
    });
  }, [autocompleteService]);

  useEffect(() => {
    if (inputValue.trim()) {
      fetchPredictions(inputValue);
      setShowSuggestions(true);
    } else {
      setPlacePredictions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, fetchPredictions]);
  
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

  const handleSelect = useCallback((placeId: string) => {
    if (!placesService) {
        return;
    }

    const prediction = placePredictions.find(p => p.place_id === placeId);
    setInputValue(prediction?.description || '');
    setPlacePredictions([]);
    setShowSuggestions(false);
    
    setIsPlacesServiceLoading(true);
    placesService.getDetails({ placeId, fields: ["geometry.location"] }, (placeDetails, status) => {
        setIsPlacesServiceLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails?.geometry?.location) {
            const lat = placeDetails.geometry.location.lat();
            const lng = placeDetails.geometry.location.lng();
            onLocationSelect(lat, lng);
        }
    });
  }, [placesService, onLocationSelect, placePredictions]);

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
