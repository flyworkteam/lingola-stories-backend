import axios from "axios";
import https from "https";
// 1. DÜZELTME: Süslü parantez içine aldık (Named Import)
import { prisma } from "../utils/prisma";
// 2. DÜZELTME: Tx tipi için Prisma namespace'ini import ettik
import { Prisma } from "@prisma/client";
import { N8NStoryResponse } from "../types/n8n.types";

const N8N_TIMEOUT_MS = 20 * 60 * 1000;

export class StoryService {
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
    const n8nData = payload as N8NStoryResponse;

    if (!n8nData.stories || !Array.isArray(n8nData.stories)) {
      throw new Error("Invalid response from n8n: 'stories' array missing.");
    }

    console.log(
      `>>> Service: Received ${n8nData.stories.length} stories. Saving to DB...`
    );

    // 3. DÜZELTME: tx parametresine tip verdik (Prisma.TransactionClient)
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const author = await tx.author.upsert({
          where: { id: "flywork" },
          update: {},
          create: { id: "flywork", name: "Lingola Studio", type: "studio" },
        });

        let savedCount = 0;

        for (const s of n8nData.stories) {
          await tx.story.create({
            data: {
              id: s.id,
              level: s.level,
              batchId: n8nData.batchId,
              status: s.status,
              totalWords: s.totalWords || 0,
              authorId: author.id,
              localizations: s.localizations, // Prisma 5.22 bu formatı destekler
              assets: s.assets,
              tags: s.tags,
            },
          });
          savedCount++;
        }
        return savedCount;
      }
    );

    return { success: true, count: result, batchId: n8nData.batchId };
  }

  // story.service.ts içindeki ilgili metodu güncelleyelim
  static async getAllStories(lang: string = "en") {
    return await prisma.story.findMany({
      where: { status: "ready" },
      orderBy: { createdAt: "desc" },
      include: {
        localizations: {
          where: { lang: lang }, // Sadece istenen dili getir
        },
        assets: true,
        author: true,
        tags: { include: { tag: true } },
      },
    });
  }

  static async getStoryById(id: string, lang: string) {
    // lang parametresi eklendi
    return await prisma.story.findUnique({
      where: { id },
      include: {
        localizations: {
          where: { lang: lang },
        },
        assets: true,
        author: true,
        tags: { include: { tag: true } },
      },
    });
  }

  // ✅ Hikaye oylama ve ortalama hesaplama servisi
  static async rateStory(userId: string, storyId: string, rating: number) {
    // 1-5 arası rating kontrolü
    if (rating < 1 || rating > 5)
      throw new Error("Invalid rating score (must be 1-5)");

    return await prisma.$transaction(async (tx) => {
      // 1. Kullanıcının bu hikayeye verdiği oyu kaydet veya güncelle (Upsert)
      await tx.storyRating.upsert({
        where: {
          storyId_userId: { storyId, userId },
        },
        update: { rating },
        create: { storyId, userId, rating },
      });

      // 2. Hikayeye ait tüm oyları çek
      const allRatings = await tx.storyRating.findMany({
        where: { storyId },
        select: { rating: true },
      });

      // 3. Ortalama ve toplam oy sayısını hesapla
      const ratingCount = allRatings.length;
      const totalScore = allRatings.reduce((acc, curr) => acc + curr.rating, 0);
      const averageRating = totalScore / ratingCount;

      // 4. Story tablosundaki istatistikleri güncelle
      return await tx.story.update({
        where: { id: storyId },
        data: {
          averageRating: parseFloat(averageRating.toFixed(2)), // Virgül sonrası 2 hane
          ratingCount: ratingCount,
        },
      });
    });
  }
}
