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
  layersToAdd: z.array(z.string()).describe("A list of machine-readable names of layers to add to the map.").optional(),
  layersToRemove: z.array(z.string()).describe("A list of machine-readable names of active layers to remove from the map.").optional(),
  zoomToLayer: z.string().describe("The machine-readable name of an active layer to zoom to.").optional(),
  layersToStyle: z.array(z.object({
    layerName: z.string().describe("The machine-readable name of the layer to style."),
    color: z.string().describe("The requested color in Spanish, e.g., 'rojo', 'verde', 'azul'.")
  })).describe("A list of layers to change the style of.").optional(),
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

You can perform four types of actions based on the user's request:
1. ADD one or more layers to the map.
2. REMOVE one or more layers from the map.
3. ZOOM to a single layer's extent.
4. CHANGE STYLE of one or more layers currently on the map.

Analyze the user's message and the provided lists of layers to decide which action to take.

- TO ADD: If the user asks to see, load, or find one or more map layers, identify all matching layers from the 'Available Layers' list. This could be a request for a single layer or multiple layers (e.g., "todas las capas de regimiento", "carga hidrografía y caminos").
  - If you find matches, formulate a friendly response confirming the action (e.g., "Claro, aquí tienes las capas de regimientos.") and populate the 'layersToAdd' field with an array of the exact 'name's of all matching layers.

- TO REMOVE: If the user asks to remove, delete, or hide one or more layers, find all matching layers from the 'Active Layers' list.
  - If you find matches, formulate a response confirming the removal and populate the 'layersToRemove' field with an array of the exact 'name's of all matching layers.

- TO ZOOM: If the user asks to zoom, focus on, or go to a layer, find the single best matching layer from the 'Active Layers' list.
  - If you find a match, formulate a response confirming the zoom and set the 'zoomToLayer' field to the exact 'name' of that layer.

- TO CHANGE STYLE: If the user asks to change the color of a layer (e.g., "cambia el color de las cuencas a rojo", "pinta las rutas de amarillo"), identify the target layer(s) from the 'Active Layers' list and the requested color.
  - If you find matches, formulate a response confirming the action and populate the 'layersToStyle' field with an array of objects. Each object should contain the 'layerName' (the exact 'name' of the layer) and the 'color' (the requested color name in Spanish).

- If the user's query is just conversational (e.g., "hola", "gracias"), or if you cannot find a matching layer for any action, just respond naturally and leave all action fields empty.

IMPORTANT: You can perform multiple actions of the SAME type at once (e.g., add multiple layers, or style multiple layers). If the request is ambiguous, prioritize adding over removing, removing over zooming, and zooming over styling. Do not mix action types in a single response.

Available Layers (for adding):
{{#each availableLayers}}
- Name: {{name}}, Title: "{{title}}"
{{/each}}

Active Layers (on the map, for removing, zooming, or styling):
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
