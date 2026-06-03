const usersRepo = require("../repositories/users_repository");
const BunnyUtils = require("../utils/bunny_utils");

const UserService = {
  async updateAvatar(userId, base64Image) {
    try {
      const publicUrl = await BunnyUtils.uploadBase64(base64Image, "avatars");

      if (!publicUrl) {
        throw new Error("Görsel yükleme işlemi başarısız oldu.");
      }

      return await usersRepo.updateProfileAvatar(userId, publicUrl);
    } catch (error) {
      console.error("❌ [UserService] Avatar Yükleme Hatası:", error.message);
      throw error;
    }
  },

  async updateProfile(userId, data) {
    console.log("SERVICE DATA:", JSON.stringify(data, null, 2));
    return usersRepo.updateUserProfile(userId, data);
  },

  async deleteAccount(userId) {
    return usersRepo.deleteUser(userId);
  },
};

module.exports = { UserService };
