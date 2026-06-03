const { query, transaction } = require("../config/database");
const { connQuery } = require("./conn");
const { createId } = require("../utils/id");

async function findUserByDeviceId(deviceId) {
  const rows = await query("SELECT * FROM `User` WHERE deviceId = ? LIMIT 1", [
    deviceId,
  ]);
  return rows[0] || null;
}

async function findUserById(id) {
  const rows = await query("SELECT * FROM `User` WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function findUserForSocialLogin(provider, socialUser, effectiveEmail) {
  const conditions = ["email = ?"];
  const params = [effectiveEmail];

  if (provider === "google") {
    conditions.push("googleSub = ?");
    params.push(socialUser.providerId);
  } else if (provider === "apple") {
    conditions.push("appleSub = ?");
    params.push(socialUser.providerId);
  } else if (provider === "facebook") {
    conditions.push("facebookSub = ?");
    params.push(socialUser.providerId);
  }

  const sql = `SELECT * FROM \`User\` WHERE ${conditions.join(" OR ")} LIMIT 1`;
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function createGuestUser(deviceId) {
  const userId = createId();
  const profileId = createId();

  return transaction(async (conn) => {
    await connQuery(
      conn,
      `INSERT INTO \`User\` (id, deviceId, isPremium, createdAt)
       VALUES (?, ?, false, NOW(3))`,
      [userId, deviceId]
    );
    await connQuery(
      conn,
      `INSERT INTO ProfileData (id, userId, currentLevel, appLanguage, notificationsOn, isComplete, createdAt, updatedAt)
       VALUES (?, ?, 'A1', 'tr', false, false, NOW(3), NOW(3))`,
      [profileId, userId]
    );
    const users = await connQuery(conn, "SELECT * FROM `User` WHERE id = ?", [
      userId,
    ]);
    return users[0];
  });
}

async function createSocialUser(provider, socialUser, nameFromClient) {
  const userId = createId();
  const profileId = createId();
  const name = nameFromClient || socialUser.name || "Language Learner";

  const googleSub = provider === "google" ? socialUser.providerId : null;
  const appleSub = provider === "apple" ? socialUser.providerId : null;
  const facebookSub = provider === "facebook" ? socialUser.providerId : null;

  return transaction(async (conn) => {
    await connQuery(
      conn,
      `INSERT INTO \`User\` (id, email, googleSub, appleSub, facebookSub, isPremium, createdAt)
       VALUES (?, ?, ?, ?, ?, false, NOW(3))`,
      [userId, socialUser.email, googleSub, appleSub, facebookSub]
    );
    await connQuery(
      conn,
      `INSERT INTO ProfileData (id, userId, name, appLanguage, notificationsOn, isComplete, createdAt, updatedAt)
       VALUES (?, ?, ?, 'en', false, false, NOW(3), NOW(3))`,
      [profileId, userId, name]
    );
    const users = await connQuery(conn, "SELECT * FROM `User` WHERE id = ?", [
      userId,
    ]);
    return users[0];
  });
}

async function updateUserSocialIds(userId, provider, providerId) {
  const field =
    provider === "google"
      ? "googleSub"
      : provider === "apple"
        ? "appleSub"
        : "facebookSub";

  await query(`UPDATE \`User\` SET ${field} = ? WHERE id = ?`, [
    providerId,
    userId,
  ]);
  return findUserById(userId);
}

async function getUserWithRelations(userId) {
  const user = await findUserById(userId);
  if (!user) return null;

  const [profileRows, userWords, interests, targetLanguages] =
    await Promise.all([
      query("SELECT * FROM ProfileData WHERE userId = ? LIMIT 1", [userId]),
      query("SELECT * FROM UserWord WHERE userId = ?", [userId]),
      query("SELECT * FROM UserInterest WHERE userId = ?", [userId]),
      query("SELECT * FROM UserTargetLanguage WHERE userId = ?", [userId]),
    ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      isPremium: !!user.isPremium,
      createdAt: user.createdAt,
    },
    profile: profileRows[0] || null,
    userWords,
    interests: interests.map((item) => item.interest),
    targetLanguages: targetLanguages.map((item) => item.language),
  };
}

async function updateProfileAvatar(userId, avatarUrl) {
  await query(
    "UPDATE ProfileData SET avatarUrl = ?, updatedAt = NOW(3) WHERE userId = ?",
    [avatarUrl, userId]
  );
  const rows = await query("SELECT * FROM ProfileData WHERE userId = ? LIMIT 1", [
    userId,
  ]);
  return rows[0];
}

async function updateUserProfile(userId, data) {
  const { interests, targetLanguages, markComplete, ...profileFields } = data;

  return transaction(async (conn) => {
    const sets = [];
    const params = [];

    const allowed = [
      "name",
      "appLanguage",
      "currentLearningLanguage",
      "avatarUrl",
      "ageRange",
      "currentLevel",
      "listeningLevel",
      "dailyGoalMin",
      "notificationsOn",
    ];

    for (const key of allowed) {
      if (profileFields[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(profileFields[key]);
      }
    }

    if (markComplete) {
      sets.push("isComplete = true", "completedAt = NOW(3)");
    }

    if (sets.length > 0) {
      sets.push("updatedAt = NOW(3)");
      params.push(userId);
      await connQuery(
        conn,
        `UPDATE ProfileData SET ${sets.join(", ")} WHERE userId = ?`,
        params
      );
    }

    if (interests && interests.length > 0) {
      await connQuery(conn, "DELETE FROM UserInterest WHERE userId = ?", [
        userId,
      ]);
      for (const interest of interests) {
        await connQuery(
          conn,
          `INSERT INTO UserInterest (id, userId, interest, createdAt) VALUES (?, ?, ?, NOW(3))`,
          [createId(), userId, interest]
        );
      }
    }

    if (targetLanguages && targetLanguages.length > 0) {
      for (const language of targetLanguages) {
        await connQuery(
          conn,
          `INSERT IGNORE INTO UserTargetLanguage (id, userId, language, createdAt) VALUES (?, ?, ?, NOW(3))`,
          [createId(), userId, language]
        );
      }
    }

    if (profileFields.currentLearningLanguage) {
      const lang = profileFields.currentLearningLanguage;
      const existing = await connQuery(
        conn,
        "SELECT id FROM UserTargetLanguage WHERE userId = ? AND language = ? LIMIT 1",
        [userId, lang]
      );
      if (existing.length === 0) {
        await connQuery(
          conn,
          `INSERT INTO UserTargetLanguage (id, userId, language, createdAt) VALUES (?, ?, ?, NOW(3))`,
          [createId(), userId, lang]
        );
      }
    }

    const userRows = await connQuery(conn, "SELECT * FROM `User` WHERE id = ?", [
      userId,
    ]);
    const fullUser = userRows[0];
    if (!fullUser) throw new Error("User not found after update");

    const profileRows = await connQuery(
      conn,
      "SELECT * FROM ProfileData WHERE userId = ? LIMIT 1",
      [userId]
    );
    const interestRows = await connQuery(
      conn,
      "SELECT * FROM UserInterest WHERE userId = ?",
      [userId]
    );
    const langRows = await connQuery(
      conn,
      "SELECT * FROM UserTargetLanguage WHERE userId = ?",
      [userId]
    );

    return {
      user: {
        id: fullUser.id,
        email: fullUser.email,
        isPremium: !!fullUser.isPremium,
        createdAt: fullUser.createdAt,
      },
      profile: profileRows[0] || null,
      interests: interestRows.map((i) => i.interest),
      targetLanguages: langRows.map((t) => t.language),
    };
  });
}

async function deleteUser(userId) {
  await query("DELETE FROM `User` WHERE id = ?", [userId]);
}

async function userExists(userId) {
  const rows = await query("SELECT id FROM `User` WHERE id = ? LIMIT 1", [
    userId,
  ]);
  return rows.length > 0;
}

async function getProfileByUserId(userId) {
  const rows = await query(
    "SELECT * FROM ProfileData WHERE userId = ? LIMIT 1",
    [userId]
  );
  return rows[0] || null;
}

module.exports = {
  findUserByDeviceId,
  findUserById,
  findUserForSocialLogin,
  createGuestUser,
  createSocialUser,
  updateUserSocialIds,
  getUserWithRelations,
  updateProfileAvatar,
  updateUserProfile,
  deleteUser,
  userExists,
  getProfileByUserId,
};
