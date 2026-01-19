import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { UserController } from "../controllers/user.controller"; // ✅ EKLENDİ

export async function userRoutes(app: FastifyInstance) {
  // Flutter direkt '/me'ye istek atıyor, biz de onu burada karşılıyoruz
  // Prefix olmadığı için direkt http://localhost:3000/me çalışacak
  app.get("/me", { onRequest: [authenticate] }, AuthController.getMe);

  app.post(
    "/me/avatar",
    { onRequest: [authenticate] },
    UserController.uploadAvatar
  );

  app.put(
    "/me/profile",
    { onRequest: [authenticate] },
    UserController.updateProfile
  );

  app.delete(
    "/me",
    { preHandler: [authenticate] },
    UserController.deleteAccount
  );
}
