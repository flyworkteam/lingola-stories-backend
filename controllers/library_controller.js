const {
  addWordToLibrary,
  listLibraryWords,
  deleteLibraryWord,
  toggleFavLibraryWord,
} = require("../services/library_service");

async function addLibraryWordHandler(req, reply) {
  const userId = req.user?.id;
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

async function listLibraryWordsHandler(req, reply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const q = req.query;

  const limit = q.limit ? Number(q.limit) : undefined;
  const offset = q.offset ? Number(q.offset) : undefined;

  const result = await listLibraryWords({
    userId,
    q: q.q,
    limit,
    offset,
    sourceLang: q.sourceLang,
    targetLang: q.targetLang,
  });

  return reply.send(result);
}

async function deleteLibraryWordHandler(req, reply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const id = String(req.params.id ?? "").trim();
  if (!id) return reply.code(400).send({ success: false, error: "id zorunlu" });

  const result = await deleteLibraryWord({ userId, id });
  return reply.send(result);
}

async function toggleFavLibraryWordHandler(req, reply) {
  const userId = req.user?.id;
  if (!userId) return reply.code(401).send({ success: false, error: "Unauthorized" });

  const id = String(req.params.id ?? "").trim();
  if (!id) return reply.code(400).send({ success: false, error: "id zorunlu" });

  const desired = req.body?.isFav;

  const result = await toggleFavLibraryWord({ userId, id, isFav: desired });
  return reply.send(result);
}

module.exports = {
  addLibraryWordHandler,
  listLibraryWordsHandler,
  deleteLibraryWordHandler,
  toggleFavLibraryWordHandler,
};
