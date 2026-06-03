const { StoryService } = require("../services/story_service");

class StoryController {
  static async generateBatch(req, reply) {
    try {
      const result = await StoryService.generateBatchFromN8N();
      return reply.send(result);
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send({
        error: "Story generation failed",
        details: error.message,
      });
    }
  }

  static async getStories(req, reply) {
    try {
      const { lang } = req.query;
      const stories = await StoryService.getAllStories(lang || "en");
      return reply.send(stories);
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send({ error: "Could not fetch stories" });
    }
  }

  static async getStoryDetail(req, reply) {
    try {
      const { id } = req.params;
      const { lang } = req.query;
      const story = await StoryService.getStoryById(id, lang || "en");

      if (!story) return reply.status(404).send({ error: "Story not found" });
      return reply.send(story);
    } catch (error) {
      req.log.error(error);
      return reply.status(500).send({ error: "Could not fetch story details" });
    }
  }

  static async giveRating(req, reply) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { rating } = req.body;

      const result = await StoryService.rateStory(userId, id, rating);

      return reply.send({
        success: true,
        message: "Rating saved",
        data: {
          averageRating: result.averageRating,
          ratingCount: result.ratingCount,
        },
      });
    } catch (error) {
      req.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = { StoryController };
