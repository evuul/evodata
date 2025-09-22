export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'app', 'data');
const OLDFILE = path.join(DATA_DIR, 'oldBuybackData.json');
const CURFILE = path.join(DATA_DIR, 'buybackData.json');

async function readJson(file) {
  const text = await fs.readFile(file, 'utf8');
  return JSON.parse(text);
}

export async function GET() {
  try {
    const [oldArr, curArr] = await Promise.all([
      readJson(OLDFILE).catch(() => []),
      readJson(CURFILE).catch(() => []),
    ]);
    return new Response(JSON.stringify({ old: oldArr, current: curArr, updatedAt: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

