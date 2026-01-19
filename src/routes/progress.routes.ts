import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.middleware";
import {
  saveBookmarkProgressHandler,
  completeStoryHandler,
  getBookmarkProgressHandler,
  clearBookmarkProgressHandler,
} from "../controllers/progress.controller";

export default async function progressRoutes(app: FastifyInstance) {
  app.get(
    "/api/stories/:storyId/progress/bookmark",
    { preHandler: [authenticate] },
    getBookmarkProgressHandler
  );

  app.patch(
    "/api/stories/:storyId/progress/bookmark",
    { preHandler: [authenticate] },
    saveBookmarkProgressHandler
  );

  app.post(
    "/api/stories/:storyId/progress/complete",
    { preHandler: [authenticate] },
    completeStoryHandler
  );

  app.delete(
    "/api/stories/:storyId/progress/bookmark",
    { preHandler: [authenticate] },
    clearBookmarkProgressHandler
  );
}
