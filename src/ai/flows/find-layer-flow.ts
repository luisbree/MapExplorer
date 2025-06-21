'use server';
/**
 * @fileOverview A conversational map assistant AI flow.
 *
 * - chatWithMapAssistant - A function that handles the conversational interaction.
 * - MapAssistantInput - The input type for the chat function.
 * - MapAssistantOutput - The return type for the chat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LayerSchema = z.object({
  name: z.string().describe('The machine-readable name of the layer, e.g., "cuencas_light".'),
  title: z.string().describe('The human-readable title of the layer, e.g., "Cuencas Hidrográficas Light".'),
});

const MapAssistantInputSchema = z.object({
  query: z.string().describe("The user's message to the assistant."),
  availableLayers: z.array(LayerSchema).describe('The list of available layers to search through.'),
});
export type MapAssistantInput = z.infer<typeof MapAssistantInputSchema>;

const MapAssistantOutputSchema = z.object({
  response: z.string().describe("The assistant's conversational response to the user."),
  layerToAdd: z.string().describe("The machine-readable name of a layer to add to the map, if requested.").optional(),
});
export type MapAssistantOutput = z.infer<typeof MapAssistantOutputSchema>;

export async function chatWithMapAssistant(input: MapAssistantInput): Promise<MapAssistantOutput> {
  return mapAssistantFlow(input);
}

const assistantPrompt = ai.definePrompt({
  name: 'mapAssistantPrompt',
  input: { schema: MapAssistantInputSchema },
  output: { schema: MapAssistantOutputSchema },
  system: `You are a friendly and helpful GIS map assistant.
Your goal is to have a conversation with the user and help them with their tasks.
Your response must always be in a conversational, human-like text.

If the user asks to see, load, or find a specific map layer, you must identify the single best matching layer from the 'Available Layers' list provided below.
- If you find a matching layer, formulate a friendly response confirming the action (e.g., "Claro, aquí tienes la capa de cuencas.") and set the 'layerToAdd' field in your output to the exact machine-readable 'name' of that layer.
- If the user's query is just conversational (e.g., "hola", "gracias"), or if you cannot find a matching layer, just respond naturally and leave the 'layerToAdd' field empty.

Available Layers:
{{#each availableLayers}}
- Name: {{name}}, Title: "{{title}}"
{{/each}}
`,
  prompt: `User's message: "{{query}}"`,
});

const mapAssistantFlow = ai.defineFlow(
  {
    name: 'mapAssistantFlow',
    inputSchema: MapAssistantInputSchema,
    outputSchema: MapAssistantOutputSchema,
  },
  async (input) => {
    if (input.availableLayers.length === 0) {
      return { response: "No hay capas de GeoServer disponibles para buscar en este momento." };
    }
    const { output } = await assistantPrompt(input);
    
    if (!output) {
      return { response: "Lo siento, no he podido procesar tu solicitud." };
    }
    
    return output;
  }
);
