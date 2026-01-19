import type { FastifyReply, FastifyRequest } from "fastify";
// Artık HomeCategory başarıyla import edilecek:
import { HomeService, type HomeCategory } from "../services/home.service";

// ✅ Bu fonksiyon tekil kategoriler için güvenlik/düzeltme sağlamaya devam etsin
function normalizeCategory(input: any): HomeCategory {
  const raw = String(input ?? "all")
    .trim()
    .toLowerCase();

  if (
    raw === "selfhelp" ||
    raw === "selfhelp " ||
    raw === "self-help"
  ) {
    return "selfHelp";
  }

  const allowed: Set<string> = new Set([
    "all", "business", "fiction", "fantasy", "adventure",
    "mystery", "historical", "thriller", "horror", "romance",
    "biography", "selfhelp", "self-help", "poetry", "children",
    "dystopian", "gothic",
  ]);

  if (!allowed.has(raw)) return "all";

  if (raw === "self-help" || raw === "selfhelp") return "selfHelp";
  return raw as HomeCategory;
}

export async function getHomeHandler(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req.user as any)?.id;
    if (!userId)
      return reply.code(401).send({ success: false, error: "Unauthorized" });

    const q = req.query as any;

    const lang = String(q?.lang ?? "en")
      .trim()
      .toLowerCase();

    // 🔥 VİRGÜL KONTROLÜ MANTIĞI 🔥
    const rawCategoryInput = q?.category ? String(q.category).trim() : null;
    let finalCategory: string = "all";

    if (rawCategoryInput) {
      // 1. Eğer veri virgül içeriyorsa (Örn: "fantasy,history")
      // Normalize etme, direkt string olarak servise yolla.
      if (rawCategoryInput.includes(',')) {
        finalCategory = rawCategoryInput;
      } 
      // 2. Virgül yoksa (Tekil kategori)
      // Eski normalize fonksiyonunu kullan.
      else {
        finalCategory = normalizeCategory(rawCategoryInput);
      }
    }

    const result = await HomeService.getHome({
      userId,
      lang,
      // String olarak gönderiyoruz
      category: finalCategory, 
      limitStories: q?.limitStories ? Number(q.limitStories) : undefined,
      limitHistory: q?.limitHistory ? Number(q.limitHistory) : undefined,
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