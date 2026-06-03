const { NOTIFICATION_MESSAGES } = require("../config/constants");
const { normalizeLang, pickMessage, pickTitle } = require("../utils/notification_messages");
const usersRepo = require("../repositories/users_repository");
const notificationsRepo = require("../repositories/notifications_repository");

const HOUR_MS = 60 * 60 * 1000;
const ORDERED_TYPES = ["SOFT", "CURIOUS", "SUPPORT", "REMAINDER"];

class NotificationService {
  static async resolveLang(userId, langFromClient) {
    if (langFromClient) return normalizeLang(langFromClient);

    const profile = await usersRepo.getProfileByUserId(userId);
    return normalizeLang(profile?.appLanguage);
  }

  /**
   * Oturum bitti — DB'ye kaydet, istemci yerel bildirim planlasın
   */
  static async scheduleSessionEndFlow(userId, langFromClient) {
    console.log(`\n🚀 [Local] ${userId} için yerel bildirim planı oluşturuluyor...`);

    const exists = await usersRepo.userExists(userId);
    if (!exists) {
      console.warn(`⚠️ User '${userId}' bulunamadı.`);
      return { scheduled: [] };
    }

    const profile = await usersRepo.getProfileByUserId(userId);
    if (!profile?.notificationsOn) {
      console.log(`🔕 [Local] ${userId} bildirimler kapalı, plan yapılmıyor.`);
      const lang = await NotificationService.resolveLang(userId, langFromClient);
      return { scheduled: [], lang };
    }

    const lang = await NotificationService.resolveLang(userId, langFromClient);
    const now = Date.now();
    const scheduled = [];

    for (const typeKey of ORDERED_TYPES) {
      const config = NOTIFICATION_MESSAGES[typeKey];
      const scheduledTime = new Date(now + config.delayHours * HOUR_MS);
      const body = pickMessage(typeKey, lang);
      const title = pickTitle(lang);
      const localNotificationId = `${typeKey}_${userId}_${scheduledTime.getTime()}`;

      const id = await notificationsRepo.createNotification({
        userId,
        type: typeKey,
        title,
        message: body,
        scheduledFor: scheduledTime,
        externalId: localNotificationId,
      });

      scheduled.push({
        id,
        localNotificationId,
        type: typeKey,
        tone: config.tone,
        title,
        body,
        lang,
        scheduledAt: scheduledTime.toISOString(),
        delayHours: config.delayHours,
      });

      console.log(
        `📅 [Local] ${typeKey} (+${config.delayHours}h) → ${scheduledTime.toISOString()}`
      );
    }

    console.log(`✅ [Local] ${scheduled.length} bildirim planlandı (${lang}).`);
    return { scheduled, lang };
  }

  static async cancelAllScheduled(userId) {
    console.log(`🛑 [Local] ${userId} gelecek bildirimleri iptal ediliyor...`);
    const count = await notificationsRepo.deleteFutureNotifications(userId);
    console.log(`🧹 ${count} kayıt silindi.`);
    return { cancelledCount: count };
  }

  static formatNotificationRow(row, lang) {
    return notificationsRepo.formatForClient(row, lang);
  }

  static async listNotifications(userId, langFromClient) {
    const lang = await NotificationService.resolveLang(userId, langFromClient);
    const rows = await notificationsRepo.findDueNotifications(userId);
    return rows.map((row) => NotificationService.formatNotificationRow(row, lang));
  }

  static async deleteNotification(userId, notificationId) {
    return notificationsRepo.deleteNotification(userId, notificationId);
  }

  static async deleteAllNotifications(userId) {
    return notificationsRepo.deleteAllNotifications(userId);
  }

  static async markAsRead(userId, notificationId) {
    await notificationsRepo.markAsRead(userId, notificationId);
  }

  static async getUnreadCount(userId) {
    return notificationsRepo.countUnreadDue(userId);
  }
}

module.exports = { NotificationService };
