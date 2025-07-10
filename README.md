
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

### Google Earth Engine (GEE) Integration

The application uses Google Earth Engine for on-the-fly satellite imagery processing. You must configure authentication for this feature to work. You can use either a Service Account (recommended for production) or Application Default Credentials (for local development).

#### Option 1: Service Account (Recommended)

1.  **Create a Service Account**: In the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts), create a service account for your project.
2.  **Grant Permissions**: Grant the service account the "Earth Engine Resource User" role.
3.  **Create a Key**: Create a JSON key for the service account and download it.
4.  **Set Environment Variables**: Open your `.env.local` file and add the following variables:

    ```
    # Indicates you are using a service account
    EE_AUTH_TYPE="SERVICE_ACCOUNT"

    # Paste the entire content of the downloaded JSON key file as a single line string
    EE_SERVICE_ACCOUNT_KEY='{"type": "service_account", "project_id": "...", ...}'
    ```

    **Important**: The JSON key must be a single-line string. You can use an online tool to convert your multi-line JSON key to a single line.

#### Option 2: Application Default Credentials (Local Development)

1.  **Install gcloud CLI**: If you haven't already, [install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
2.  **Authenticate**: Run the following command in your terminal and follow the prompts to log in with your Google account that has access to Earth Engine:
    ```bash
    gcloud auth application-default login
    ```
3.  **No Environment Variables Needed**: The application will automatically detect these credentials if `EE_AUTH_TYPE` is not set to `SERVICE_ACCOUNT`.

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

