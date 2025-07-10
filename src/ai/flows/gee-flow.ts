
'use server';
/**
 * @fileOverview A flow for generating Google Earth Engine tile layers.
 *
 * - getGeeTileLayer - Generates a tile layer URL for a given Area of Interest.
 */

import { ai } from '@/ai/genkit';
import ee from '@google/earthengine';
import { promisify } from 'util';
import type { GeeTileLayerInput, GeeTileLayerOutput } from './gee-types';
import { GeeTileLayerInputSchema, GeeTileLayerOutputSchema } from './gee-types';

// Main exported function for the frontend to call
export async function getGeeTileLayer(input: GeeTileLayerInput): Promise<GeeTileLayerOutput> {
  return geeTileLayerFlow(input);
}

// Define the Genkit flow
const geeTileLayerFlow = ai.defineFlow(
  {
    name: 'geeTileLayerFlow',
    inputSchema: GeeTileLayerInputSchema,
    outputSchema: GeeTileLayerOutputSchema,
  },
  async (input) => {
    try {
      await initializeEe();

      const { aoi } = input;
      const geometry = ee.Geometry.Rectangle([aoi.minLon, aoi.minLat, aoi.maxLon, aoi.maxLat]);
      
      const image = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
        .filterBounds(geometry)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        .filterDate('2023-01-01', '2023-12-31')
        .median();

      const visParams = {
        bands: ['B8', 'B4', 'B3'], // NIR, Red, Green -> False Color for Urban
        min: 0,
        max: 3000,
      };

      const mapDetails = await promisify(image.getMap.bind(image))(visParams);
      const tileUrl = mapDetails.urlFormat.replace('{x}', '{x}').replace('{y}', '{y}').replace('{z}', '{z}');

      return { tileUrl };
    } catch (error: any) {
        console.error("Earth Engine Error:", error);
        // Provide more specific error messages if possible
        if (error.message && error.message.includes('Service account not specified')) {
            throw new Error('El servidor no está configurado para la autenticación con Earth Engine. Contacte al administrador.');
        } else if (error.message && error.message.includes('computation timed out')) {
            throw new Error('El procesamiento en Earth Engine tardó demasiado. Intente con un área más pequeña.');
        }
        // Throw the original error message for better diagnostics
        throw new Error(`Ocurrió un error al generar la capa de Earth Engine: ${error.message || 'Error desconocido'}`);
    }
  }
);


// --- Earth Engine Initialization ---
let eeInitialized: Promise<void> | null = null;

function initializeEe(): Promise<void> {
  if (eeInitialized) {
    return eeInitialized;
  }

  eeInitialized = new Promise((resolve, reject) => {
    const authType = process.env.EE_AUTH_TYPE;

    const onEeInitSuccess = () => {
        console.log('Earth Engine initialized successfully.');
        resolve();
    };
    const onEeInitFailure = (err: any) => {
        console.error('EE Initialization error:', err);
        eeInitialized = null; // Reset for next attempt
        reject(new Error('Failed to initialize Earth Engine.'));
    };

    if (authType === 'SERVICE_ACCOUNT') {
      const serviceAccountKey = process.env.EE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        return reject(new Error('EE_SERVICE_ACCOUNT_KEY is not set in environment variables for GEE authentication.'));
      }
      try {
        const keyObject = JSON.parse(serviceAccountKey);
        ee.data.authenticateViaPrivateKey(
          keyObject,
          () => ee.initialize(null, null, onEeInitSuccess, onEeInitFailure),
          (err: any) => {
            console.error('EE Authentication error:', err);
            eeInitialized = null; // Reset for next attempt
            reject(new Error('Failed to authenticate with Earth Engine using Service Account.'));
          }
        );
      } catch (e) {
          return reject(new Error('Failed to parse EE_SERVICE_ACCOUNT_KEY. Please ensure it is a valid JSON string.'));
      }
    } else {
      // Attempt ADC if no specific auth method is defined
      ee.data.authenticateViaAADC(
        {}, 
        () => ee.initialize(null, null, onEeInitSuccess, onEeInitFailure),
        (err: any) => {
          console.error('EE ADC Authentication error:', err);
          eeInitialized = null; // Reset for next attempt
          reject(new Error('Authentication via Application Default Credentials failed. Ensure your environment is configured correctly (e.g., via `gcloud auth application-default login`).'));
        }
      );
    }
  });

  return eeInitialized;
}
