import { FastifyReply, FastifyRequest } from "fastify";
import { NotificationService } from "../services/notification.service";
import { NOTIFICATION_MESSAGES, NotificationType } from "../config/constants";
import { prisma } from "../utils/prisma";

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
  };
}

export class NotificationController {
  
  // 🟢 1. Oturum Kapandı -> Bildirimleri Planla
 // controllers/notification.controller.ts

static async endSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      // ⚠️ DÜZELTME: ID'yi Body'den değil, Token'dan al
      const request = req as AuthenticatedRequest;
      const userId = request.user?.id;

      // Token yoksa zaten middleware 401 atar ama yine de kontrol et
      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized: User ID not found in token" });
      }

      // Servis çağrısı
      NotificationService.scheduleSessionEndFlow(userId).catch(err => console.error(err));

      return { success: true, message: "Notifications scheduled successfully." };

    } catch (error) {
      console.error("Controller Error:", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  // 🟢 2. Oturum Başladı -> İptal Mantığını Çalıştır
static async startSession(req: FastifyRequest, reply: FastifyReply) {
    try {
      // ⚠️ DÜZELTME: ID'yi Token'dan al
      const request = req as AuthenticatedRequest;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      console.log(`[Session Start] ${userId} geri geldi. İptal süreci başlıyor...`);

      await NotificationService.cancelAllScheduled(userId);

      return { success: true, message: "Session started, pending notifications cancelled." };

    } catch (error) {
      console.error("Controller Error (startSession):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  // 🟢 3. Kullanıcının Bildirimlerini Getir
  static async getUserNotifications(req: FastifyRequest, reply: FastifyReply) {
    try {
      const request = req as AuthenticatedRequest;
      const userId = request.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // 🔥 1. ÖNCE GÜNCELLE: "Gelecek" olmayan ve "okunmamış" tüm bildirimleri 'read: true' yap
      try {
        await prisma.userNotification.updateMany({
          where: {
            userId: userId,
            read: false, // Sadece okunmamışları hedefle (performans için)
            scheduledFor: {
              lte: new Date(), // Sadece zamanı gelmiş olanları güncelle
            }
          },
          data: {
            read: true,
            readAt: new Date() // Şu anki saati bas
          }
        });
      } catch (err) {
        console.error("Auto-mark error:", err);
      }

      // 🔥 2. SONRA ÇEK: Artık veritabanında hepsi 'read: true' oldu.
      const notifications = await prisma.userNotification.findMany({
        where: {
          userId: userId,
          scheduledFor: {
            lte: new Date(), 
          },
        },
        orderBy: {
          scheduledFor: "desc",
        },
      });

      // Frontend'e giden veride artık 'read: true' olacak
      return notifications;

    } catch (error) {
      console.error("Controller Error (get):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  // 🟢 4. Tek Bir Bildirimi Sil
  static async deleteNotification(req: FastifyRequest, reply: FastifyReply) {
    try {
      const request = req as AuthenticatedRequest;
      const userId = request.user?.id;
      
      const params = req.params as { id: string };
      const notificationId = params.id;

      if (!userId) return reply.status(401).send({ error: "Unauthorized" });
      if (!notificationId) return reply.status(400).send({ error: "ID required" });

      const deleted = await NotificationService.deleteNotification(userId, notificationId);

      if (!deleted) {
        return reply.status(404).send({ error: "Notification not found or access denied" });
      }

      return { success: true, message: "Notification deleted" };
    } catch (error) {
      console.error("Controller Error (delete):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  // 🟢 5. Tüm Bildirimleri Sil
  static async deleteAllNotifications(req: FastifyRequest, reply: FastifyReply) {
    try {
      const request = req as AuthenticatedRequest;
      const userId = request.user?.id;

      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      const count = await NotificationService.deleteAllNotifications(userId);

      return { success: true, message: `${count} notifications deleted` };
    } catch (error) {
      console.error("Controller Error (deleteAll):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  // 🟢 6. Okundu İşaretle
  static async markAsRead(req: FastifyRequest, reply: FastifyReply) {
    try {
      const request = req as AuthenticatedRequest;
      const userId = request.user?.id;
      const params = req.params as { id: string };

      if (!userId) return reply.status(401).send({ error: "Unauthorized" });

      await NotificationService.markAsRead(userId, params.id);
      return { success: true };
    } catch (error) {
      console.error("Controller Error (markAsRead):", error);
      return reply.status(500).send({ error: "Internal Server Error" });
    }
  }

  
}