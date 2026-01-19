import axios from "axios";

function httpError(statusCode: number, message: string) {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
}

const TTL_MS = 60_000;
const cache = new Map<string, { exp: number; value: any }>();
const inflight = new Map<string, Promise<any>>();

function cacheKey(word: string, sourceLang: string, targetLang: string) {
  return `${word}|${sourceLang}|${targetLang}`;
}

// küçük helper: sonda slash varsa kırp
function trimSlash(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

export async function translateWord(params: {
  word: string;
  sourceLang?: string;
  targetLang: string;
}) {
  const w = String(params.word ?? "")
    .trim()
    .toLowerCase();
  const sl = String(params.sourceLang ?? "en")
    .trim()
    .toLowerCase();
  const tl = String(params.targetLang ?? "")
    .trim()
    .toLowerCase();

  if (!w) throw httpError(400, "word zorunlu");
  if (!tl) throw httpError(400, "targetLang zorunlu");

  // ✅ ENV: sende WORD_DB_URL ve BASE_TOKEN var
  const WORD_DB_BASE_URL = process.env.WORD_DB_URL; // ör: http://localhost:5454/dddd
  const WORD_DB_TOKEN = process.env.BASE_TOKEN; // token format: apitoken_userid_istekid

  if (!WORD_DB_BASE_URL || !WORD_DB_TOKEN) {
    throw httpError(500, "WORD_DB_URL / BASE_TOKEN env eksik");
  }

  const key = cacheKey(w, sl, tl);
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.exp > now) return hit.value;

  const running = inflight.get(key);
  if (running) return await running;

  const p = (async () => {
    try {
      // ✅ DOCS: /api/words/translate
      // WORD_DB_URL ör: http://localhost:5454/dddd  => full: http://localhost:5454/dddd/api/words/translate
      const url = `${trimSlash(WORD_DB_BASE_URL)}/api/words/translate`;

      const res = await axios.get(url, {
        params: { word: w, sourceLang: sl, targetLang: tl },
        headers: { "x-api-token": WORD_DB_TOKEN },
        timeout: 15_000,
      });

      let payload = res.data;

      // minimal normalize
      if (!payload?.success && payload?.data)
        payload = { success: true, data: payload.data };
      if (!payload?.success && !payload?.data)
        payload = { success: true, data: payload };

      cache.set(key, { exp: Date.now() + TTL_MS, value: payload });
      return payload;
    } catch (error: any) {
      const status = error.response?.status ?? 500;
      const data = error.response?.data;

      const msg =
        data?.message ||
        data?.error ||
        (status === 429
          ? "Çok fazla istek atıldı (rate limit)."
          : "Kelime DB servisine ulaşılamadı");

      throw httpError(status, msg);
    }
  })();

  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}
