import type { FastifyReply, FastifyRequest } from "fastify";
import {
  addWordToLibrary,
  listLibraryWords,
  deleteLibraryWord,
  toggleFavLibraryWord,
} from "../services/library.service";

export type AddBody = {
  word: string;
  sourceLang?: string; // default en
  targetLang: string;
  level?: string;
  isFav?: boolean;
};

export type ListQuery = {
  q?: string;
  limit?: string;
  offset?: string;
};

export type DeleteParams = {
  id: string;
};

export type ToggleFavBody = {
  isFav?: boolean;
};


export async function addLibraryWordHandler(
  req: FastifyRequest<{ Body: AddBody }>,
  reply: FastifyReply
) {
  const userId = (req.user as any)?.id;
  if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const body = req.body;

  const result = await addWordToLibrary({
    userId,
    word: body.word,
    sourceLang: body.sourceLang ?? "en",
    targetLang: body.targetLang,
    level: body.level,
    isFav: body.isFav ?? true,
  });

  return reply.send(result);
}

export async function listLibraryWordsHandler(
  req: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
) {
  const userId = (req.user as any)?.id;
  if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const q = req.query;

  const limit = q.limit ? Number(q.limit) : undefined;
  const offset = q.offset ? Number(q.offset) : undefined;

  const result = await listLibraryWords({
    userId,
    q: q.q,
    limit,
    offset,
  });

  return reply.send(result);
}

export async function deleteLibraryWordHandler(
  req: FastifyRequest<{ Params: DeleteParams }>,
  reply: FastifyReply
) {
  const userId = (req.user as any)?.id;
  if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const id = String(req.params.id ?? "").trim();
  if (!id) return reply.code(400).send({ success: false, error: "id zorunlu" });

  const result = await deleteLibraryWord({ userId, id });
  return reply.send(result);
}

export async function toggleFavLibraryWordHandler(
  req: FastifyRequest<{ Params: DeleteParams; Body: ToggleFavBody }>,
  reply: FastifyReply
) {
  const userId = (req.user as any)?.id;
  if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const id = String(req.params.id ?? "").trim();
  if (!id) return reply.code(400).send({ success: false, error: "id zorunlu" });

  const desired = req.body?.isFav; // boolean | undefined (undefined => toggle)

  const result = await toggleFavLibraryWord({ userId, id, isFav: desired });
  return reply.send(result);
}
