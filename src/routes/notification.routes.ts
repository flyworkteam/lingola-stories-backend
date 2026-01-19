import { FastifyInstance } from "fastify";
import { NotificationController } from "../controllers/notification.controller";

export async function notificationRoutes(fastify: FastifyInstance) {

  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });
  // POST /notifications/session/end
  fastify.post("/session/end", NotificationController.endSession);

  // POST /notifications/session/start
  fastify.post("/session/start", NotificationController.startSession);

  // Listele
  fastify.get("/", NotificationController.getUserNotifications);

  // Hepsini Sil
  fastify.delete("/", NotificationController.deleteAllNotifications);

  // Tekini Sil
  fastify.delete("/:id", NotificationController.deleteNotification);

  // Okundu İşaretle
  fastify.patch("/:id/read", NotificationController.markAsRead);
}