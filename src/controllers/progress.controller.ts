import type { FastifyReply, FastifyRequest } from "fastify";
import {
  saveBookmarkProgress,
  completeStory,
  getBookmarkProgress,
  clearBookmarkProgress,
} from "../services/progress.service";

type Params = { storyId: string };

type Body = {
  lang: string; // okuduğu dil (StoryLocalization.lang)
  bookmarkWordIndex: number; // kullanıcı hangi kelimede bookmark bastı (0-based veya 1-based sen karar ver)
};

export async function saveBookmarkProgressHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    }

    const params = req.params as Params;
    const body = req.body as Body;

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
  } catch (err: any) {
    const code =
      err?.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    return reply
      .code(code)
      .send({ success: false, error: err.message ?? "Server error" });
  }
}

type CompleteBody = {
  lang: string;
};

export async function completeStoryHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId)
      return reply.code(401).send({ success: false, error: "Unauthorized" });

    const params = req.params as Params;
    const body = req.body as CompleteBody;

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
  } catch (err: any) {
    const code =
      err?.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
    return reply
      .code(code)
      .send({ success: false, error: err.message ?? "Server error" });
  }
}
export async function getBookmarkProgressHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = (req.user as any)?.id;
    const { storyId } = req.params as { storyId: string };

    const result = await getBookmarkProgress(userId, storyId);

    // Flutter { "bookmarkWordIndex": 123 } beklediği için bu formatta dönüyoruz
    return reply.send({
      bookmarkWordIndex: result?.bookmarkWordIndex ?? null,
    });
  } catch (err: any) {
    return reply.code(500).send({ success: false, error: err.message });
  }
}

export async function clearBookmarkProgressHandler(
  req: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = (req.user as any)?.id;
    const { storyId } = req.params as { storyId: string };

    await clearBookmarkProgress(userId, storyId);

    return reply.send({ success: true, message: "Bookmark silindi" });
  } catch (err: any) {
    // Eğer kayıt zaten yoksa hata vermemesi için kontrol edebilirsin
    return reply.send({
      success: true,
      message: "Kayıt zaten yoktu veya silindi",
    });
  }
}
