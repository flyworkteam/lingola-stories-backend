// src/config/constants.ts

export interface LocalizedMessages {
  // 🔥 DÜZELTME: string[] yerine 'readonly string[]' yapıyoruz
  readonly tr: readonly string[];
  readonly en: readonly string[];
  readonly de: readonly string[];
}

export interface NotificationConfigItem extends LocalizedMessages {
  readonly delay: number; // Buraya da readonly ekleyebilirsin (opsiyonel ama iyi olur)
}

// Mesaj tiplerini burada tanımlıyoruz
export const NOTIFICATION_MESSAGES = {
  SOFT: {
    delay: 2,
    tr: ["Biraz ara verdin.", "Hikâye orada kaldı.", "Buradayız, sayfa kapanmadı."],
    en: ["Took a little break.", "The story stayed right there.", "We're here, the page hasn't closed."],
    de: ["Eine kleine Pause gemacht.", "Die Geschichte ist dort geblieben.", "Wir sind hier, die Seite ist noch offen."],
  },
  CURIOUS: {
    delay: 4,
    tr: ["Hikâye tam bir yerde kaldı 👀", "Bir karakter seni bekliyor olabilir.", "Küçük bir bölüm yarım kaldı."],
    en: ["The story left off at a certain point 👀", "A character might be waiting for you.", "A small part remained unfinished."],
    de: ["Die Geschichte blieb an einer Stelle stehen 👀", "Ein Charakter wartet vielleicht auf dich.", "Ein kleiner Teil blieb unvollendet."],
  },
  SUPPORT: {
    delay: 8,
    tr: ["Bugün okumadıysan da sorun değil.", "Hikâyeler bekler.", "Zihnin dinlenmek istemiş olabilir."],
    en: ["It's okay if you haven't read today.", "Stories wait.", "Your mind might have wanted to rest."],
    de: ["Es ist okay, wenn du heute nicht gelesen hast.", "Geschichten warten.", "Dein Geist wollte sich vielleicht ausruhen."],
  },
  REMAINDER: {
    delay: 24,
    tr: ["Bir gün geçti. Hikâye burada.", "Kaldığın sayfa duruyor.", "Hikâye kaçmadı."],
    en: ["A day has passed. The story is here.", "The page you left is still there.", "The story didn't run away."],
    de: ["Ein Tag ist vergangen. Die Geschichte ist hier.", "Die Seite, auf der du aufgehört hast, ist noch da.", "Die Geschichte ist nicht weggelaufen."],
  },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_MESSAGES;