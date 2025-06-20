
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
        // Copy any necessary headers from the original request or set new ones
        // 'User-Agent': 'Firebase App Prototyper Proxy',
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
    return NextResponse.json({ error: 'Failed to fetch from GeoServer', details: error.message || String(error) }, { status: 500 });
  }
}
