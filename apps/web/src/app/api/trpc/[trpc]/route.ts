import { NextRequest, NextResponse } from 'next/server';

async function proxyRequest(req: NextRequest) {
  const url = new URL(req.url);
  // Extract the path after /api/trpc
  const path = url.pathname.replace('/api/trpc', '/trpc');
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ? process.env['NEXT_PUBLIC_API_URL'].replace('/trpc', '') : 'http://127.0.0.1:4000';
  const backendUrl = `${baseUrl}${path}${url.search}`;

  const headers = new Headers(req.headers);
  headers.delete('host'); // Let fetch set the host
  headers.delete('connection');

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await req.text();
  }

  try {
    const response = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding'); // Next.js handles this

    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Proxy failed', details: error.message }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req);
}

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}
