const { query, transaction } = require("../config/database");
const { connQuery } = require("./conn");
const { createId } = require("../utils/id");
const { attachStoryRelations } = require("./story_relations");

async function upsertAuthor(conn, id, name, type = "studio") {
  const existing = await connQuery(conn, "SELECT id FROM Author WHERE id = ? LIMIT 1", [
    id,
  ]);
  if (existing.length === 0) {
    await connQuery(
      conn,
      `INSERT INTO Author (id, name, type, createdAt) VALUES (?, ?, ?, NOW(3))`,
      [id, name, type]
    );
  }
  return id;
}

async function upsertTag(conn, slug, name) {
  let rows = await connQuery(conn, "SELECT id FROM Tag WHERE slug = ? LIMIT 1", [
    slug,
  ]);
  if (rows.length > 0) return rows[0].id;

  const result = await connQuery(
    conn,
    "INSERT INTO Tag (slug, name) VALUES (?, ?)",
    [slug, name]
  );
  return result.insertId;
}

async function createStoryFromN8N(conn, authorId, batchId, story) {
  await connQuery(
    conn,
    `INSERT INTO Story (id, authorId, level, batchId, status, totalWords, averageRating, ratingCount, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, NOW(3), NOW(3))`,
    [
      story.id,
      authorId,
      story.level,
      batchId,
      story.status,
      story.totalWords || 0,
    ]
  );

  const locs = story.localizations?.create || [];
  for (const loc of locs) {
    await connQuery(
      conn,
      `INSERT INTO StoryLocalization (storyId, lang, title, text, summary)
       VALUES (?, ?, ?, ?, ?)`,
      [story.id, loc.lang, loc.title, loc.text, loc.summary]
    );
  }

  const assets = story.assets?.create || [];
  for (const asset of assets) {
    const meta = asset.meta ? JSON.stringify(asset.meta) : null;
    await connQuery(
      conn,
      `INSERT INTO StoryAsset (storyId, assetType, lang, url, meta)
       VALUES (?, ?, ?, ?, ?)`,
      [story.id, asset.assetType, asset.lang ?? null, asset.url, meta]
    );
  }

  const tags = story.tags?.create || [];
  for (const tagEntry of tags) {
    const tagData = tagEntry.tag?.connectOrCreate;
    if (!tagData) continue;
    const slug = tagData.where?.slug || tagData.create?.slug;
    const name = tagData.create?.name || slug;
    const tagId = await upsertTag(conn, slug, name);
    await connQuery(
      conn,
      "INSERT IGNORE INTO StoryTag (storyId, tagId) VALUES (?, ?)",
      [story.id, tagId]
    );
  }
}

async function saveStoriesBatch(n8nData) {
  return transaction(async (conn) => {
    const authorId = await upsertAuthor(conn, "flywork", "Lingola Studio", "studio");
    let savedCount = 0;

    for (const s of n8nData.stories) {
      await createStoryFromN8N(conn, authorId, n8nData.batchId, s);
      savedCount++;
    }

    return savedCount;
  });
}

async function findReadyStories(lang) {
  const rows = await query(
    "SELECT * FROM Story WHERE status = 'ready' ORDER BY createdAt DESC"
  );
  return attachStoryRelations(rows, { langFilter: lang });
}

async function findStoryById(id, lang) {
  const rows = await query("SELECT * FROM Story WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) return null;
  const [withRelations] = await attachStoryRelations([rows[0]], {
    langFilter: lang,
  });
  return withRelations;
}

async function upsertStoryRating(userId, storyId, rating) {
  return transaction(async (conn) => {
    const existing = await connQuery(
      conn,
      "SELECT id FROM StoryRating WHERE storyId = ? AND userId = ? LIMIT 1",
      [storyId, userId]
    );

    if (existing.length > 0) {
      await connQuery(
        conn,
        "UPDATE StoryRating SET rating = ? WHERE storyId = ? AND userId = ?",
        [rating, storyId, userId]
      );
    } else {
      await connQuery(
        conn,
        `INSERT INTO StoryRating (storyId, userId, rating, createdAt) VALUES (?, ?, ?, NOW(3))`,
        [storyId, userId, rating]
      );
    }

    const ratings = await connQuery(
      conn,
      "SELECT rating FROM StoryRating WHERE storyId = ?",
      [storyId]
    );
    const ratingCount = ratings.length;
    const totalScore = ratings.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = ratingCount > 0 ? totalScore / ratingCount : 0;

    await connQuery(
      conn,
      "UPDATE Story SET averageRating = ?, ratingCount = ?, updatedAt = NOW(3) WHERE id = ?",
      [parseFloat(averageRating.toFixed(2)), ratingCount, storyId]
    );

    const stories = await connQuery(conn, "SELECT * FROM Story WHERE id = ?", [
      storyId,
    ]);
    return stories[0];
  });
}

async function findStoriesForHome({ category, limit }) {
  let rows;

  if (!category || category === "all") {
    rows = await query(
      "SELECT * FROM Story ORDER BY createdAt DESC LIMIT ?",
      [limit]
    );
  } else if (category.includes(",")) {
    const slugs = category.split(",").map((c) => {
      const val = c.trim().toLowerCase();
      return val === "selfhelp" ? "self-help" : val;
    });
    const placeholders = slugs.map(() => "?").join(",");
    rows = await query(
      `SELECT DISTINCT s.* FROM Story s
       INNER JOIN StoryTag st ON st.storyId = s.id
       INNER JOIN Tag t ON t.id = st.tagId
       WHERE t.slug IN (${placeholders})
       ORDER BY s.createdAt DESC
       LIMIT ?`,
      [...slugs, limit]
    );
  } else {
    let slug = category.toLowerCase();
    if (slug === "selfhelp") slug = "self-help";
    rows = await query(
      `SELECT DISTINCT s.* FROM Story s
       INNER JOIN StoryTag st ON st.storyId = s.id
       INNER JOIN Tag t ON t.id = st.tagId
       WHERE t.slug = ?
       ORDER BY s.createdAt DESC
       LIMIT ?`,
      [slug, limit]
    );
  }

  return attachStoryRelations(rows, {
    assetSelect: ["assetType", "url", "lang"],
  });
}

async function findStoryLocalization(storyId, lang) {
  const rows = await query(
    "SELECT text FROM StoryLocalization WHERE storyId = ? AND lang = ? LIMIT 1",
    [storyId, lang]
  );
  return rows[0] || null;
}

async function upsertStoryLocalization(storyId, loc) {
  const existing = await query(
    "SELECT id FROM StoryLocalization WHERE storyId = ? AND lang = ? LIMIT 1",
    [storyId, loc.lang]
  );

  if (existing.length > 0) {
    await query(
      `UPDATE StoryLocalization SET title = ?, text = ?, summary = ? WHERE storyId = ? AND lang = ?`,
      [loc.title, loc.text, loc.summary, storyId, loc.lang]
    );
  } else {
    await query(
      `INSERT INTO StoryLocalization (storyId, lang, title, text, summary) VALUES (?, ?, ?, ?, ?)`,
      [storyId, loc.lang, loc.title, loc.text, loc.summary]
    );
  }

  const rows = await query(
    "SELECT * FROM StoryLocalization WHERE storyId = ? AND lang = ? LIMIT 1",
    [storyId, loc.lang]
  );
  return rows[0];
}

async function storyExists(storyId) {
  const rows = await query("SELECT id FROM Story WHERE id = ? LIMIT 1", [storyId]);
  return rows.length > 0;
}

module.exports = {
  saveStoriesBatch,
  findReadyStories,
  findStoryById,
  upsertStoryRating,
  findStoriesForHome,
  findStoryLocalization,
  upsertStoryLocalization,
  storyExists,
};
