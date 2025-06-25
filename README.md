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
3.  **Find your Board ID**:
    *   Open the Trello board you want to use.
    *   The URL will look something like `https://trello.com/b/yourBoardId/your-board-name`.
    *   Copy the `yourBoardId` part from the URL.
4.  **Update `.env.local`**: Add the following variables to your `.env.local` file:

```
TRELLO_API_KEY="YOUR_TRELLO_API_KEY"
TRELLO_API_TOKEN="YOUR_TRELLO_API_TOKEN"
TRELLO_BOARD_ID="YOUR_TRELLO_BOARD_ID"
```

### Running the App

Next, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
