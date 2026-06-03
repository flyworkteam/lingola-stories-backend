const storiesRepo = require("../repositories/stories_repository");
const progressRepo = require("../repositories/progress_repository");

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function countWords(text) {
  const cleaned = (text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .trim();

  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

async function saveBookmarkProgress(params) {
  const loc = await storiesRepo.findStoryLocalization(
    params.storyId,
    params.lang
  );

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

  const saved = await progressRepo.upsertBookmarkProgress({
    userId: params.userId,
    storyId: params.storyId,
    bookmarkWordIndex: params.bookmarkWordIndex,
    totalWords,
    progressPercent,
  });

  return { success: true, item: saved };
}

async function completeStory(params) {
  const loc = await storiesRepo.findStoryLocalization(
    params.storyId,
    params.lang
  );

  if (!loc) throw httpError(404, "StoryLocalization bulunamadı");

  const totalWords = countWords(loc.text);

  const result = await progressRepo.completeStoryProgress(
    params.userId,
    params.storyId,
    totalWords
  );

  return { success: true, ...result };
}

async function getBookmarkProgress(userId, storyId) {
  return progressRepo.getBookmark(userId, storyId);
}

async function clearBookmarkProgress(userId, storyId) {
  return progressRepo.deleteBookmark(userId, storyId);
}

module.exports = {
  saveBookmarkProgress,
  completeStory,
  getBookmarkProgress,
  clearBookmarkProgress,
};
