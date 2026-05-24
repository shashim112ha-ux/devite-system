import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const backendUrl = `http://127.0.0.1:4000/upload`;
  const body = await req.text();
  const headers = new Headers(req.headers);
  headers.delete('host');

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body,
    });
    const data = await response.text();
    return new NextResponse(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: 'Proxy failed', details: error.message }, { status: 502 });
  }
}
