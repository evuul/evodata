export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'app', 'data', 'shortHistory.json');

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8').catch(() => '[]');
    let arr = [];
    try { arr = JSON.parse(raw); } catch { arr = []; }
    return new Response(JSON.stringify({ items: arr, count: arr.length, updatedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

