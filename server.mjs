// Minimal manseryeok result page backed by the HRUM API.
// No dependencies: Node built-in http, crypto and fetch only.
// The API key stays on the server; the browser only talks to /api/manseryeok.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const HRUM_URL = 'https://api.hrum.ai/api/v1/partners/v1/manseryeok';
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY_BYTES = 4 * 1024;
const API_KEY = process.env.HRUM_API_KEY;

if (!API_KEY) {
  console.error('HRUM_API_KEY is empty. Copy .env.example to .env and put your key there.');
  process.exit(1);
}

// Same input -> same manseryeok result, so reuse it instead of calling (and paying) again.
// In-memory only; use a real DB in production.
const cache = new Map();

function isInt(v, min, max) {
  return Number.isInteger(v) && v >= min && v <= max;
}

// Rebuild the request from known fields only. Never forward the raw browser body.
function buildHrumBody(input) {
  const { year, month, day, hour, minute, gender, calendar, isLeapMonth } = input ?? {};
  if (!isInt(year, 1900, 2100) || !isInt(month, 1, 12) || !isInt(day, 1, 31)) return null;
  if (gender !== 'male' && gender !== 'female') return null;

  const body = { year, month, day, timezone: 'Asia/Seoul', gender };
  // Unknown birth time: omit hour/minute entirely (do not fill in noon).
  if (hour !== undefined && hour !== null) {
    if (!isInt(hour, 0, 23)) return null;
    body.hour = hour;
    if (minute !== undefined && minute !== null) {
      if (!isInt(minute, 0, 59)) return null;
      body.minute = minute;
    }
  }
  if (calendar === 'lunar') {
    body.calendar = 'lunar';
    if (isLeapMonth === true) body.isLeapMonth = true;
  }
  return body;
}

// Send the browser only what the page draws.
function pickView(data) {
  const pillar = (p) =>
    p && {
      stem: p.stem,
      branch: p.branch,
      stemHanja: p.stemHanja,
      branchHanja: p.branchHanja,
      ohaeng: p.ohaeng,
    };
  const current = Array.isArray(data.daeun) ? data.daeun.find((d) => d.isCurrent) : undefined;
  return {
    pillars: {
      hour: pillar(data.wonkuk?.hour) ?? null,
      day: pillar(data.wonkuk?.day),
      month: pillar(data.wonkuk?.month),
      year: pillar(data.wonkuk?.year),
    },
    ohaengBalance: data.ohaengBalance ?? null,
    ohaengDeficient: data.ohaengDeficient ?? [],
    yongshin: data.yongshin ?? null,
    ilganSummary: data.ilganSummary ?? null,
    currentDaeun: current
      ? { startAge: current.startAge, endAge: current.endAge, stemHanja: current.stemHanja, branchHanja: current.branchHanja }
      : null,
    birthHourKnown: data.birthHour ? data.birthHour.known : true,
  };
}

async function callHrum(body) {
  const res = await fetch(HRUM_URL, {
    method: 'POST',
    headers: {
      'X-Partner-Api-Key': API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'hrum-saju-example/0.1',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!json || !json.success) {
    return { ok: false, status: json?.statusCode ?? res.status, code: json?.code ?? null };
  }
  return { ok: true, data: json.data };
}

// Map HRUM errors to short messages for the page. Branch on status/code, not message text.
function errorMessage(status) {
  if (status === 400) return '입력 값을 다시 확인해 주세요.';
  if (status === 401) return '서버의 API 키 설정을 확인해 주세요.';
  if (status === 402) return '크레딧이 부족해요. 콘솔에서 충전해 주세요.';
  if (status === 429) return '요청이 많아요. 잠시 뒤 다시 시도해 주세요.';
  return '잠시 뒤 다시 시도해 주세요.';
}

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function handleManseryeok(req, res) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    return send(res, 415, { ok: false, message: 'JSON으로 보내 주세요.' });
  }
  let input;
  try {
    input = await readJson(req);
  } catch {
    return send(res, 400, { ok: false, message: '요청을 읽지 못했어요.' });
  }
  const body = buildHrumBody(input);
  if (!body) return send(res, 400, { ok: false, message: '입력 값을 다시 확인해 주세요.' });

  const key = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  if (cache.has(key)) return send(res, 200, { ok: true, cached: true, view: cache.get(key) });

  try {
    const result = await callHrum(body);
    if (!result.ok) {
      console.warn(`HRUM error status=${result.status} code=${result.code ?? '-'}`);
      return send(res, result.status === 400 ? 400 : 502, { ok: false, message: errorMessage(result.status) });
    }
    const view = pickView(result.data);
    cache.set(key, view);
    return send(res, 200, { ok: true, cached: false, view });
  } catch (err) {
    console.error('HRUM request failed:', err.message);
    return send(res, 502, { ok: false, message: errorMessage(0) });
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/manseryeok') return handleManseryeok(req, res);
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const html = await readFile(new URL('./public/index.html', import.meta.url));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    return res.end(html);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
