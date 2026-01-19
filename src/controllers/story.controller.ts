import { FastifyRequest, FastifyReply } from "fastify";
import { StoryService } from "../services/story.service";

// DİKKAT: Başında 'export' olmalı
export class StoryController {
  // POST /generate-batch
  static async generateBatch(req: FastifyRequest, reply: FastifyReply) {
    try {
      const result = await StoryService.generateBatchFromN8N();
      return reply.send(result);
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({
        error: "Story generation failed",
        details: error.message,
      });
    }
  }

  // GET /stories
  // story.controller.ts

  // GET /stories
  static async getStories(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { lang } = req.query as { lang?: string };
      const stories = await StoryService.getAllStories(lang || "en"); // Varsayılan en
      return reply.send(stories);
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ error: "Could not fetch stories" });
    }
  }

  // GET /stories/:id
  static async getStoryDetail(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const { lang } = req.query as { lang?: string };
      const story = await StoryService.getStoryById(id, lang || "en");

      if (!story) return reply.status(404).send({ error: "Story not found" });
      return reply.send(story);
    } catch (error: any) {
      req.log.error(error);
      return reply.status(500).send({ error: "Could not fetch story details" });
    }
  }
  static async giveRating(req: FastifyRequest, reply: FastifyReply) {
    try {
      // 1. Kullanıcı ID'sini auth middleware'den alıyoruz
      const userId = (req as any).user.id;

      // 2. URL'den storyId, body'den rating değerini alıyoruz
      const { id } = req.params as { id: string };
      const { rating } = req.body as { rating: number };

      // 3. Servisi çağırıp işlemi yapıyoruz
      const result = await StoryService.rateStory(userId, id, rating);

      // 4. Başarılı yanıt ve güncel istatistikleri dönüyoruz
      return reply.send({
        success: true,
        message: "Rating saved",
        data: {
          averageRating: result.averageRating,
          ratingCount: result.ratingCount,
        },
      });
    } catch (error: any) {
      req.log.error(error);
      return reply.status(400).send({
        success: false,
        error: error.message,
      });
    }
  }
}
