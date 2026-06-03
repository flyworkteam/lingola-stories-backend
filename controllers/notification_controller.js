const { NotificationService } = require("../services/notification_service");
const notificationsRepo = require("../repositories/notifications_repository");

class NotificationController {
  static async endSession(req, reply) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return reply
          .status(401)
          .send({ error: "Unauthorized: User ID not found in token" });
      }

      const lang = req.body?.lang;
      const result = await NotificationService.scheduleSessionEndFlow(
        userId,
        lang
      );

      return {
        success: true,
        message: "Local notifications scheduled.",
        lang: result.lang,
        scheduled: result.scheduled,
      };
    } catch (error) {
      console.error("Controller Error (endSession):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  static async startSession(req, reply) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const result = await NotificationService.cancelAllScheduled(userId);

      return {
        success: true,
        message: "Pending local notifications cancelled.",
        cancelledCount: result.cancelledCount,
      };
    } catch (error) {
      console.error("Controller Error (startSession):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  static async getUserNotifications(req, reply) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      try {
        await notificationsRepo.markDueNotificationsAsRead(userId);
      } catch (err) {
        console.error("Auto-mark error:", err);
      }

      const lang = req.query?.lang;
      const data = await NotificationService.listNotifications(userId, lang);

      return { success: true, data };
    } catch (error) {
      console.error("Controller Error (get):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  static async getUnreadCount(req, reply) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const unreadCount = await NotificationService.getUnreadCount(userId);
      return { success: true, data: { unreadCount } };
    } catch (error) {
      console.error("Controller Error (unread):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  static async deleteNotification(req, reply) {
    try {
      const userId = req.user?.id;
      const notificationId = req.params.id;

      if (!userId) return reply.status(401).send({ error: "Unauthorized" });
      if (!notificationId) return reply.status(400).send({ error: "ID required" });

      const deleted = await NotificationService.deleteNotification(
        userId,
        notificationId
      );

      if (!deleted) {
        return reply
          .status(404)
          .send({ error: "Notification not found or access denied" });
      }

      return { success: true, message: "Notification deleted" };
    } catch (error) {
      console.error("Controller Error (delete):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  static async deleteAllNotifications(req, reply) {
    try {
      const userId = req.user?.id;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const count = await NotificationService.deleteAllNotifications(userId);

      return {
        success: true,
        message: `${count} notifications deleted`,
        data: { deletedCount: count },
      };
    } catch (error) {
      console.error("Controller Error (deleteAll):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  static async markAsRead(req, reply) {
    try {
      const userId = req.user?.id;
      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      await NotificationService.markAsRead(userId, req.params.id);
      return { success: true };
    } catch (error) {
      console.error("Controller Error (markAsRead):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }
}

module.exports = { NotificationController };
