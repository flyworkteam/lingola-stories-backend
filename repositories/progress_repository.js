const { query, transaction } = require("../config/database");
const { connQuery } = require("./conn");
const { createId } = require("../utils/id");
const { attachStoryRelations } = require("./story_relations");

async function upsertBookmarkProgress(data) {
  const existing = await query(
    "SELECT id FROM UserBookProgress WHERE userId = ? AND storyId = ? LIMIT 1",
    [data.userId, data.storyId]
  );

  if (existing[0]) {
    await query(
      `UPDATE UserBookProgress
       SET bookmarkWordIndex = ?, totalWords = ?, progressPercent = ?, status = 'reading', lastReadAt = NOW(3), updatedAt = NOW(3)
       WHERE userId = ? AND storyId = ?`,
      [
        data.bookmarkWordIndex,
        data.totalWords,
        data.progressPercent,
        data.userId,
        data.storyId,
      ]
    );
    const rows = await query(
      "SELECT * FROM UserBookProgress WHERE userId = ? AND storyId = ? LIMIT 1",
      [data.userId, data.storyId]
    );
    return rows[0];
  }

  const id = createId();
  await query(
    `INSERT INTO UserBookProgress (id, userId, storyId, bookmarkWordIndex, totalWords, progressPercent, status, lastReadAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 'reading', NOW(3), NOW(3), NOW(3))`,
    [
      id,
      data.userId,
      data.storyId,
      data.bookmarkWordIndex,
      data.totalWords,
      data.progressPercent,
    ]
  );
  const rows = await query("SELECT * FROM UserBookProgress WHERE id = ?", [id]);
  return rows[0];
}

async function completeStoryProgress(userId, storyId, totalWords) {
  return transaction(async (conn) => {
    const completionExisting = await connQuery(
      conn,
      "SELECT id FROM UserBookCompletion WHERE userId = ? AND storyId = ? LIMIT 1",
      [userId, storyId]
    );

    if (completionExisting.length > 0) {
      await connQuery(
        conn,
        "UPDATE UserBookCompletion SET completedAt = NOW(3) WHERE userId = ? AND storyId = ?",
        [userId, storyId]
      );
    } else {
      await connQuery(
        conn,
        `INSERT INTO UserBookCompletion (id, userId, storyId, completedAt, createdAt)
         VALUES (?, ?, ?, NOW(3), NOW(3))`,
        [createId(), userId, storyId]
      );
    }

    const progressExisting = await connQuery(
      conn,
      "SELECT id FROM UserBookProgress WHERE userId = ? AND storyId = ? LIMIT 1",
      [userId, storyId]
    );

    if (progressExisting.length > 0) {
      await connQuery(
        conn,
        `UPDATE UserBookProgress
         SET bookmarkWordIndex = ?, totalWords = ?, progressPercent = 100, status = 'completed', lastReadAt = NOW(3), updatedAt = NOW(3)
         WHERE userId = ? AND storyId = ?`,
        [totalWords, totalWords, userId, storyId]
      );
    } else {
      await connQuery(
        conn,
        `INSERT INTO UserBookProgress (id, userId, storyId, bookmarkWordIndex, totalWords, progressPercent, status, lastReadAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 100, 'completed', NOW(3), NOW(3), NOW(3))`,
        [createId(), userId, storyId, totalWords, totalWords]
      );
    }

    const completion = (
      await connQuery(
        conn,
        "SELECT * FROM UserBookCompletion WHERE userId = ? AND storyId = ? LIMIT 1",
        [userId, storyId]
      )
    )[0];
    const progress = (
      await connQuery(
        conn,
        "SELECT * FROM UserBookProgress WHERE userId = ? AND storyId = ? LIMIT 1",
        [userId, storyId]
      )
    )[0];

    return { completion, progress };
  });
}

async function getBookmark(userId, storyId) {
  const rows = await query(
    "SELECT bookmarkWordIndex FROM UserBookProgress WHERE userId = ? AND storyId = ? LIMIT 1",
    [userId, storyId]
  );
  return rows[0] || null;
}

async function deleteBookmark(userId, storyId) {
  await query(
    "DELETE FROM UserBookProgress WHERE userId = ? AND storyId = ?",
    [userId, storyId]
  );
}

async function findLastReadingProgress(userId) {
  const rows = await query(
    `SELECT * FROM UserBookProgress
     WHERE userId = ? AND status = 'reading'
     ORDER BY lastReadAt DESC LIMIT 1`,
    [userId]
  );
  if (!rows[0]) return null;

  const storyRows = await query("SELECT * FROM Story WHERE id = ? LIMIT 1", [
    rows[0].storyId,
  ]);
  if (!storyRows[0]) return { ...rows[0], story: null };

  const [story] = await attachStoryRelations([storyRows[0]], {
    assetSelect: ["assetType", "url"],
  });

  return { ...rows[0], story };
}

async function findProgressHistory(userId, limit) {
  const rows = await query(
    `SELECT * FROM UserBookProgress WHERE userId = ? ORDER BY lastReadAt DESC LIMIT ?`,
    [userId, limit]
  );
  if (!rows.length) return [];

  const storyIds = rows.map((r) => r.storyId);
  const placeholders = storyIds.map(() => "?").join(",");
  const storyRows = await query(
    `SELECT * FROM Story WHERE id IN (${placeholders})`,
    storyIds
  );
  const storiesWithRelations = await attachStoryRelations(storyRows, {
    assetSelect: ["assetType", "url"],
  });
  const storyMap = new Map(storiesWithRelations.map((s) => [s.id, s]));

  return rows.map((item) => ({
    ...item,
    story: storyMap.get(item.storyId) || null,
  }));
}

module.exports = {
  upsertBookmarkProgress,
  completeStoryProgress,
  getBookmark,
  deleteBookmark,
  findLastReadingProgress,
  findProgressHistory,
};
