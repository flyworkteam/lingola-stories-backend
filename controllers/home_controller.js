const { HomeService } = require("../services/home_service");

function normalizeCategory(input) {
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

  const allowed = new Set([
    "all", "business", "fiction", "fantasy", "adventure",
    "mystery", "historical", "thriller", "horror", "romance",
    "biography", "selfhelp", "self-help", "poetry", "children",
    "dystopian", "gothic",
  ]);

  if (!allowed.has(raw)) return "all";

  if (raw === "self-help" || raw === "selfhelp") return "selfHelp";
  return raw;
}

async function getHomeHandler(req, reply) {
  try {
    const userId = req.user?.id;
    if (!userId)
      return reply.code(401).send({ success: false, error: "Unauthorized" });

    const q = req.query;

    const lang = String(q?.lang ?? "en")
      .trim()
      .toLowerCase();

    const rawCategoryInput = q?.category ? String(q.category).trim() : null;
    let finalCategory = "all";

    if (rawCategoryInput) {
      if (rawCategoryInput.includes(",")) {
        finalCategory = rawCategoryInput;
      } else {
        finalCategory = normalizeCategory(rawCategoryInput);
      }
    }

    const result = await HomeService.getHome({
      userId,
      lang,
      category: finalCategory,
      limitStories: q?.limitStories ? Number(q.limitStories) : undefined,
      limitHistory: q?.limitHistory ? Number(q.limitHistory) : undefined,
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

module.exports = { getHomeHandler };
