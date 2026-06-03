const {
  saveBookmarkProgress,
  completeStory,
  getBookmarkProgress,
  clearBookmarkProgress,
} = require("../services/progress_service");

async function saveBookmarkProgressHandler(req, reply) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }

    const params = req.params;
    const body = req.body;

    const storyId = String(params.storyId ?? "").trim();
    const lang = String(body.lang ?? "")
      .trim()
      .toLowerCase();
    const bookmarkWordIndex = Number(body.bookmarkWordIndex);

    if (!storyId)
      return reply.code(400).send({ success: false, error: "storyId zorunlu" });
    if (!lang)
      return reply.code(400).send({ success: false, error: "lang zorunlu" });
    if (!Number.isFinite(bookmarkWordIndex) || bookmarkWordIndex < 0) {
      return reply
        .code(400)
        .send({ success: false, error: "bookmarkWordIndex hatalı" });
    }

    const result = await saveBookmarkProgress({
      userId,
      storyId,
      lang,
      bookmarkWordIndex,
    });

    return reply.send(result);
  } catch (err) {
    const code =
      err?.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    return reply
      .code(code)
      .send({ success: false, error: err.message ?? "Server error" });
  }
}

async function completeStoryHandler(req, reply) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return reply.code(401).send({ success: false, error: "Unauthorized" });

    const params = req.params;
    const body = req.body;

    const storyId = String(params.storyId ?? "").trim();
    const lang = String(body.lang ?? "")
      .trim()
      .toLowerCase();

    if (!storyId)
      return reply.code(400).send({ success: false, error: "storyId zorunlu" });
    if (!lang)
      return reply.code(400).send({ success: false, error: "lang zorunlu" });

    const result = await completeStory({ userId, storyId, lang });
    return reply.send(result);
  } catch (err) {
    const code =
      err?.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    return reply
      .code(code)
      .send({ success: false, error: err.message ?? "Server error" });
  }
}

async function getBookmarkProgressHandler(req, reply) {
  try {
    const userId = req.user?.id;
    const { storyId } = req.params;

    const result = await getBookmarkProgress(userId, storyId);

    return reply.send({
      bookmarkWordIndex: result?.bookmarkWordIndex ?? null,
    });
  } catch (err) {
    return reply.code(500).send({ success: false, error: err.message });
  }
}

async function clearBookmarkProgressHandler(req, reply) {
  try {
    const userId = req.user?.id;
    const { storyId } = req.params;

    await clearBookmarkProgress(userId, storyId);

    return reply.send({ success: true, message: "Bookmark silindi" });
  } catch (err) {
    return reply.send({
      success: true,
      message: "Kayıt zaten yoktu veya silindi",
    });
  }
}

module.exports = {
  saveBookmarkProgressHandler,
  completeStoryHandler,
  getBookmarkProgressHandler,
  clearBookmarkProgressHandler,
};
