'use server';
/**
 * @fileOverview An AI flow to find a specific GIS layer from a list based on a natural language query.
 *
 * - findLayer - A function that handles the layer finding process.
 * - FindLayerInput - The input type for the findLayer function.
 * - FindLayerOutput - The return type for the findLayer function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LayerSchema = z.object({
  name: z.string().describe('The machine-readable name of the layer, e.g., "cuencas_light".'),
  title: z.string().describe('The human-readable title of the layer, e.g., "Cuencas Hidrográficas Light".'),
});

export const FindLayerInputSchema = z.object({
  query: z.string().describe('The user\'s request in natural language, e.g., "muéstrame las cuencas".'),
  availableLayers: z.array(LayerSchema).describe('The list of available layers to search through.'),
});
export type FindLayerInput = z.infer<typeof FindLayerInputSchema>;

export const FindLayerOutputSchema = z.object({
  name: z.string().describe('The machine-readable name of the best matching layer found. Should be one of the names from the input list.'),
}).optional();
export type FindLayerOutput = z.infer<typeof FindLayerOutputSchema>;


export async function findLayer(input: FindLayerInput): Promise<FindLayerOutput> {
  // If only one layer is available and it's a good match, just return it without calling the LLM.
  if (input.availableLayers.length === 1) {
    const singleLayer = input.availableLayers[0];
    if (singleLayer.title.toLowerCase().includes(input.query.toLowerCase()) || singleLayer.name.toLowerCase().includes(input.query.toLowerCase())) {
        return { name: singleLayer.name };
    }
  }

  return findLayerFlow(input);
}

const findLayerPrompt = ai.definePrompt({
  name: 'findLayerPrompt',
  input: { schema: FindLayerInputSchema },
  output: { schema: FindLayerOutputSchema },
  prompt: `You are a helpful GIS assistant. Your task is to find the correct layer from a list based on the user's query.

User Query: "{{query}}"

Available Layers:
{{#each availableLayers}}
- Name: {{name}}, Title: "{{title}}"
{{/each}}

Based on the user query, identify the single best matching layer from the list. The output should be the 'name' of that layer.
If no suitable layer is found, do not return any output.`,
});

const findLayerFlow = ai.defineFlow(
  {
    name: 'findLayerFlow',
    inputSchema: FindLayerInputSchema,
    outputSchema: FindLayerOutputSchema,
  },
  async (input) => {
    // If there are no layers, don't call the prompt.
    if (input.availableLayers.length === 0) {
      return undefined;
    }
    const { output } = await findLayerPrompt(input);
    return output;
  }
);
