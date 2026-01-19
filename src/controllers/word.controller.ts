import type { FastifyRequest, FastifyReply } from "fastify";
import { translateWord } from "../services/word.service";

export type TranslateQuery = {
  word: string;
  sourceLang?: string;
  targetLang: string;
  level?: string;
};

export async function translateWordHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  // Route'ta querystring tipini verdik; burada cast yeterli.
  const { word, sourceLang, targetLang } = req.query as TranslateQuery;

  const result = await translateWord({ word, sourceLang, targetLang });
  return reply.send(result);
}
