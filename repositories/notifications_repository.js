const { query } = require("../config/database");
const { createId } = require("../utils/id");

function parseMessageField(message) {
  if (!message) return "";
  if (typeof message === "string") {
    try {
      const parsed = JSON.parse(message);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed;
      }
    } catch {
      return message;
    }
    return message;
  }
  return message;
}

function messageToString(message) {
  if (typeof message === "string") return message;
  return JSON.stringify(message);
}

function formatForClient(row, lang) {
  const raw = parseMessageField(row.message);
  let text = "";
  if (typeof raw === "string") {
    text = raw;
  } else if (raw && typeof raw === "object") {
    text = raw[lang] || raw.en || raw.tr || Object.values(raw)[0] || "";
  }

  return {
    id: row.id,
    type: row.type,
    title: row.title || "Lingola Stories",
    message: text,
    status: new Date(row.scheduledFor) <= new Date() ? "sent" : "scheduled",
    isRead: !!row.read,
    readAt: row.readAt,
    sentAt: row.scheduledFor,
    scheduledFor: row.scheduledFor,
    localNotificationId: row.externalId,
  };
}

async function createNotification(data) {
  const id = createId();
  const message = messageToString(data.message);

  await query(
    `INSERT INTO UserNotification (id, userId, type, title, message, scheduledFor, externalId, \`read\`, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, false, NOW(3))`,
    [
      id,
      data.userId,
      data.type,
      data.title,
      message,
      data.scheduledFor,
      data.externalId ?? null,
    ]
  );

  return id;
}

async function deleteNotification(userId, notificationId) {
  const result = await query(
    "DELETE FROM UserNotification WHERE id = ? AND userId = ?",
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}

async function deleteAllNotifications(userId) {
  const result = await query(
    "DELETE FROM UserNotification WHERE userId = ?",
    [userId]
  );
  return result.affectedRows;
}

async function markAsRead(userId, notificationId) {
  await query(
    "UPDATE UserNotification SET `read` = true, readAt = NOW(3) WHERE id = ? AND userId = ?",
    [notificationId, userId]
  );
}

async function markDueNotificationsAsRead(userId) {
  await query(
    `UPDATE UserNotification SET \`read\` = true, readAt = NOW(3)
     WHERE userId = ? AND \`read\` = false AND scheduledFor <= NOW(3)`,
    [userId]
  );
}

async function findDueNotifications(userId) {
  return query(
    `SELECT * FROM UserNotification
     WHERE userId = ? AND scheduledFor <= NOW(3)
     ORDER BY scheduledFor DESC`,
    [userId]
  );
}

async function countUnreadDue(userId) {
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM UserNotification
     WHERE userId = ? AND \`read\` = false AND scheduledFor <= NOW(3)`,
    [userId]
  );
  return Number(rows[0]?.cnt ?? 0);
}

async function deleteFutureNotifications(userId) {
  const result = await query(
    "DELETE FROM UserNotification WHERE userId = ? AND scheduledFor > NOW(3)",
    [userId]
  );
  return result.affectedRows;
}

module.exports = {
  createNotification,
  deleteNotification,
  deleteAllNotifications,
  markAsRead,
  markDueNotificationsAsRead,
  findDueNotifications,
  countUnreadDue,
  deleteFutureNotifications,
  formatForClient,
  parseMessageField,
};
