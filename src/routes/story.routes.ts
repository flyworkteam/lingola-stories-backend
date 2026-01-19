import { FastifyInstance } from "fastify";
// Süslü parantez ile import ediyoruz
import { StoryController } from "../controllers/story.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

export default async function storyRoutes(fastify: FastifyInstance) {
  fastify.post("/generate-batch", StoryController.generateBatch);
  fastify.get("/", StoryController.getStories);
  fastify.get("/:id", StoryController.getStoryDetail);
  fastify.post(
    "/:id/rate",
    { preHandler: [authMiddleware] },
    StoryController.giveRating
  );
}
