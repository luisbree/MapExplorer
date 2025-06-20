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

Next, install the dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
