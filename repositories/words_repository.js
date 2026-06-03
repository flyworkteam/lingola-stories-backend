const { query } = require("../config/database");
const { createId } = require("../utils/id");

async function upsertUserWord(data) {
  const existing = await query(
    `SELECT * FROM UserWord
     WHERE userId = ? AND sourceLang = ? AND word = ? AND targetLang = ?
     LIMIT 1`,
    [data.userId, data.sourceLang, data.word, data.targetLang]
  );

  if (existing[0]) {
    await query(
      `UPDATE UserWord SET translation = ?, level = ?, isFav = ?, updatedAt = NOW(3) WHERE id = ?`,
      [
        data.translation ?? existing[0].translation,
        data.level ?? existing[0].level,
        data.isFav ?? true,
        existing[0].id,
      ]
    );
    const rows = await query("SELECT * FROM UserWord WHERE id = ?", [
      existing[0].id,
    ]);
    return rows[0];
  }

  const id = createId();
  await query(
    `INSERT INTO UserWord (id, userId, sourceLang, word, targetLang, translation, level, isFav, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
    [
      id,
      data.userId,
      data.sourceLang,
      data.word,
      data.targetLang,
      data.translation,
      data.level,
      data.isFav ?? true,
    ]
  );
  const rows = await query("SELECT * FROM UserWord WHERE id = ?", [id]);
  return rows[0];
}

async function countUserWords(userId, q) {
  let sql = "SELECT COUNT(*) as cnt FROM UserWord WHERE userId = ?";
  const params = [userId];

  if (q) {
    sql += " AND (word LIKE ? OR translation LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  const rows = await query(sql, params);
  return Number(rows[0]?.cnt ?? 0);
}

async function findUserWords({ userId, q, limit, offset }) {
  let sql = "SELECT * FROM UserWord WHERE userId = ?";
  const params = [userId];

  if (q) {
    sql += " AND (word LIKE ? OR translation LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += " ORDER BY level ASC, updatedAt DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  return query(sql, params);
}

async function updateUserWordById(id, data) {
  await query(
    `UPDATE UserWord SET word = ?, sourceLang = ?, translation = ?, targetLang = ?, updatedAt = NOW(3) WHERE id = ?`,
    [data.word, data.sourceLang, data.translation, data.targetLang, id]
  );
  const rows = await query("SELECT * FROM UserWord WHERE id = ?", [id]);
  return rows[0];
}

async function findUserWordByIdForUser(id, userId) {
  const rows = await query(
    "SELECT * FROM UserWord WHERE id = ? AND userId = ? LIMIT 1",
    [id, userId]
  );
  return rows[0] || null;
}

async function deleteUserWord(id) {
  await query("DELETE FROM UserWord WHERE id = ?", [id]);
}

async function countFavWords(userId) {
  const rows = await query(
    "SELECT COUNT(*) as cnt FROM UserWord WHERE userId = ? AND isFav = true",
    [userId]
  );
  return Number(rows[0]?.cnt ?? 0);
}

async function updateUserWordFav(id, isFav) {
  await query(
    "UPDATE UserWord SET isFav = ?, updatedAt = NOW(3) WHERE id = ?",
    [isFav, id]
  );
  const rows = await query("SELECT * FROM UserWord WHERE id = ?", [id]);
  return rows[0];
}

module.exports = {
  upsertUserWord,
  countUserWords,
  findUserWords,
  updateUserWordById,
  updateUserWordFav,
  findUserWordByIdForUser,
  deleteUserWord,
  countFavWords,
};
