import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import axios from "axios";

function httpError(statusCode: number, message: string) {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
}

type TranslateQuery = {
  word: string;
  sourceLang?: string;
  targetLang: string;
  level?: string;
};

function normalizeBase(raw: string) {
  // https://verbs.fly-work.com/api  -> { origin: https://verbs.fly-work.com, basePath: /api }
  // https://verbs.fly-work.com/dddd -> { origin: https://verbs.fly-work.com, basePath: /dddd }
  // https://verbs.fly-work.com      -> { origin: https://verbs.fly-work.com, basePath: "" }
  const u = new URL(raw);
  const origin = u.origin;
  const basePath = u.pathname.replace(/\/$/, ""); // remove trailing slash
  return { origin, basePath };
}

export async function wordRoutes(app: FastifyInstance) {
  app.get<{ Querystring: TranslateQuery }>(
    "/api/words/translate",
    { preHandler: [] },
    async (
      req: FastifyRequest<{ Querystring: TranslateQuery }>,
      reply: FastifyReply
    ) => {
      const word = String(req.query.word ?? "").trim();
      const sourceLang = String(req.query.sourceLang ?? "en").trim();
      const targetLang = String(req.query.targetLang ?? "").trim();

      if (!word) throw httpError(400, "word zorunlu");
      if (!targetLang) throw httpError(400, "targetLang zorunlu");

      const w = word.toLowerCase();
      const sl = sourceLang.toLowerCase();
      const tl = targetLang.toLowerCase();

      const WORD_DB_URL = process.env.WORD_DB_URL; // ör: https://verbs.fly-work.com/api  (sende böyle)
      const BASE_TOKEN = process.env.BASE_TOKEN; // apitoken_userid_istekid

      if (!WORD_DB_URL) throw httpError(500, "WORD_DB_URL env eksik");
      if (!BASE_TOKEN) throw httpError(500, "BASE_TOKEN env eksik");

      // ✅ base'i parçala: origin + basePath
      const { origin, basePath } = normalizeBase(WORD_DB_URL);

      // ✅ Doküman çelişkili olduğu için 4 aday deniyoruz:
      // 1) {basePath}/words/translate
      // 2) {basePath}/api/words/translate   (basePath api değilse)
      // 3) /words/translate                  (basePath yanlışsa diye)
      // 4) /api/words/translate
      //
      // Ayrıca SENİN LOG’daki gibi /api/api oluşmasın diye otomatik engelliyoruz.

      const candidates = [
        `${origin}${basePath}/words/translate`,
        `${origin}${basePath}/api/words/translate`,
        `${origin}/words/translate`,
        `${origin}/api/words/translate`,
      ]
        .map((u) => u.replace(/\/{2,}/g, "/").replace(":/", "://")) // normalize // (https://)
        .filter((u, i, arr) => arr.indexOf(u) === i) // uniq
        .filter((u) => !u.includes("/api/api/")); // kill double api

      try {
        let lastErr: any = null;

        for (const url of candidates) {
          try {
            const res = await axios.get(url, {
              params: { word: w, sourceLang: sl, targetLang: tl },
              headers: { "x-api-token": BASE_TOKEN },
              timeout: 15_000,
            });
            return reply.send(res.data);
          } catch (e: any) {
            lastErr = e;
            // 404 ise diğer adaya geç
            if (e?.response?.status === 404) continue;
            // 401/403 gibi ise token/verify sorunu olabilir, direkt dön
            throw e;
          }
        }

        // buraya geldiyse hepsi 404
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
      } catch (error: any) {
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
