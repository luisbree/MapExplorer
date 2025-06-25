
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
});
export type TrelloList = z.infer<typeof TrelloListSchema>;

export async function getTrelloLists(): Promise<TrelloList[]> {
    const TRELLO_API_KEY = process.env.TRELLO_API_KEY;
    const TRELLO_API_TOKEN = process.env.TRELLO_API_TOKEN;
    const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID;

    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_ID) {
        throw new Error('Las credenciales de la API de Trello no están configuradas en las variables de entorno.');
    }

    const authQuery = `key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;
    const listsUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?${authQuery}&fields=name,id`;
    
    try {
        const listsResponse = await fetch(listsUrl);
        if (!listsResponse.ok) {
            const errorText = await listsResponse.text();
            console.error(`Trello get lists error (${listsResponse.status}): ${errorText}`);
            throw new Error(`Error al obtener las listas de Trello. El servidor respondió: "${errorText || listsResponse.statusText}". Por favor, revisa tus credenciales y el ID del tablero.`);
        }
        
        const lists = await listsResponse.json();
        return z.array(TrelloListSchema).parse(lists.map((list: any) => ({ id: list.id, name: list.name })));
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
        cards_limit: '20',
        partial: 'true',
    });
    
    const searchUrl = `https://api.trello.com/1/search?${searchParams.toString()}&${authParams}`;
    
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error(`Trello search error (${searchResponse.status}): ${errorText}`);
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
