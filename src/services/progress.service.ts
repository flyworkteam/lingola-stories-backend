import { prisma } from "../utils/prisma";

function httpError(statusCode: number, message: string) {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
}

function countWords(text: string): number {
  const cleaned = (text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();

  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

/**
 * Kullanıcı okurken kaldığı yeri (bookmark) kaydeder
 */
export async function saveBookmarkProgress(params: {
  userId: string;
  storyId: string;
  lang: string;
  bookmarkWordIndex: number;
}) {
  const loc = await prisma.storyLocalization.findUnique({
    where: { storyId_lang: { storyId: params.storyId, lang: params.lang } },
    select: { text: true },
  });

  if (!loc) throw httpError(404, "StoryLocalization bulunamadı");

  const totalWords = countWords(loc.text);

  const progressPercent =
    totalWords > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((params.bookmarkWordIndex / totalWords) * 100)
          )
        )
      : 0;

  const saved = await prisma.userBookProgress.upsert({
    where: {
      uniq_user_story_progress: {
        userId: params.userId,
        storyId: params.storyId,
      },
    },
    create: {
      userId: params.userId,
      storyId: params.storyId,
      bookmarkWordIndex: params.bookmarkWordIndex,
      totalWords,
      progressPercent,
      status: "reading",
      lastReadAt: new Date(),
    },
    update: {
      bookmarkWordIndex: params.bookmarkWordIndex,
      totalWords,
      progressPercent,
      status: "reading",
      lastReadAt: new Date(),
    },
  });

  // BURADAKİ BİLDİRİM KODLARI TAMAMEN SİLİNDİ.
  // Spam engellendi.

  return { success: true, item: saved };
}

export async function completeStory(params: {
  userId: string;
  storyId: string;
  lang: string;
}) {
  const loc = await prisma.storyLocalization.findUnique({
    where: { storyId_lang: { storyId: params.storyId, lang: params.lang } },
    select: { text: true },
  });

  if (!loc) throw httpError(404, "StoryLocalization bulunamadı");

  const totalWords = countWords(loc.text);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const completion = await tx.userBookCompletion.upsert({
      where: {
        uniq_user_story_completion: {
          userId: params.userId,
          storyId: params.storyId,
        },
      },
      create: {
        userId: params.userId,
        storyId: params.storyId,
        completedAt: now,
      },
      update: { completedAt: now },
    });

    const progress = await tx.userBookProgress.upsert({
      where: {
        uniq_user_story_progress: {
          userId: params.userId,
          storyId: params.storyId,
        },
      },
      create: {
        userId: params.userId,
        storyId: params.storyId,
        bookmarkWordIndex: totalWords,
        totalWords,
        progressPercent: 100,
        status: "completed",
        lastReadAt: now,
      },
      update: {
        bookmarkWordIndex: totalWords,
        totalWords,
        progressPercent: 100,
        status: "completed",
        lastReadAt: now,
      },
    });

    return { completion, progress };
  });

  // Buradaki remainder bildirimini de sildim, session/end zaten halledecek.

  return { success: true, ...result };
}

export async function getBookmarkProgress(userId: string, storyId: string) {
  const progress = await prisma.userBookProgress.findUnique({
    where: {
      uniq_user_story_progress: { userId, storyId },
    },
    select: { bookmarkWordIndex: true },
  });
  return progress;
}

export async function clearBookmarkProgress(userId: string, storyId: string) {
  return await prisma.userBookProgress.delete({
    where: {
      uniq_user_story_progress: { userId, storyId },
    },
  });
}