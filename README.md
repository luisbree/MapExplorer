# Map Explorer

This is a Next.js application that allows users to explore maps, search for locations, and view coordinates. It's built with OpenLayers for map rendering and Google Maps API for location services.

## Getting Started

First, you need to set up your environment variables. Create a `.env.local` file in the root of the project by copying the example file:

```bash
cp .env.local.example .env.local
```

Then, open `.env.local` and add your Google Maps API key. You can get one from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/overview). Make sure to enable the "Places API" and "Maps JavaScript API".

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
```

### Trello Integration (Optional)

The application can integrate with Trello to create cards from the AI assistant. To enable this, you need to provide your Trello API credentials.

1.  **Get your API Key**: Visit [https://trello.com/app-key](https://trello.com/app-key) and copy your "Key".
2.  **Generate a Token**: On the same page, click the "Token" link under your API key to generate a token. You will be prompted to authorize the application; click "Allow". Copy the resulting token.
3.  **Find your Board IDs**:
    *   Open a Trello board you want to use.
    *   The URL will look something like `https://trello.com/b/yourBoardId/your-board-name`.
    *   Copy the `yourBoardId` part from the URL.
    *   If you want to use more than one board, add their IDs to the `TRELLO_BOARD_IDS` variable, separated by commas (e.g., `boardId1,boardId2`). The application will search for and create cards across all specified boards.
4.  **Update `.env.local`**: Add the following variables to your `.env.local` file:

```
TRELLO_API_KEY="YOUR_TRELLO_API_KEY"
TRELLO_API_TOKEN="YOUR_TRELLO_API_TOKEN"
TRELLO_BOARD_IDS="YOUR_FIRST_BOARD_ID,YOUR_SECOND_BOARD_ID"
```

### Trello Troubleshooting

**"Card not found" or "Workspace not found" error in the browser**

If the application successfully finds or creates a card but your browser shows a "Card not found" or "Workspace not found" error page, it's likely because your browser is logged into a different Trello account than the one associated with your API credentials.

- **The Cause**: The application's backend uses the API Key and Token from your `.env.local` file to interact with Trello. However, when a Trello link is opened, your browser uses its own active Trello login session. If these two accounts are different, you won't have permission to view the card.

- **The Solution**:
    1. Open a new tab and go to `trello.com`.
    2. Make sure you are logged in with the Trello account that has access to your target board. You may need to log out and log back in with the correct account (the Trello page might show a link like "¿No eres [Otro Usuario]? Cambiar cuentas").
    3. Once you are logged into the correct account on trello.com, the links opened by the Map Explorer application should work correctly.

### Running the App

Next, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
