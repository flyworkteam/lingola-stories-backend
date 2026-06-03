const storiesRepo = require("../repositories/stories_repository");
const progressRepo = require("../repositories/progress_repository");
const wordsRepo = require("../repositories/words_repository");

class HomeService {
  static async getHome(params) {
    const lang = (params.lang || "en").toLowerCase();
    const rawCategory = (params.category || "all").trim();

    const limitStories = Math.max(1, Math.min(params.limitStories ?? 12, 30));
    const limitHistory = Math.max(1, Math.min(params.limitHistory ?? 10, 30));

    const stories = await storiesRepo.findStoriesForHome({
      category: rawCategory,
      limit: limitStories,
    });

    const lastProgress = await progressRepo.findLastReadingProgress(
      params.userId
    );

    const historyItems = await progressRepo.findProgressHistory(
      params.userId,
      limitHistory
    );

    const dictionaryCount = await wordsRepo.countFavWords(params.userId);

    const mapStory = (s) => {
      const loc = pickLocalization(s.localizations ?? [], lang);
      const tags = (s.tags ?? []).map((t) => t.tag.slug);
      return {
        id: String(s.id),
        title: safeText(loc?.title) || "Untitled",
        summary: safeText(loc?.summary),
        authorName: safeText(s.author?.name) || "Flywork",
        coverUrl: pickCoverUrl(s.assets ?? []),
        level: safeText(s.level) || "A1",
        averageRating: Number(s.averageRating ?? 0),
        ratingCount: Number(s.ratingCount ?? 0),
        tags: tags,
      };
    };

    return {
      success: true,
      data: {
        stories: stories.map(mapStory),
        lastRead: lastProgress
          ? {
              storyId: String(lastProgress.storyId),
              progressPercent: Number(lastProgress.progressPercent ?? 0),
              bookmarkWordIndex: Number(lastProgress.bookmarkWordIndex ?? 0),
              totalWords: Number(lastProgress.totalWords ?? 0),
              story: mapStory(lastProgress.story),
            }
          : null,
        history: historyItems.map((item) => ({
          lastReadAt: item.lastReadAt,
          status: item.status,
          progressPercent: Number(item.progressPercent ?? 0),
          storyId: String(item.storyId),
          story: mapStory(item.story),
        })),
        dictionaryCount,
      },
    };
  }
}

function pickLocalization(locs, targetLang) {
  const t = (targetLang || "en").toLowerCase();
  const exact = locs.find((l) => (l.lang || "").toLowerCase() === t);
  const en = locs.find((l) => (l.lang || "").toLowerCase() === "en");
  return exact ?? en ?? locs[0] ?? null;
}

function pickCoverUrl(assets) {
  const cover = assets.find((a) => a.assetType === "cover");
  return cover?.url ?? "";
}

function safeText(v) {
  if (typeof v !== "string") return "";
  return v.trim();
}

module.exports = { HomeService };
