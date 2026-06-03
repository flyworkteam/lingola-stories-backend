const { StoryController } = require("../controllers/story_controller");
const { authMiddleware } = require("../middlewares/auth_middleware");

async function storyRoutes(fastify) {
  fastify.post("/generate-batch", StoryController.generateBatch);
  fastify.get("/", StoryController.getStories);
  fastify.get("/:id", StoryController.getStoryDetail);
  fastify.post(
    "/:id/rate",
    { preHandler: [authMiddleware] },
    StoryController.giveRating
  );
}

module.exports = storyRoutes;
