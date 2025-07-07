
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const geoServerUrl = searchParams.get('url');

  if (!geoServerUrl) {
    return NextResponse.json({ error: 'GeoServer URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(geoServerUrl, {
      method: 'GET',
      headers: {
        // Set a user-agent, as some servers may reject requests without one.
        'User-Agent': 'MapExplorerApp/1.0 (Proxy)',
        // Some servers are strict and also require an Accept header.
        'Accept': 'application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Try to parse as XML for GeoServer's own error messages, otherwise return plain text
      if (response.headers.get('content-type')?.includes('xml')) {
         return new NextResponse(errorText, {
          status: response.status,
          headers: { 'Content-Type': 'application/xml' },
        });
      }
      return NextResponse.json({ error: `GeoServer error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const data = await response.text(); // Or response.arrayBuffer() if binary

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    
    let details = `The application server failed to connect to the GeoServer URL. This could be due to a network issue (e.g., firewall, incorrect IP address) or the GeoServer being offline. URL: ${geoServerUrl}`;
    
    // Check for specific Node.js fetch error causes for more specific feedback
    if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
      const cause = error.cause as { code: string };
      const hostname = new URL(geoServerUrl).hostname;

      if (cause.code === 'ENOTFOUND' || cause.code === 'EAI_AGAIN') {
        details = `The hostname for the GeoServer ('${hostname}') could not be resolved. Please check the URL and your network's DNS settings.`;
      } else if (cause.code === 'ECONNREFUSED') {
        details = `The connection to the GeoServer was refused by the server at ${geoServerUrl}. Please ensure the server is running and the port is correct.`;
      }
    }

    return NextResponse.json({ error: 'Proxy Connection Failed', details: details }, { status: 502 });
  }
}
