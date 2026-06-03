const axios = require("axios");

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizeBase(raw) {
  const u = new URL(raw);
  const origin = u.origin;
  const basePath = u.pathname.replace(/\/$/, "");
  return { origin, basePath };
}

async function wordRoutes(app) {
  app.get(
    "/api/words/translate",
    { preHandler: [] },
    async (req, reply) => {
      const word = String(req.query.word ?? "").trim();
      const sourceLang = String(req.query.sourceLang ?? "en").trim();
      const targetLang = String(req.query.targetLang ?? "").trim();

      if (!word) throw httpError(400, "word zorunlu");
      if (!targetLang) throw httpError(400, "targetLang zorunlu");

      const w = word.toLowerCase();
      const sl = sourceLang.toLowerCase();
      const tl = targetLang.toLowerCase();

      const WORD_DB_URL = process.env.WORD_DB_URL;
      const BASE_TOKEN = process.env.BASE_TOKEN;

      if (!WORD_DB_URL) throw httpError(500, "WORD_DB_URL env eksik");
      if (!BASE_TOKEN) throw httpError(500, "BASE_TOKEN env eksik");

      const { origin, basePath } = normalizeBase(WORD_DB_URL);

      const candidates = [
        `${origin}${basePath}/words/translate`,
        `${origin}${basePath}/api/words/translate`,
        `${origin}/words/translate`,
        `${origin}/api/words/translate`,
      ]
        .map((u) => u.replace(/\/{2,}/g, "/").replace(":/", "://"))
        .filter((u, i, arr) => arr.indexOf(u) === i)
        .filter((u) => !u.includes("/api/api/"));

      try {
        let lastErr = null;

        for (const url of candidates) {
          try {
            const res = await axios.get(url, {
              params: { word: w, sourceLang: sl, targetLang: tl },
              headers: { "x-api-token": BASE_TOKEN },
              timeout: 15_000,
            });
            return reply.send(res.data);
          } catch (e) {
            lastErr = e;
            if (e?.response?.status === 404) continue;
            throw e;
          }
        }

        req.log.error(
          {
            tried: candidates,
            status: lastErr?.response?.status,
            data: lastErr?.response?.data,
          },
          "word db error"
        );

        return reply.code(404).send({
          success: false,
          error: "Word DB endpoint bulunamadı (WORD_DB_URL / prefix yanlış).",
          tried: candidates,
        });
      } catch (error) {
        const status = error.response?.status ?? 503;
        const data = error.response?.data;

        req.log.error(
          {
            triedBase: WORD_DB_URL,
            status,
            data,
            message: error.message,
          },
          "word db error"
        );

        const msg =
          data?.message ||
          data?.error ||
          (status === 429
            ? "Çok fazla istek atıldı (rate limit)."
            : status === 401
              ? "Word DB token geçersiz / eksik"
              : status === 403
                ? "Word DB verification failed"
                : "Kelime DB servisine ulaşılamadı");

        return reply.code(status).send({ success: false, error: msg });
      }
    }
  );
}

module.exports = { wordRoutes };
