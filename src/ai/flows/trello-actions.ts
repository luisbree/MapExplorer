
'use server';
/**
 * @fileOverview Trello integration server actions.
 *
 * - getTrelloLists - Fetches the available lists from the Trello board.
 * - createTrelloCard - Creates a new card on a specified list.
 * - searchTrelloCard - Searches for a card and returns its details.
 * - TrelloList - The type for a Trello list.
 * - CreateCardInput - The input type for the createTrelloCard function.
 * - CreateCardOutput - The return type for the createTrelloCard function.
 * - SearchCardInput - The input type for the searchTrelloCard function.
 * - SearchCardOutput - The return type for the searchTrelloCard function.
 */
import { z } from 'zod';

const TrelloListSchema = z.object({
    id: z.string(),
    name: z.string(),
    boardName: z.string(),
});
export type TrelloList = z.infer<typeof TrelloListSchema>;

export async function getTrelloLists(): Promise<TrelloList[]> {
    const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
    const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
    const TRELLO_BOARD_IDS_STRING = process.env.TRELLO_BOARD_IDS;

    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_IDS_STRING) {
        throw new Error('Las credenciales de la API de Trello o los IDs de tablero no están configurados. Asegúrese de que TRELLO_API_KEY, TRELLO_API_TOKEN y TRELLO_BOARD_IDS estén definidos en las variables de entorno.');
    }

    const boardIds = TRELLO_BOARD_IDS_STRING.split(',').map(id => id.trim());
    const authQuery = `key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;

    try {
        const allListsPromises = boardIds.map(async (boardId) => {
            const [boardResponse, listsResponse] = await Promise.all([
                fetch(`https://api.trello.com/1/boards/${boardId}?${authQuery}&fields=name`),
                fetch(`https://api.trello.com/1/boards/${boardId}/lists?${authQuery}&fields=name,id`)
            ]);

            if (!boardResponse.ok) {
                 const errorText = await boardResponse.text();
                 console.error(`Trello get board error for ${boardId} (${boardResponse.status}): ${errorText}`);
                 let userMessage = `Error al obtener datos del tablero con ID ${boardId}.`;
                 if (boardResponse.status === 401) {
                    userMessage = 'La clave de API o el token de Trello no son válidos o han expirado. Por favor, revíselos en sus variables de entorno.';
                 } else if (boardResponse.status === 404) {
                    userMessage = `El tablero con ID "${boardId}" no fue encontrado. Por favor, asegúrese de que el ID es correcto.`;
                 } else if (boardResponse.status === 403) {
                     userMessage = `No tiene permisos para acceder al tablero con ID "${boardId}". Asegúrese de que el token de API fue generado con la cuenta de Trello correcta y que dicha cuenta tiene acceso al tablero.`;
                 } else {
                     userMessage += ' Revise si el ID es correcto y tiene los permisos necesarios.';
                 }
                 throw new Error(userMessage);
            }
            const boardData = await boardResponse.json();
            const boardName = boardData.name;

            if (!listsResponse.ok) {
                const errorText = await listsResponse.text();
                console.error(`Trello get lists error for board "${boardName}" (${listsResponse.status}): ${errorText}`);
                throw new Error(`Error al obtener las listas del tablero "${boardName}".`);
            }
            
            const listsData = await listsResponse.json();
            return listsData.map((list: any) => ({
                id: list.id,
                name: list.name,
                boardName: boardName,
            }));
        });

        const nestedLists = await Promise.all(allListsPromises);
        const allLists = nestedLists.flat();
        
        return z.array(TrelloListSchema).parse(allLists);
    } catch (error) {
        console.error("Error in getTrelloLists flow:", error);
        if (error instanceof z.ZodError) {
            throw new Error("La respuesta de la API de Trello para las listas no tiene el formato esperado.");
        }
        throw error;
    }
}

const CreateCardInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  listId: z.string(),
});
export type CreateCardInput = z.infer<typeof CreateCardInputSchema>;

const CreateCardOutputSchema = z.object({
  cardUrl: z.string().url(),
  message: z.string(),
});
export type CreateCardOutput = z.infer<typeof CreateCardOutputSchema>;


export async function createTrelloCard(input: CreateCardInput): Promise<CreateCardOutput> {
    const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
    const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;

    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN) {
        throw new Error('Las credenciales de la API de Trello no están configuradas en las variables de entorno.');
    }

    const authQuery = `key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;

    const cardData = {
        name: input.title,
        desc: input.description || '',
        idList: input.listId,
    };

    const createCardResponse = await fetch(`https://api.trello.com/1/cards?${authQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData),
    });

    if (!createCardResponse.ok) {
        const errorText = await createCardResponse.text();
        console.error(`Trello create card error (${createCardResponse.status}): ${errorText}`);
        throw new Error(`Error al crear la tarjeta en Trello. El servidor respondió: "${errorText || createCardResponse.statusText}".`);
    }

    const newCard = await createCardResponse.json();

    return {
        cardUrl: newCard.shortUrl,
        message: `¡Hecho! He creado la tarjeta '${input.title}' en Trello.`,
    };
}

const SearchCardInputSchema = z.object({
  query: z.string(),
});
export type SearchCardInput = z.infer<typeof SearchCardInputSchema>;

const SearchCardOutputSchema = z.object({
  cardUrl: z.string().url(),
  message: z.string(),
});
export type SearchCardOutput = z.infer<typeof SearchCardOutputSchema>;


export async function searchTrelloCard(input: SearchCardInput): Promise<SearchCardOutput> {
    const { query } = input;
    const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
    const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
    const TRELLO_BOARD_IDS = process.env.TRELLO_BOARD_IDS;

    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_IDS) {
        throw new Error('Las credenciales de la API de Trello o los IDs de tablero no están configurados en las variables de entorno.');
    }

    const authParams = `key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    const searchParams = new URLSearchParams({
        query,
        idBoards: TRELLO_BOARD_IDS.split(',').map(id => id.trim()).join(','),
        modelTypes: 'cards',
        card_fields: 'name,shortUrl',
        cards_limit: '20',
        partial: 'true',
    });
    
    const searchUrl = `https://api.trello.com/1/search?${searchParams.toString()}&${authParams}`;
    
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`Trello search error (${searchResponse.status}): ${errorText}`);
        if (searchResponse.status === 401 || searchResponse.status === 400) { // 400 can mean invalid key
            throw new Error('Error de autenticación con Trello. Revisa que tu API Key y Token sean correctos.');
        }
        throw new Error(`Error al buscar en Trello. El servidor respondió: "${errorText || searchResponse.statusText}". Por favor, revisa que tus credenciales (API Key, Token) y el ID del tablero sean correctos.`);
    }
    
    const searchData = await searchResponse.json();

    if (!searchData.cards || searchData.cards.length === 0) {
        throw new Error(`No se encontró ninguna tarjeta que coincida con "${query}".`);
    }

    const bestMatch = searchData.cards.find((card: { name: string }) => 
        card.name.toLowerCase().includes(query.toLowerCase())
    );

    const cardToOpen = bestMatch || searchData.cards[0];
    
    return {
        cardUrl: cardToOpen.shortUrl,
        message: `He encontrado y abierto la tarjeta '${cardToOpen.name}'.`,
    };
}
