const { NotificationController } = require("../controllers/notification_controller");

async function notificationRoutes(fastify) {
  fastify.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.send(err);
    }
  });

  fastify.post("/session/end", NotificationController.endSession);
  fastify.post("/session/start", NotificationController.startSession);

  fastify.get("/", NotificationController.getUserNotifications);
  fastify.get("/history", NotificationController.getUserNotifications);
  fastify.get("/unread-count", NotificationController.getUnreadCount);

  fastify.delete("/", NotificationController.deleteAllNotifications);
  fastify.delete("/all", NotificationController.deleteAllNotifications);
  fastify.delete("/:id", NotificationController.deleteNotification);

  fastify.patch("/:id/read", NotificationController.markAsRead);
}

module.exports = { notificationRoutes };
