import axios from "axios";
import { prisma } from "../utils/prisma";
import { NOTIFICATION_MESSAGES, NotificationType, NotificationConfigItem } from "../config/constants";

// Test için 'minutes', Canlı için 'hours' mantığını yöneten basit bir ayar
const IS_TEST_MODE = true; 
const TIME_MULTIPLIER = IS_TEST_MODE ? 60 * 1000 : 60 * 60 * 1000; // Dakika vs Saat

export class NotificationService {
  private static ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID as string;
  private static ONESIGNAL_API_KEY = "os_v2_app_sadvpa2b6ffu5ig4ee2ndotcabdopjfjrijean54h3fbtdpx4boqtdlczga26sqptwj6tcpeyipy57xfdn2v7njnb34yzlyum66z5vy";

  /**
   * 🟢 SESSION END FLOW (ANA METOT)
   * Kullanıcı uygulamadan çıktığında bu metodu çağır.
   * Tüm bildirimleri sırasıyla ve döngüsel olarak planlar.
   */
  static async scheduleSessionEndFlow(userId: string) {
    console.log(`\n🚀 [Flow Start] ${userId} için bildirim akışı planlanıyor...`);

    // 1. Önce kullanıcının veritabanında var olup olmadığını kontrol et
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      console.warn(`⚠️ [DB Warning] User ID '${userId}' bulunamadı. Akış iptal.`);
      return;
    }

    const now = new Date();
    const orderedKeys: NotificationType[] = ["SOFT", "CURIOUS", "SUPPORT", "REMAINDER"];
    
    // En son planlanan zamanı tutmak için (Döngü için lazım olacak)
    let lastScheduledDelay = 0;

    // --- ADIM 1: STANDART 4 BİLDİRİMİ PLANLA ---
    for (const typeKey of orderedKeys) {
      const config = NOTIFICATION_MESSAGES[typeKey];
      
      // Zamanı hesapla (Şu an + Config Delay)
      const scheduledTime = new Date(now.getTime() + (config.delay * TIME_MULTIPLIER));
      
      await this._scheduleSingleNotification(userId, typeKey, config, scheduledTime);
      
      lastScheduledDelay = config.delay;
    }

    // --- ADIM 2: DÖNGÜ (LOOP) - 4. BİLDİRİMDEN SONRA ---
    // Kullanıcı dönmezse, son bildirimden sonra her "REMAINDER" süresinde (24 birim) bir atmaya devam et.
    // Örn: Test modunda 24dk, 48dk, 72dk sonra...
    // Sonsuz döngü olmaması için bir sınır koyalım (Örn: 5 tane daha ekstra at)
    const EXTRA_LOOP_COUNT = 5; 
    const LOOP_INTERVAL = NOTIFICATION_MESSAGES["REMAINDER"].delay; // 24 (saat veya dk)

    for (let i = 1; i <= EXTRA_LOOP_COUNT; i++) {
      const totalDelay = lastScheduledDelay + (i * LOOP_INTERVAL);
      const scheduledTime = new Date(now.getTime() + (totalDelay * TIME_MULTIPLIER));

      // Rastgele bir mesaj tipi seç (Sürekli aynı şeyi atmasın)
      const randomType = orderedKeys[Math.floor(Math.random() * orderedKeys.length)];
      const randomConfig = NOTIFICATION_MESSAGES[randomType];

      console.log(`🔄 [Loop ${i}] Ekstra bildirim planlanıyor: ${randomType}`);
      
      await this._scheduleSingleNotification(userId, randomType, randomConfig, scheduledTime);
    }

    console.log(`✅ [Flow End] Tüm planlamalar tamamlandı.`);
  }

  /**
   * 🛠️ YARDIMCI METOT: Tek bir bildirimi OneSignal'e ve DB'ye işler.
   * (Private yaptık çünkü dışarıdan tek tek çağrılmasını istemiyoruz, akış yönetsin)
   */
  private static async _scheduleSingleNotification(
    userId: string, 
    typeKey: NotificationType, 
    config: NotificationConfigItem,
    scheduledTime: Date
  ) {
    try {
      const messageTr = this.getRandomMessage(config.tr);
      const messageEn = this.getRandomMessage(config.en);
      const messageDe = this.getRandomMessage(config.de);

      // OneSignal Payload
      const payload = {
        app_id: this.ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        send_after: scheduledTime.toISOString(),
        contents: { tr: messageTr, en: messageEn, de: messageDe },
        headings: { en: "Lingola Stories", tr: "Lingola Stories", de: "Lingola Stories" },
        // Collapse ID ile aynı tür bildirimlerin üst üste binmesini engelle
        // Not: Loop bildirimlerinde collapse_id benzersiz olmalı ki birbirini ezmesin
        collapse_id: `${typeKey}_${userId}_${scheduledTime.getTime()}`,
        data: { type: typeKey, scheduled_for: userId }
      };

      console.log(`📤 [Plan] ${typeKey} -> ${scheduledTime.toISOString()} zamanına gönderiliyor...`);

      // 1. OneSignal İsteği
      const response = await axios.post(
        "https://onesignal.com/api/v1/notifications",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${this.ONESIGNAL_API_KEY}`,
          },
        }
      );

      // 2. DB Kaydı
      if (response.data && response.data.id) {
        await prisma.userNotification.create({
          data: {
            userId: userId,
            type: typeKey,
            title: "Lingola Stories",
            message: { tr: messageTr, en: messageEn, de: messageDe },
            scheduledFor: scheduledTime,
            externalId: response.data.id,
            read: false,
          }
        });
      }
    } catch (error: any) {
      console.error(`❌ [Error] ${typeKey} planlanırken hata:`, error.response?.data?.errors || error.message);
    }
  }

  // ... (Diğer Delete, Cancel, MarkAsRead metotların aynen kalacak) ...
  
  static async deleteNotification(userId: string, notificationId: string) {
    const result = await prisma.userNotification.deleteMany({
      where: { id: notificationId, userId: userId }
    });
    return result.count > 0;
  }

  static async deleteAllNotifications(userId: string) {
    const result = await prisma.userNotification.deleteMany({ where: { userId: userId } });
    return result.count;
  }

  static async markAsRead(userId: string, notificationId: string) {
    await prisma.userNotification.updateMany({
      where: { id: notificationId, userId: userId },
      data: { read: true, readAt: new Date() }
    });
  }

  static async cancelAllScheduled(userId: string) {
    console.log(`🛑 [Cancel] ${userId} iptal ediliyor...`);
    
    // OneSignal ve DB temizliği (Eski kodunla aynı)
    const pendingNotifications = await prisma.userNotification.findMany({
      where: {
        userId: userId,
        scheduledFor: { gt: new Date() },
        externalId: { not: null }
      },
      select: { externalId: true }
    });

    for (const notif of pendingNotifications) {
      if (notif.externalId) {
        try {
           await axios.delete(
            `https://onesignal.com/api/v1/notifications/${notif.externalId}?app_id=${this.ONESIGNAL_APP_ID}`,
            { headers: { Authorization: `Basic ${this.ONESIGNAL_API_KEY}` } }
          );
        } catch (e) {}
      }
    }

    const deleteResult = await prisma.userNotification.deleteMany({
      where: {
        userId: userId,
        scheduledFor: { gt: new Date() }
      }
    });

    console.log(`🧹 ${deleteResult.count} bildirim silindi.`);
    return true;
  }

  private static getRandomMessage(list: readonly string[]): string {
    return list[Math.floor(Math.random() * list.length)];
  }


  static async markAllAsRead(userId: string) {
    const result = await prisma.userNotification.updateMany({
      where: {
        userId: userId,
        read: false, // Sadece okunmamışları seç
        scheduledFor: {
          lte: new Date(), // Sadece zamanı gelmiş (gönderilmiş) olanları seç
        }
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });
    
    return result.count; // Kaç tanesinin güncellendiğini döner (Loglamak istersen)
  }
}