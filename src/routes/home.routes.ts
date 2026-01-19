import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.middleware";
import { getHomeHandler } from "../controllers/home.controller";

export default async function homeRoutes(app: FastifyInstance) {
  app.get("/api/home", { preHandler: [authenticate] }, getHomeHandler);
}
