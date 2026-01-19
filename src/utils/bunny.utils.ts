import axios, { AxiosResponse } from "axios";
import * as crypto from "crypto";

class BunnyUtils {
  private readonly apiKey: string | undefined;
  private readonly storageZone: string | undefined;
  private readonly endpoint: string | undefined;
  private readonly pullZone: string | undefined;

  constructor() {
    this.apiKey = process.env.BUNNY_STORAGE_API_KEY;
    this.storageZone = process.env.BUNNY_STORAGE_ZONE;
    this.endpoint = process.env.BUNNY_STORAGE_ENDPOINT;
    this.pullZone = process.env.CDN_BASE_URL;
  }

  /**
   * URL'den resmi indirir ve BunnyCDN'e yükler.
   */
  async uploadFromUrl(
    imageUrl: string | null | undefined,
    folder: string = "avatars"
  ): Promise<string | null> {
    if (!imageUrl) return null;

    try {
      console.log(`📤 [BunnyCDN] URL'den yükleniyor: ${imageUrl}`);

      const response: AxiosResponse<Buffer> = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });

      const extension = this._getExtensionFromContentType(
        response.headers["content-type"] as string
      );

      return await this._uploadToStorage(response.data, folder, extension);
    } catch (error: any) {
      console.error("❌ [BunnyCDN] URL Yükleme Hatası:", error.message);
      return imageUrl; // Hata durumunda orijinal linki dön
    }
  }

  /**
   * Base64 string'i dosyaya çevirip yükler
   * @param base64String - "data:image/jpeg;base64,..." formatında veya saf base64
   */
  async uploadBase64(
    base64String: string | null | undefined,
    folder: string = "avatars"
  ): Promise<string | null> {
    if (!base64String) return null;

    try {
      console.log(`📤 [BunnyCDN] Base64 yükleniyor...`);

      let buffer: Buffer;
      let extension: string = ".jpg";

      // Regex ile prefix ve content-type kontrolü
      const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

      if (matches && matches.length === 3) {
        const contentType = matches[1];
        extension = this._getExtensionFromContentType(contentType);
        buffer = Buffer.from(matches[2], "base64");
      } else {
        // Prefix yoksa varsayılan jpg
        buffer = Buffer.from(base64String, "base64");
      }

      return await this._uploadToStorage(buffer, folder, extension);
    } catch (error: any) {
      console.error("❌ [BunnyCDN] Base64 Yükleme Hatası:", error.message);
      return null;
    }
  }

  // --- Yardımcı Metodlar (Private) ---

  private async _uploadToStorage(
    fileData: Buffer,
    folder: string,
    extension: string
  ): Promise<string | null> {
    // Güvenlik Kontrolü
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

  private _getExtensionFromContentType(
    contentType: string | undefined
  ): string {
    if (!contentType) return ".jpg";
    const type = contentType.toLowerCase();
    if (type.includes("jpeg") || type.includes("jpg")) return ".jpg";
    if (type.includes("png")) return ".png";
    if (type.includes("webp")) return ".webp";
    if (type.includes("gif")) return ".gif";
    return ".jpg";
  }
}

export default new BunnyUtils();
