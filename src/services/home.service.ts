import { prisma } from "../utils/prisma";

// ✅ EKSİK OLAN KISIM BURASIYDI: Bunu en tepeye geri ekliyoruz.
export type HomeCategory =
  | "all"
  | "business"
  | "fiction"
  | "fantasy"
  | "adventure"
  | "mystery"
  | "historical"
  | "thriller"
  | "horror"
  | "romance"
  | "biography"
  | "selfHelp"
  | "poetry"
  | "children"
  | "dystopian"
  | "gothic";

export class HomeService {
  // Parametre tipi 'string' olarak kalmalı çünkü "fantasy,history" gibi
  // enum dışı değerler gelebilir.
  static async getHome(params: {
    userId: string;
    lang: string;
    category?: string; 
    limitStories?: number;
    limitHistory?: number;
  }) {
    const lang = (params.lang || "en").toLowerCase();
    const rawCategory = (params.category || "all").trim();

    const limitStories = Math.max(1, Math.min(params.limitStories ?? 12, 30));
    const limitHistory = Math.max(1, Math.min(params.limitHistory ?? 10, 30));

    // --- 1) Prisma WHERE Clause Hazırlama ---
    let whereClause: any = {};

    if (rawCategory !== "all") {
      // Çoklu Kategori (Virgül varsa)
      if (rawCategory.includes(",")) {
        const slugs = rawCategory.split(",").map((c) => {
          const val = c.trim();
          if (val.toLowerCase() === "selfhelp") return "self-help";
          return val.toLowerCase();
        });

        whereClause = {
          tags: { some: { tag: { slug: { in: slugs } } } },
        };
      } 
      // Tekil Kategori
      else {
        let slug = rawCategory.toLowerCase();
        if (slug === "selfhelp") slug = "self-help";
        
        whereClause = {
          tags: { some: { tag: { slug: slug } } },
        };
      }
    }

    // --- 2) Stories List ---
    const stories = await prisma.story.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limitStories,
      include: {
        author: true,
        assets: { select: { assetType: true, url: true, lang: true } },
        localizations: { select: { lang: true, title: true, summary: true } },
        tags: { include: { tag: true } },
      },
    });

    // --- 3) Last Read ---
    const lastProgress = await prisma.userBookProgress.findFirst({
      where: {
        userId: params.userId,
        status: "reading",
      },
      orderBy: { lastReadAt: "desc" },
      include: {
        story: {
          include: {
            author: true,
            assets: { select: { assetType: true, url: true } },
            localizations: {
              select: { lang: true, title: true, summary: true, text: true },
            },
          },
        },
      },
    });

    // --- 4) History ---
    const historyItems = await prisma.userBookProgress.findMany({
      where: { userId: params.userId },
      orderBy: { lastReadAt: "desc" },
      take: limitHistory,
      include: {
        story: {
          include: {
            author: true,
            assets: { select: { assetType: true, url: true } },
            localizations: {
              select: { lang: true, title: true, summary: true, text: true },
            },
          },
        },
      },
    });

    // --- 5) Dictionary Count ---
    const dictionaryCount = await prisma.userWord.count({
      where: { userId: params.userId, isFav: true },
    });

    // --- MAPPING ---
    const mapStory = (s: any) => {
      const loc = pickLocalization(s.localizations ?? [], lang);
      const tags = (s.tags ?? []).map((t: any) => t.tag.slug);
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

// --- Yardımcı Fonksiyonlar ---
function pickLocalization(locs: any[], targetLang: string) {
  const t = (targetLang || "en").toLowerCase();
  const exact = locs.find((l) => (l.lang || "").toLowerCase() === t);
  const en = locs.find((l) => (l.lang || "").toLowerCase() === "en");
  return exact ?? en ?? locs[0] ?? null;
}

function pickCoverUrl(assets: any[]) {
  const cover = assets.find((a) => a.assetType === "cover");
  return cover?.url ?? "";
}

function safeText(v: any) {
  if (typeof v !== "string") return "";
  return v.trim();
}