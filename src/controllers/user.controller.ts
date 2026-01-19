import { FastifyReply, FastifyRequest } from "fastify";
import { UserService } from "../services/user.service";
import { z } from "zod";

export const UserController = {
  async uploadAvatar(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = req.user as { id: string } | null;
      if (!user || !user.id) {
        return reply.code(401).send({ error: "Yetkisiz" });
      }

      // Base64 string doğrulaması
      const avatarSchema = z.object({
        image: z.string({ required_error: "Görsel verisi (base64) gerekli" }),
      });

      const { image } = avatarSchema.parse(req.body);

      // Servisi çağır
      const updatedProfile = await UserService.updateAvatar(user.id, image);

      return reply.code(200).send({
        success: true,
        message: "Profil fotoğrafı başarıyla güncellendi.",
        data: {
          avatarUrl: updatedProfile.avatarUrl,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: "Geçersiz görsel formatı" });
      }
      console.error("💥 [UPLOAD AVATAR] Hata:", error);
      return reply
        .code(500)
        .send({ error: "Fotoğraf yüklenirken hata oluştu." });
    }
  },

  async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    try {
      // 👇 1. İSTEK GELDİĞİNDE BURAYA DÜŞÜYOR MU?
      console.log(
        "🔥 [CONTROLLER] Body Geldi:",
        JSON.stringify(req.body, null, 2)
      );

      const user = req.user as { id: string } | null;

      if (!user || !user.id) {
        console.log("❌ [CONTROLLER] User Yok!");
        return reply.code(401).send({ error: "Yetkisiz" });
      }

      const bodySchema = z.object({
        name: z.string().optional().nullable(),
        appLanguage: z.string().optional().nullable(),
        currentLearningLanguage: z.string().optional().nullable(),
        currentLevel: z.string().optional().nullable(),
        ageRange: z.string().optional().nullable(),
        listeningLevel: z.string().optional().nullable(),
        dailyGoalMin: z.number().optional().nullable(),
        targetLanguages: z.array(z.string()).optional(), // ✅ Burada olduğundan emin ol
        interests: z.array(z.string()).optional(),
        markComplete: z.boolean().optional(),
      });

      const updateData = bodySchema.parse(req.body);

      // 👇 2. PARSE EDİLEN VERİDE targetLanguages VAR MI?
      console.log(
        "🔍 [CONTROLLER] Parse Edilen Data:",
        JSON.stringify(updateData, null, 2)
      );

      const result = await UserService.updateProfile(
        user.id,
        updateData as any
      );

      return reply.code(200).send(result);
    } catch (error) {
      console.error("💥 [CONTROLLER] Hata:", error); // Hatayı terminale bas
      if (error instanceof z.ZodError) {
        return reply
          .code(400)
          .send({ error: "Veri hatası", details: error.format() });
      }
      return reply.code(500).send({ error: "Sunucu hatası" });
    }
  },

  async deleteAccount(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = req.user as { id: string } | null;

      if (!user || !user.id) {
        return reply.code(401).send({ error: "Yetkisiz işlem" });
      }

      await UserService.deleteAccount(user.id);

      // Başarılı cevap dön
      return reply.code(200).send({
        success: true,
        message: "Hesap başarıyla silindi.",
      });
    } catch (error) {
      console.error("💥 [DELETE ACCOUNT] Hata:", error);
      return reply.code(500).send({ error: "Hesap silinirken hata oluştu." });
    }
  },
};
