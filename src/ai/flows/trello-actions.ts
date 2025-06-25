
'use server';
/**
 * @fileOverview Trello integration server actions.
 *
 * - getTrelloLists - Fetches the available lists from the Trello board.
 * - createTrelloCard - Creates a new card on a specified list.
 * - TrelloList - The type for a Trello list.
 * - CreateCardInput - The input type for the createTrelloCard function.
 * - CreateCardOutput - The return type for the createTrelloCard function.
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
