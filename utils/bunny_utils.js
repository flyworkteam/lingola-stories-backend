const axios = require("axios");
const crypto = require("crypto");

class BunnyUtils {
  constructor() {
    this.apiKey = process.env.BUNNY_STORAGE_API_KEY;
    this.storageZone = process.env.BUNNY_STORAGE_ZONE;
    this.endpoint = process.env.BUNNY_STORAGE_ENDPOINT;
    this.pullZone = process.env.CDN_BASE_URL;
  }

  async uploadFromUrl(imageUrl, folder = "avatars") {
    if (!imageUrl) return null;

    try {
      console.log(`📤 [BunnyCDN] URL'den yükleniyor: ${imageUrl}`);

      const response = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const extension = this._getExtensionFromContentType(
        response.headers["content-type"]
      );

      return await this._uploadToStorage(response.data, folder, extension);
    } catch (error) {
      console.error("❌ [BunnyCDN] URL Yükleme Hatası:", error.message);
      return imageUrl;
    }
  }

  async uploadBase64(base64String, folder = "avatars") {
    if (!base64String) return null;

    try {
      console.log(`📤 [BunnyCDN] Base64 yükleniyor...`);

      let buffer;
      let extension = ".jpg";

      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

      if (matches && matches.length === 3) {
        const contentType = matches[1];
        extension = this._getExtensionFromContentType(contentType);
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(base64String, "base64");
      }

      return await this._uploadToStorage(buffer, folder, extension);
    } catch (error) {
      console.error("❌ [BunnyCDN] Base64 Yükleme Hatası:", error.message);
      return null;
    }
  }

  async _uploadToStorage(fileData, folder, extension) {
    if (!this.apiKey || !this.storageZone || !this.endpoint) {
      console.error(
        "❌ [BunnyCDN] Yapılandırma hatası: API Key veya Zone eksik."
      );
      return null;
    }

    const filename = `${crypto.randomUUID()}${extension}`;
    const uploadPath = `${folder}/${filename}`;
    const storageUrl = `https://${this.endpoint}/${this.storageZone}/${uploadPath}`;

    await axios.put(storageUrl, fileData, {
      headers: {
        AccessKey: this.apiKey,
        "Content-Type": "application/octet-stream",
      },
    });

    const publicUrl = `${this.pullZone}/${uploadPath}`;
    console.log(`✅ [BunnyCDN] Yükleme Başarılı: ${publicUrl}`);

    return publicUrl;
  }

  _getExtensionFromContentType(contentType) {
    if (!contentType) return ".jpg";
    const type = contentType.toLowerCase();
    if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
    if (type.includes("png")) return ".png";
    if (type.includes("webp")) return ".webp";
    if (type.includes("gif")) return ".gif";
    return ".jpg";
  }
}

module.exports = new BunnyUtils();
