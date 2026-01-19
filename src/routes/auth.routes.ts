import { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

export async function authRoutes(app: FastifyInstance) {
  app.post("/guest", AuthController.guestLogin);
  app.post("/google", AuthController.googleLogin);
  app.post("/apple", AuthController.appleLogin);
  app.post("/facebook", AuthController.facebookLogin);
}
