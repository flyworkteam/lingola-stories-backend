const axios = require("axios");
const https = require("https");
const storiesRepo = require("../repositories/stories_repository");

const N8N_TIMEOUT_MS = 20 * 60 * 1000;

class StoryService {
  static async generateBatchFromN8N() {
    const n8nUrl = process.env.N8N_URL;
    if (!n8nUrl) throw new Error("N8N_URL is not defined in .env");

    console.log(">>> Service: Triggering n8n workflow...");

    const response = await axios.post(
      n8nUrl,
      {},
      {
        timeout: N8N_TIMEOUT_MS,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      }
    );

    let rawData = response.data;
    if (Array.isArray(rawData)) {
      rawData = rawData[0];
    }

    const payload = rawData.json ? rawData.json : rawData;
    const n8nData = payload;

    if (!n8nData.stories || !Array.isArray(n8nData.stories)) {
      throw new Error("Invalid response from n8n: 'stories' array missing.");
    }

    console.log(
      `>>> Service: Received ${n8nData.stories.length} stories. Saving to DB...`
    );

    const result = await storiesRepo.saveStoriesBatch(n8nData);

    return { success: true, count: result, batchId: n8nData.batchId };
  }

  static async getAllStories(lang = "en") {
    return storiesRepo.findReadyStories(lang);
  }

  static async getStoryById(id, lang) {
    return storiesRepo.findStoryById(id, lang);
  }

  static async rateStory(userId, storyId, rating) {
    if (rating < 1 || rating > 5)
      throw new Error("Invalid rating score (must be 1-5)");

    return storiesRepo.upsertStoryRating(userId, storyId, rating);
  }
}

module.exports = { StoryService };
