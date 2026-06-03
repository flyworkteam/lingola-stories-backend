const { query } = require("../config/database");

async function loadLocalizations(storyIds, langFilter) {
  if (!storyIds.length) return new Map();
  const placeholders = storyIds.map(() => "?").join(",");
  let sql = `SELECT * FROM StoryLocalization WHERE storyId IN (${placeholders})`;
  const params = [...storyIds];

  if (langFilter) {
    sql += " AND lang = ?";
    params.push(langFilter);
  }

  const rows = await query(sql, params);
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.storyId)) map.set(row.storyId, []);
    map.get(row.storyId).push(row);
  }
  return map;
}

async function loadAssets(storyIds) {
  if (!storyIds.length) return new Map();
  const placeholders = storyIds.map(() => "?").join(",");
  const rows = await query(
    `SELECT * FROM StoryAsset WHERE storyId IN (${placeholders})`,
    storyIds
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.storyId)) map.set(row.storyId, []);
    map.get(row.storyId).push(row);
  }
  return map;
}

async function loadAuthors(authorIds) {
  const ids = [...new Set(authorIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const rows = await query(
    `SELECT * FROM Author WHERE id IN (${placeholders})`,
    ids
  );
  return new Map(rows.map((a) => [a.id, a]));
}

async function loadTags(storyIds) {
  if (!storyIds.length) return new Map();
  const placeholders = storyIds.map(() => "?").join(",");
  const rows = await query(
    `SELECT st.storyId, t.id, t.slug, t.name
     FROM StoryTag st
     INNER JOIN Tag t ON t.id = st.tagId
     WHERE st.storyId IN (${placeholders})`,
    storyIds
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.storyId)) map.set(row.storyId, []);
    map.get(row.storyId).push({ tag: { id: row.id, slug: row.slug, name: row.name } });
  }
  return map;
}

async function attachStoryRelations(stories, { langFilter, assetSelect } = {}) {
  if (!stories.length) return [];
  const ids = stories.map((s) => s.id);

  const [locsMap, assetsMap, authorsMap, tagsMap] = await Promise.all([
    loadLocalizations(ids, langFilter),
    loadAssets(ids),
    loadAuthors(stories.map((s) => s.authorId)),
    loadTags(ids),
  ]);

  return stories.map((story) => {
    let assets = assetsMap.get(story.id) || [];
    if (assetSelect) {
      assets = assets.map((a) => {
        const picked = {};
        for (const key of assetSelect) {
          if (a[key] !== undefined) picked[key] = a[key];
        }
        return picked;
      });
    }

    return {
      ...story,
      localizations: locsMap.get(story.id) || [],
      assets,
      author: story.authorId ? authorsMap.get(story.authorId) || null : null,
      tags: tagsMap.get(story.id) || [],
    };
  });
}

module.exports = {
  attachStoryRelations,
  loadLocalizations,
  loadAssets,
  loadAuthors,
  loadTags,
};
