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
  availableLayers: z.array(LayerSchema).describe('The list of available layers to search through for adding.'),
  activeLayers: z.array(LayerSchema).describe('The list of layers currently on the map, for removing or zooming.'),
});
export type MapAssistantInput = z.infer<typeof MapAssistantInputSchema>;

const MapAssistantOutputSchema = z.object({
  response: z.string().describe("The assistant's conversational response to the user."),
  layerToAdd: z.string().describe("The machine-readable name of a layer to add to the map.").optional(),
  layerToRemove: z.string().describe("The machine-readable name of an active layer to remove from the map.").optional(),
  zoomToLayer: z.string().describe("The machine-readable name of an active layer to zoom to.").optional(),
});
export type MapAssistantOutput = z.infer<typeof MapAssistantOutputSchema>;

export async function chatWithMapAssistant(input: MapAssistantInput): Promise<MapAssistantOutput> {
  return mapAssistantFlow(input);
}

const assistantPrompt = ai.definePrompt({
  name: 'mapAssistantPrompt',
  input: { schema: MapAssistantInputSchema },
  output: { schema: MapAssistantOutputSchema },
  system: `You are Drax, a friendly and helpful GIS map assistant.
Your goal is to have a conversation with the user and help them with their tasks.
Your response must always be in a conversational, human-like text.

You can perform three types of actions based on the user's request:
1. ADD a layer to the map.
2. REMOVE a layer from the map.
3. ZOOM to a layer's extent.

Analyze the user's message and the provided lists of layers to decide which action to take.

- TO ADD: If the user asks to see, load, or find a specific map layer, identify the single best matching layer from the 'Available Layers' list.
  - If you find a match, formulate a friendly response confirming the action (e.g., "Claro, aquí tienes la capa de cuencas.") and set the 'layerToAdd' field in your output to the exact 'name' of that layer.

- TO REMOVE: If the user asks to remove, delete, or hide a layer, find the best matching layer from the 'Active Layers' list.
  - If you find a match, formulate a response confirming the removal and set the 'layerToRemove' field to the exact 'name' of that layer.

- TO ZOOM: If the user asks to zoom, focus on, or go to a layer, find the best matching layer from the 'Active Layers' list.
  - If you find a match, formulate a response confirming the zoom and set the 'zoomToLayer' field to the exact 'name' of that layer.

- If the user's query is just conversational (e.g., "hola", "gracias"), or if you cannot find a matching layer for any action, just respond naturally and leave the action fields ('layerToAdd', 'layerToRemove', 'zoomToLayer') empty.

IMPORTANT: You can only perform one action at a time. Prioritize adding, then removing, then zooming if the request is ambiguous.

Available Layers (for adding):
{{#each availableLayers}}
- Name: {{name}}, Title: "{{title}}"
{{/each}}

Active Layers (on the map, for removing or zooming):
{{#each activeLayers}}
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
    if (input.availableLayers.length === 0 && input.activeLayers.length === 0) {
      return { response: "No hay capas disponibles para buscar o gestionar en este momento." };
    }
    const { output } = await assistantPrompt(input);
    
    if (!output) {
      return { response: "Lo siento, no he podido procesar tu solicitud." };
    }
    
    return output;
  }
);
