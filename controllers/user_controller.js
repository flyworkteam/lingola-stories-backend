const { z } = require("zod");
const { UserService } = require("../services/user_service");

const UserController = {
  async uploadAvatar(req, reply) {
    try {
      const user = req.user;
      if (!user || !user.id) {
        return reply.code(401).send({ error: "Yetkisiz" });
      }

      const avatarSchema = z.object({
        image: z.string({ required_error: "Görsel verisi (base64) gerekli" }),
      });

      const { image } = avatarSchema.parse(req.body);

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

  async updateProfile(req, reply) {
    try {
      console.log(
        "🔥 [CONTROLLER] Body Geldi:",
        JSON.stringify(req.body, null, 2)
      );

      const user = req.user;

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
        targetLanguages: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        markComplete: z.boolean().optional(),
      });

      const updateData = bodySchema.parse(req.body);

      console.log(
        "🔍 [CONTROLLER] Parse Edilen Data:",
        JSON.stringify(updateData, null, 2)
      );

      const result = await UserService.updateProfile(user.id, updateData);

      return reply.code(200).send(result);
    } catch (error) {
      console.error("💥 [CONTROLLER] Hata:", error);
      if (error instanceof z.ZodError) {
        return reply
          .code(400)
          .send({ error: "Veri hatası", details: error.format() });
      }
      return reply.code(500).send({ error: "Sunucu hatası" });
    }
  },

  async deleteAccount(req, reply) {
    try {
      const user = req.user;

      if (!user || !user.id) {
        return reply.code(401).send({ error: "Yetkisiz işlem" });
      }

      await UserService.deleteAccount(user.id);

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

module.exports = { UserController };
