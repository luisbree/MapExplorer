
'use client';

import GeoJSON from 'ol/format/GeoJSON';
import Feature from 'ol/Feature';
import { Geometry } from 'ol/geom';
import { transformExtent, type ProjectionLike } from 'ol/proj';
import type { Extent } from 'ol/extent';

const SENTINEL_API_URL = 'https://catalogue.dataspace.copernicus.eu/resto/api/collections/Sentinel2/search.json';

/**
 * Finds Sentinel-2 footprints within a given map extent.
 * @param extent The map extent in the map's projection.
 * @param mapProjection The projection of the map.
 * @returns A promise that resolves to an array of OpenLayers Features.
 */
export async function findSentinel2Footprints(extent: Extent, mapProjection: ProjectionLike): Promise<Feature<Geometry>[]> {
  try {
    const extent4326 = transformExtent(extent, mapProjection, 'EPSG:4326');
    const [minX, minY, maxX, maxY] = extent4326;

    // Construct the search query
    // See API docs: https://documentation.dataspace.copernicus.eu/APIs/OData.html
    const params = new URLSearchParams({
      maxRecords: '50',
      processingLevel: 'LEVEL2A',
      cloudCover: '[0,30]', // Example: 0-30% cloud cover
      // Using OData filter for geometry intersection
      $filter: `OData.CSC.Intersects(area=geography'SRID=4326;POLYGON((${minX} ${minY}, ${minX} ${maxY}, ${maxX} ${maxY}, ${maxX} ${minY}, ${minX} ${minY}))')`,
      // sort by ingestion date
      sort: 'ingestionDate', 
      sortOrder: 'descending'
    });

    const response = await fetch(`${SENTINEL_API_URL}?${params.toString()}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sentinel API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Format the GeoJSON features into OpenLayers features
    const geojsonFormat = new GeoJSON({
      featureProjection: mapProjection, // Project GeoJSON (EPSG:4326) to our map's projection
      dataProjection: 'EPSG:4326',
    });

    // Add a preview URL to the properties
    const features = geojsonFormat.readFeatures(data);
    features.forEach((feature, index) => {
        const originalProps = data.features[index].properties;
        if(originalProps.thumbnail) {
            feature.set('preview_url', originalProps.thumbnail);
        }
    });

    return features;

  } catch (error) {
    console.error('Failed to fetch Sentinel-2 footprints:', error);
    // Re-throw the error to be caught by the calling hook
    throw error;
  }
}
