
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
import type { NominatimResult } from '@/lib/types';

// Tool definition for location search
const searchLocationTool = ai.defineTool(
  {
    name: 'searchLocation',
    description: 'Searches for a geographic location (city, address, landmark) and returns its bounding box for zooming.',
    inputSchema: z.object({
      query: z.string().describe("The location name to search for, e.g., 'Paris, France' or 'Eiffel Tower'."),
    }),
    outputSchema: z.object({
      boundingbox: z.array(z.number()).describe('The bounding box of the location as [southLat, northLat, westLon, eastLon].'),
      displayName: z.string().describe('The full display name of the found location.'),
    }),
  },
  async ({ query }) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      if (!response.ok) {
        throw new Error('Nominatim API request failed');
      }
      const data: NominatimResult[] = await response.json();
      if (data.length > 0 && data[0].boundingbox) {
        return {
          boundingbox: data[0].boundingbox.map(parseFloat),
          displayName: data[0].display_name
        };
      }
      throw new Error(`Location '${query}' not found.`);
    } catch (error) {
      console.error('Error in searchLocationTool:', error);
      throw new Error(`Failed to search for location: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// Tool definition for searching Trello cards
const searchTrelloCardTool = ai.defineTool(
    {
        name: 'searchTrelloCard',
        description: 'Searches for an existing card on the Trello board by its title or keywords and returns its URL to be opened.',
        inputSchema: z.object({
            query: z.string().describe('The title or keywords to search for in the card name or description.'),
        }),
        outputSchema: z.object({
            cardUrl: z.string().url().describe('The URL of the found Trello card.'),
            message: z.string().describe('A confirmation message to return to the user.'),
        }),
    },
    async ({ query }) => {
        const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
        const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
        const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;

        if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_ID) {
            throw new Error('Las credenciales de la API de Trello no están configuradas en las variables de entorno.');
        }

        const authParams = `key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
        const searchParams = new URLSearchParams({
            query,
            idBoards: TRELLO_BOARD_ID,
            modelTypes: 'cards',
            card_fields: 'name,shortUrl',
            cards_limit: '1', // We only need the top result
        });
        
        const searchUrl = `https://api.trello.com/1/search?${searchParams.toString()}&${authParams}`;
        
        const searchResponse = await fetch(searchUrl);

        if (!searchResponse.ok) {
            throw new Error('Error al buscar en Trello.');
        }
        
        const searchData = await searchResponse.json();

        if (!searchData.cards || searchData.cards.length === 0) {
            throw new Error(`No se encontró ninguna tarjeta que coincida con "${query}".`);
        }

        const card = searchData.cards[0];
        
        return {
            cardUrl: card.shortUrl,
            message: `He encontrado y abierto la tarjeta '${card.name}'.`,
        };
    }
);

// Tool definition for Trello card creation
const createTrelloCardTool = ai.defineTool(
    {
        name: 'createTrelloCard',
        description: 'Creates a new card on a specific Trello board. Use this to track tasks, ideas, or issues mentioned by the user.',
        inputSchema: z.object({
            title: z.string().describe('The title of the Trello card.'),
            description: z.string().describe('The detailed description for the Trello card.').optional(),
            listName: z.string().describe('The name of the list to add the card to, e.g., "To Do", "Ideas", "Bugs".'),
        }),
        outputSchema: z.object({
            cardUrl: z.string().url().describe('The URL of the newly created Trello card.'),
            message: z.string().describe('A confirmation message to return to the user.'),
        }),
    },
    async ({ title, description, listName }) => {
        const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
        const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
        const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;

        if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_ID) {
            throw new Error('Las credenciales de la API de Trello no están configuradas en las variables de entorno.');
        }

        const authQuery = `key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;

        // 1. Get lists on the board to find the ID of the target list
        const listsResponse = await fetch(`https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?${authQuery}`);
        if (!listsResponse.ok) {
            throw new Error('Error al obtener las listas de Trello.');
        }
        const lists = await listsResponse.json();
        const targetList = lists.find((list: any) => list.name.toLowerCase() === listName.toLowerCase());

        if (!targetList) {
            const availableLists = lists.map((l: any) => `'${l.name}'`).join(', ');
            throw new Error(`La lista "${listName}" no fue encontrada. Las listas disponibles son: ${availableLists}.`);
        }

        // 2. Create the card
        const cardData = {
            name: title,
            desc: description || '',
            idList: targetList.id,
        };

        const createCardResponse = await fetch(`https://api.trello.com/1/cards?${authQuery}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData),
        });

        if (!createCardResponse.ok) {
            throw new Error('Error al crear la tarjeta en Trello.');
        }

        const newCard = await createCardResponse.json();

        return {
            cardUrl: newCard.shortUrl,
            message: `¡Hecho! He creado la tarjeta '${title}' en Trello.`,
        };
    }
);


const AvailableLayerSchema = z.object({
  name: z.string().describe('The machine-readable name of the layer, e.g., "cuencas_light".'),
  title: z.string().describe('The human-readable title of the layer, e.g., "Cuencas Hidrográficas Light".'),
});

const ActiveLayerSchema = z.object({
  name: z.string().describe('The machine-readable name of the layer, e.g., "cuencas_light".'),
  title: z.string().describe('The human-readable title of the layer, e.g., "Cuencas Hidrográficas Light".'),
  type: z.string().describe("The layer type, e.g. 'wms', 'wfs', 'vector'. Only 'wfs', 'vector', and 'osm' layers can be styled or have their attributes shown."),
});

const MapAssistantInputSchema = z.object({
  query: z.string().describe("The user's message to the assistant."),
  availableLayers: z.array(AvailableLayerSchema).describe('The list of available layers to search through for adding.'),
  activeLayers: z.array(ActiveLayerSchema).describe('The list of layers currently on the map, for removing, zooming, or styling.'),
});
export type MapAssistantInput = z.infer<typeof MapAssistantInputSchema>;

const MapAssistantOutputSchema = z.object({
  response: z.string().describe("The assistant's conversational response to the user."),
  layersToAdd: z.array(z.string()).describe("A list of machine-readable names of layers to add to the map as WMS (image layers).").optional().nullable(),
  layersToAddAsWFS: z.array(z.string()).describe("A list of machine-readable names of layers to add to the map as WFS (vector data layers, which can be styled).").optional().nullable(),
  layersToRemove: z.array(z.string()).describe("A list of machine-readable names of active layers to remove from the map.").optional().nullable(),
  zoomToLayer: z.string().describe("The machine-readable name of an active layer to zoom to.").optional().nullable(),
  layersToStyle: z.array(z.object({
    layerName: z.string().describe("The machine-readable name of the layer to style."),
    strokeColor: z.string().describe("The requested stroke/outline color in Spanish, e.g., 'rojo', 'verde'.").optional(),
    fillColor: z.string().describe("The requested fill color in Spanish, e.g., 'azul', 'amarillo'.").optional(),
    lineStyle: z.enum(['solid', 'dashed', 'dotted']).describe("The requested line style. Use 'solid' for solid lines, 'dashed' for dashed lines, 'dotted' for dotted lines.").optional(),
    lineWidth: z.number().describe("The requested line width in pixels. Affects the stroke/outline width.").optional(),
  })).describe("A list of layers to change the style of.").optional().nullable(),
  showTableForLayer: z.string().describe("The machine-readable name of an active layer to show its attribute table.").optional().nullable(),
  captureMap: z.enum(['jpeg-full', 'jpeg-red', 'jpeg-green', 'jpeg-blue'])
    .describe("The type of map image to capture. 'jpeg-full' for full color, 'jpeg-red' for red band grayscale, 'jpeg-green' for green band grayscale, 'jpeg-blue' for blue band grayscale.")
    .optional().nullable(),
  zoomToBoundingBox: z.array(z.number()).describe("A bounding box to zoom to, as an array of numbers: [southLat, northLat, westLon, eastLon]. The result of using the 'searchLocation' tool.").optional().nullable(),
  findSentinel2Footprints: z.object({
    startDate: z.string().describe("The start date for the search in YYYY-MM-DD format.").optional(),
    completionDate: z.string().describe("The end date (completion date) for the search in YYYY-MM-DD format.").optional(),
  }).describe("Set this object to search for Sentinel-2 satellite image footprints. If no dates are provided, it searches for recent images.").optional().nullable(),
  urlToOpen: z.string().url().describe("A URL that the application should open in a new tab for the user.").optional().nullable(),
});
export type MapAssistantOutput = z.infer<typeof MapAssistantOutputSchema>;

export async function chatWithMapAssistant(input: MapAssistantInput): Promise<MapAssistantOutput> {
  return mapAssistantFlow(input);
}

const assistantPrompt = ai.definePrompt({
  name: 'mapAssistantPrompt',
  input: { schema: MapAssistantInputSchema },
  output: { schema: MapAssistantOutputSchema },
  tools: [searchLocationTool, createTrelloCardTool, searchTrelloCardTool],
  system: `You are Drax, a friendly and helpful GIS map assistant.
Your goal is to have a conversation with the user and help them with their tasks.
Your response must always be in a conversational, human-like text.

Tu conocimiento no se limita a las diez acciones principales. Eres consciente de todas las funcionalidades de la aplicación. Si el usuario te pide algo que no puedes hacer directamente, debes guiarlo para que use la interfaz de la aplicación. No intentes realizar estas acciones tú mismo.

Otras funcionalidades sobre las que debes guiar al usuario:
- **Dibujar en el mapa**: Si el usuario te pide que dibujes, indícale que use las 'Herramientas de Dibujo' en el panel 'Herramientas'.
- **Cambiar el mapa base**: Si te pide cambiar el mapa base (ej. a vista satelital), guíalo al selector de 'Capa Base' en el panel 'Datos'.
- **Subir un archivo local**: Si el usuario pregunta cómo cargar un archivo (KML, GeoJSON, Shapefile), guíalo al botón 'Importar Capa' (el icono con el '+') en el panel 'Capas'.
- **Obtener datos de OpenStreetMap (OSM)**: Si te preguntan por datos de OSM, explica que primero deben dibujar un polígono con las 'Herramientas de Dibujo' y luego usar la sección 'OpenStreetMap' en el panel 'Herramientas' para obtener los datos.

You can perform ten types of actions based on the user's request:
1. ADD one or more layers to the map (as WMS images or WFS vectors).
2. REMOVE one or more layers from the map.
3. ZOOM to a single layer's extent.
4. CHANGE STYLE of one or more layers currently on the map.
5. SHOW ATTRIBUTE TABLE for a single layer.
6. CAPTURE MAP IMAGE.
7. ZOOM TO LOCATION: Search for a location and go to a city.
8. FIND SENTINEL-2 FOOTPRINTS: Search for Sentinel-2 image footprints in the current map view, optionally with a date range.
9. CREATE TRELLO CARD: Create a new card in Trello to track a task or idea.
10. FIND TRELLO CARD: Search for an existing card on Trello and open it.

Analyze the user's message and the provided lists of layers to decide which action to take.

- TO ADD: If the user asks to see, load, or find one or more map layers, identify all matching layers from the 'Available Layers' list.
  - Prioritize adding layers as WFS (vector data) if the user's request implies they want to work with the data itself (e.g., "carga los datos de las rutas", "añade las cuencas como WFS", "quiero ver los atributos de los partidos", "carga los vectores de..."). Using WFS allows for styling and viewing attributes. If the request is for WFS, populate the 'layersToAddAsWFS' field.
  - If the request is general (e.g., "muestra las rutas", "carga hidrografía"), add the layer as WMS (image) by populating the 'layersToAdd' field. WMS is faster for just viewing.
  - This could be a request for a single layer or multiple layers (e.g., "todas las capas de regimiento", "carga hidrografía y caminos").
  - If you find matches, formulate a friendly response confirming the action (e.g., "Claro, aquí tienes las capas de regimientos.") and populate the appropriate field ('layersToAdd' for WMS, 'layersToAddAsWFS' for WFS) with an array of the exact 'name's of all matching layers. Do not use both fields for the same layer.

- TO REMOVE: If the user asks to remove, delete, or hide one or more layers, find all matching layers from the 'Active Layers' list.
  - If you find matches, formulate a response confirming the removal and populate the 'layersToRemove' field with an array of the exact 'name's of all matching layers.

- TO ZOOM: If the user asks to zoom, focus on, or go to a layer, find the single best matching layer from the 'Active Layers' list.
  - If you find a match, formulate a response confirming the zoom and set the 'zoomToLayer' field to the exact 'name' of that layer.

- TO CHANGE STYLE: If the user asks to change the style of a layer (e.g., "cambia el color de las cuencas a rojo", "pinta el relleno de las parcelas de amarillo", "pon el borde de las rutas más grueso y de color azul"), identify the target layer(s) from the 'Active Layers' list and the requested style changes.
  - You can change stroke color (\`strokeColor\`), fill color (\`fillColor\`), line style (\`lineStyle\`), and line width (\`lineWidth\`).
  - For polygons, "color de relleno" or "relleno" refers to \`fillColor\`. "Color de borde" or "borde" or "contorno" refers to \`strokeColor\`.
  - If the user just says "color" or "pinta de..." for a polygon, you must apply the color to BOTH \`strokeColor\` and \`fillColor\` to change the whole feature's appearance.
  - IMPORTANT: You can only change the style of layers with type 'wfs', 'vector', or 'osm'. If the user asks to style a 'wms' layer, you must politely inform them that it is not possible and do not populate the 'layersToStyle' field. For example: "Lo siento, no puedo cambiar el estilo de la capa 'Cuencas' porque es una capa de tipo imagen (WMS)."
  - For line style, use 'solid' for solid lines, 'dashed' (for 'punteada', 'discontinua', 'a trazos'), or 'dotted' (for 'de puntos').
  - For line width, interpret phrases like 'más gruesa' as a larger number (e.g., 5) and 'más fina' as a smaller number (e.g., 1). A normal width is 2 or 3. If a specific number is given, use it. This affects the stroke/outline width.
  - If you find a stylable match, formulate a response confirming the action and populate the 'layersToStyle' field with an array of objects. Each object must contain the 'layerName' and at least one style property.

- TO SHOW ATTRIBUTE TABLE: If the user asks to see the attributes, data, or table of a layer (e.g., "muéstrame los datos de las cuencas", "abrir tabla de atributos para rutas"), find the best matching layer from the 'Active Layers' list.
  - IMPORTANT: You can only show attributes for layers with type 'wfs', 'vector', or 'osm'. If the user asks to see the table for a 'wms' layer, you must politely inform them that it is not possible. For example: "Lo siento, no puedo mostrar los atributos de la capa 'Cuencas' porque es una capa de tipo imagen (WMS)."
  - If you find a match, formulate a response confirming the action and set the 'showTableForLayer' field to the exact 'name' of that layer.

- TO CAPTURE MAP: If the user asks to capture, export an image, or take a picture of the map, determine the desired output format.
  - If the user asks for a general picture ("saca una foto", "exporta la imagen"), set the 'captureMap' field to 'jpeg-full'.
  - If the user specifies a color band (e.g., "captura la banda roja", "dame la imagen de la banda verde en escala de grises"), set the 'captureMap' field to 'jpeg-red', 'jpeg-green', or 'jpeg-blue' accordingly. You must respond that the output will be in grayscale. For example: "Claro, aquí tienes la captura de la banda roja en escala de grises."
  - This action only works with the ESRI Satellite base layer. You don't know the active base layer, so always assume it's possible. Formulate a response and set the 'captureMap' field.

- TO ZOOM TO LOCATION: If the user asks to find a location, go to a city, or search for an address (e.g., "encuentra la ciudad de La Plata", "llévame a Madrid"), use the 'searchLocation' tool.
  - When the tool returns a bounding box, you must populate the 'zoomToBoundingBox' field with the exact bounding box array returned by the tool.
  - Formulate a response confirming the action, e.g., "Entendido, haciendo zoom a La Plata."
  - If the tool fails or doesn't find the location, inform the user politely, e.g., "Lo siento, no pude encontrar esa ubicación."
  
- FIND SENTINEL-2 FOOTPRINTS: This is an action you MUST perform directly. If the user asks to find Sentinel-2 images, footprints, or scenes (e.g., "busca imágenes sentinel", "encuentra escenas de sentinel en esta área"), you MUST set the 'findSentinel2Footprints' field. This field is an object. If the user specifies a date range (e.g., 'en enero de 2023', 'durante el último mes', 'de 2020 a 2022', 'imágenes de la semana pasada', 'entre el 1 de enero de 2021 y el 31 de marzo de 2021'), you must extract the start and end dates and provide them in 'YYYY-MM-DD' format in the \`startDate\` and \`completionDate\` fields. Be precise with date ranges: if a user mentions a month (e.g., "enero de 2023"), the range should cover the entire month (startDate: '2023-01-01', completionDate: '2023-01-31'). If they mention a year, cover the whole year (e.g., for "2022", use startDate: '2022-01-01', completionDate: '2022-12-31'). If they give a single day, both startDate and completionDate should be that day. If no date is mentioned, send an empty object \`{}\` to search for the most recent images. Your response should confirm the action, for example: "Claro, buscando las huellas de Sentinel-2 en la vista actual para Enero de 2023." Do NOT guide the user to the UI for this.

- CREATE TRELLO CARD: If the user asks to create a task, note, or ticket (e.g., "crea una tarjeta para investigar esto", "anota que hay que arreglar el servidor"), use the 'createTrelloCard' tool. You must ask for the card title and the name of the list (e.g., "Tareas", "Ideas", "Errores") if they are not provided. When the tool executes, you MUST use the 'message' field from the tool's output as your conversational \`response\`, and you MUST populate the 'urlToOpen' field with the 'cardUrl' from the tool's output. Do not make up your own confirmation message; wait for the tool to finish.

- FIND TRELLO CARD: If the user asks to find, search for, or open an existing card (e.g., "busca la tarjeta sobre el río", "abre la tarea de investigación"), use the 'searchTrelloCard' tool. When the tool executes, you MUST use the 'message' field from the tool's output as your conversational \`response\`, and you MUST populate the 'urlToOpen' field with the 'cardUrl' from the tool's output. Do not make up your own confirmation message; wait for the tool to finish.

- If the user's query is just conversational (e.g., "hola", "gracias"), or if you cannot find a matching layer for any action, or if the user asks for something you cannot do (like drawing), just respond naturally according to your guidance and leave all action fields empty.

IMPORTANT: You can perform multiple actions of the SAME type at once (e.g., add multiple layers, or style multiple layers). If the request is ambiguous, prioritize adding over removing, removing over zooming, zooming over styling, styling over showing the table, and showing the table over capturing the map. Do not mix action types in a single response.

Available Layers (for adding):
{{#each availableLayers}}
- Name: {{name}}, Title: "{{title}}"
{{/each}}

Active Layers (on the map, for removing, zooming, or styling):
{{#each activeLayers}}
- Name: {{name}}, Title: "{{title}}", Type: {{type}}
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
    
    // Call the prompt with tools. Genkit will handle the tool execution loop.
    const { output } = await assistantPrompt(input);
    
    if (!output) {
      return { response: "Lo siento, no he podido procesar tu solicitud." };
    }
    
    // Sanitize the output to prevent schema validation errors.
    // The LLM might return `null` for optional fields, but the schema expects `undefined`.
    // Iterate over the output keys and delete any that are null.
    Object.keys(output).forEach(key => {
        if ((output as any)[key] === null) {
            delete (output as any)[key];
        }
    });

    return output;
  }
);
