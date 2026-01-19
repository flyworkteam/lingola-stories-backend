import { prisma } from "../utils/prisma";
import BunnyUtils from "../utils/bunny.utils"; // ✅ 1. ADIM: Importu ekle

interface UpdateProfileInput {
  name?: string | null;
  appLanguage?: string | null;
  currentLearningLanguage?: string | null;
  currentLevel?: string | null;
  listeningLevel?: string | null;
  ageRange?: string | null;
  dailyGoalMin?: number | null;
  interests?: string[];
  targetLanguages?: string[];
  markComplete?: boolean;
}

export const UserService = {
  async updateAvatar(userId: string, base64Image: string) {
    try {
      // BunnyCDN'e yükle (avatars klasörüne)
      const publicUrl = await BunnyUtils.uploadBase64(base64Image, "avatars");

      if (!publicUrl) {
        throw new Error("Görsel yükleme işlemi başarısız oldu.");
      }

      // Veritabanını güncelle
      const updatedProfile = await prisma.profileData.update({
        where: { userId },
        data: { avatarUrl: publicUrl },
      });

      return updatedProfile;
    } catch (error: any) {
      console.error("❌ [UserService] Avatar Yükleme Hatası:", error.message);
      throw error;
    }
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    console.log("SERVICE DATA:", JSON.stringify(data, null, 2));
    const { interests, targetLanguages, markComplete, ...profileFields } = data;

    // Transaction sonucunu direkt return etmiyoruz, formatlayacağız.
    const result = await prisma.$transaction(async (tx) => {
      // A) Profil Tablosunu Güncelle
      await tx.profileData.update({
        where: { userId },
        data: {
          ...profileFields,
          isComplete: markComplete ? true : undefined,
          completedAt: markComplete ? new Date() : undefined,
        },
      });

      // B) İlgi Alanlarını Güncelle
      if (interests && interests.length > 0) {
        await tx.userInterest.deleteMany({ where: { userId } });
        await tx.userInterest.createMany({
          data: interests.map((i) => ({ userId, interest: i })),
        });
      }

      // C) Hedef Dilleri Güncelle (Ekleme Modu)
      if (targetLanguages && targetLanguages.length > 0) {
        await tx.userTargetLanguage.createMany({
          data: targetLanguages.map((l) => ({ userId, language: l })),
          skipDuplicates: true,
        });
      }

      // D) Current Language Upsert
      if (profileFields.currentLearningLanguage) {
        await tx.userTargetLanguage.upsert({
          where: {
            userId_language: {
              userId,
              language: profileFields.currentLearningLanguage,
            },
          },
          update: {},
          create: { userId, language: profileFields.currentLearningLanguage },
        });
      }

      // ✅ E) EN KRİTİK ADIM: FULL DATA ÇEKME
      // Güncelleme bitti. Şimdi Frontend'in beklediği "User + Profile" yapısını çekiyoruz.
      // update profil sonucunu değil, user üzerinden her şeyi çekiyoruz.

      const fullUser = await tx.user.findUnique({
        where: { id: userId },
        include: {
          profile: true,
          interests: true,
          targetLanguages: true,
        },
      });

      if (!fullUser) throw new Error("User not found after update");

      // F) Formatlama (Frontend /me yapısıyla BİREBİR AYNI olmalı)
      return {
        user: {
          id: fullUser.id,
          email: fullUser.email,
          isPremium: fullUser.isPremium, // Eğer User tablosunda varsa
          createdAt: fullUser.createdAt,
        },
        profile: fullUser.profile, // ProfileData objesi
        interests: fullUser.interests.map((i) => i.interest), // Sadece string array
        targetLanguages: fullUser.targetLanguages.map((t) => t.language), // Sadece string array
      };
    });

    return result;
  },

  async deleteAccount(userId: string) {
    // Prisma ile kullanıcıyı sil
    // Not: Schema.prisma dosyasında 'onDelete: Cascade' tanımlıysa
    // ilişkili profil, diller vs. otomatik silinir.
    // Değilse önce onları silmek gerekir.

    return await prisma.user.delete({
      where: { id: userId },
    });
  },
};
