import { NextRequest, NextResponse } from 'next/server';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${PYTHON_API}/api/regulatory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: body.address || '1600 Pacific Hwy, San Diego, CA',
        topic: body.topic || 'water quality',
        audience: body.audience || 'both',
      }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis server unreachable';
    return NextResponse.json({ detail: `Backend error: ${message}` }, { status: 502 });
  }
}
