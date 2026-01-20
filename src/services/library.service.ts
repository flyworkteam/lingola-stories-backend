import axios from "axios";
import { prisma } from "../utils/prisma";

function httpError(statusCode: number, message: string) {
  const err = new Error(message) as any;
  err.statusCode = statusCode;
  return err;
}

function trimSlash(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

// ✅ Yardımcı Metot: Dış servise gidip çeviri yapar
async function callWordDbTranslate(params: {
  word: string;
  sourceLang: string;
  targetLang: string;
  level?: string;
}) {
  const WORD_DB_URL = process.env.WORD_DB_URL;
  const BASE_TOKEN = process.env.BASE_TOKEN;

  if (!WORD_DB_URL || !BASE_TOKEN) {
    throw httpError(500, "WORD_DB_URL / BASE_TOKEN env eksik");
  }

  const base = trimSlash(WORD_DB_URL);
  const candidates = [`${base}/api/words/translate`, `${base}/words/translate`];

  let lastErr: any = null;

  for (const url of candidates) {
    try {
      const res = await axios.get(url, {
        params,
        headers: { "x-api-token": BASE_TOKEN },
        timeout: 15_000,
      });
      return { url, data: res.data };
    } catch (e: any) {
      lastErr = e;
      const status = e?.response?.status;
      if (status === 404) continue;
      throw e;
    }
  }

  const status = lastErr?.response?.status ?? 404;
  const data = lastErr?.response?.data;

  throw httpError(
    status,
    data?.message ||
      data?.error ||
      "Word DB endpoint bulunamadı (path uyuşmuyor)"
  );
}

// ----------------------------------------------------------------------
// Ekleme, Silme, Fav Toggle metodları aynı kalıyor...
// ----------------------------------------------------------------------

export async function addWordToLibrary(params: {
  userId: string;
  word: string;
  sourceLang: string;
  targetLang: string;
  level?: string;
  isFav?: boolean;
}) {
  const word = String(params.word ?? "").trim().toLowerCase();
  const sourceLang = String(params.sourceLang ?? "en").trim().toLowerCase();
  const targetLang = String(params.targetLang ?? "").trim().toLowerCase();

  if (!word) throw httpError(400, "word zorunlu");
  if (!targetLang) throw httpError(400, "targetLang zorunlu");

  const { data } = await callWordDbTranslate({
    word,
    sourceLang,
    targetLang,
    level: params.level,
  });

  if (!data?.success || !data?.data) {
    throw httpError(404, data?.message || "Word DB: çeviri bulunamadı");
  }

  const payload = data.data;
  const translation = payload?.target?.translation ?? null;
  const detectedLevel = payload?.level ?? null;

  const saved = await prisma.userWord.upsert({
    where: {
      uniq_user_word_per_lang: {
        userId: params.userId,
        sourceLang,
        word,
        targetLang,
      },
    },
    create: {
      userId: params.userId,
      sourceLang,
      word,
      targetLang,
      translation: translation ? String(translation) : null,
      level: detectedLevel ? String(detectedLevel) : null,
      isFav: params.isFav ?? true,
    },
    update: {
      translation: translation ? String(translation) : undefined,
      level: detectedLevel ? String(detectedLevel) : undefined,
      isFav: params.isFav ?? true,
    },
  });

  return { success: true, item: saved, wordDb: data.data };
}

// 🔥🔥 TAMAMEN YENİLENEN LIST METHODU 🔥🔥
export async function listLibraryWords(params: {
  userId: string;
  q?: string;
  limit?: number;
  offset?: number;
  sourceLang?: string; // İstenen KELİME dili (Örn: Almanca)
  targetLang?: string; // İstenen ANLAM dili (Örn: Türkçe)
}) {
  const q = (params.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  // 1. FİLTRELEME YOK! Sadece User ID.
  const where: any = { userId: params.userId };

  if (q) {
    where.OR = [{ word: { contains: q } }, { translation: { contains: q } }];
  }

  // Veriyi çek
  const [count, items] = await Promise.all([
    prisma.userWord.count({ where }),
    prisma.userWord.findMany({
      where,
      orderBy: [{ level: "asc" }, { updatedAt: "desc" }],
      skip: offset,
      take: limit,
    }),
  ]);

  // Eğer frontend dil parametrelerini göndermediyse (veya boşsa) direkt dön.
  if (!params.sourceLang && !params.targetLang) {
    return { success: true, count, items };
  }
  
  const reqSource = params.sourceLang?.trim().toLowerCase();
  const reqTarget = params.targetLang?.trim().toLowerCase();

  // 2. DÖNÜŞTÜRME DÖNGÜSÜ
  const updatedItems = await Promise.all(
    items.map(async (item) => {
      let wordToUpdate = item.word;
      let transToUpdate = item.translation;
      let sourceToUpdate = item.sourceLang;
      let targetToUpdate = item.targetLang;
      
      let hasChanges = false;

      // ---------------------------------------------------------
      // A) KELİME DÖNÜŞÜMÜ (Örn: Apple[en] -> Apfel[de])
      // ---------------------------------------------------------
      if (reqSource && item.sourceLang !== reqSource) {
        try {
          console.log(`🔀 Word Transforming: '${item.word}' (${item.sourceLang} -> ${reqSource})`);
          
          // API'ye diyoruz ki: Bu kelimeyi al, 'reqSource' diline çevir.
          const { data } = await callWordDbTranslate({
            word: item.word,
            sourceLang: item.sourceLang,
            targetLang: reqSource, // Hedef dili buraya veriyoruz ki kelimeyi çevirsin
          });

          const newWord = data?.data?.target?.translation;
          
          if (newWord) {
            wordToUpdate = String(newWord).toLowerCase();
            sourceToUpdate = reqSource;
            hasChanges = true;
          }
        } catch (e) {
          console.error(`Failed to transform word '${item.word}'`, e);
        }
      }

      // ---------------------------------------------------------
      // B) ANLAM DÖNÜŞÜMÜ (Örn: Elma[tr] -> Manzana[es])
      // ---------------------------------------------------------
      if (reqTarget && item.targetLang !== reqTarget) {
        try {
          console.log(`🔀 Meaning Transforming: '${item.word}' (Meaning -> ${reqTarget})`);

          // API'ye diyoruz ki: Orijinal kelimeyi al, 'reqTarget' diline çevir.
          // NOT: Burada 'item.word' (orijinal) kullanıyoruz, henüz değişmiş olabilecek 'wordToUpdate'i değil.
          // Çünkü çeviri servisi orijinal kelimeyi daha iyi tanır.
          const { data } = await callWordDbTranslate({
            word: item.word,
            sourceLang: item.sourceLang,
            targetLang: reqTarget,
          });

          const newTrans = data?.data?.target?.translation;

          if (newTrans) {
            transToUpdate = String(newTrans);
            targetToUpdate = reqTarget;
            hasChanges = true;
          }
        } catch (e) {
           console.error(`Failed to transform meaning for '${item.word}'`, e);
        }
      }

      // ---------------------------------------------------------
      // C) DB GÜNCELLEME
      // ---------------------------------------------------------
      if (hasChanges) {
        try {
          // Güncellenmiş veriyi DB'ye yaz
          const updated = await prisma.userWord.update({
            where: { id: item.id },
            data: {
              word: wordToUpdate,
              sourceLang: sourceToUpdate,
              translation: transToUpdate,
              targetLang: targetToUpdate,
              // Eğer kelime değiştiyse seviyesi de değişebilir ama şimdilik tutuyoruz
            }
          });
          return updated;
        } catch (dbErr) {
           // Unique constraint hatası olabilir (çevrilen kelime zaten listede varsa)
           console.error("DB update failed during transformation", dbErr);
           return item; 
        }
      }

      return item;
    })
  );

  return { success: true, count, items: updatedItems };
}

export async function deleteLibraryWord(params: { userId: string; id: string }) {
  const found = await prisma.userWord.findFirst({
    where: { id: params.id, userId: params.userId },
    select: { id: true },
  });
  if (!found) throw httpError(404, "Word not found");
  await prisma.userWord.delete({ where: { id: params.id } });
  return { success: true };
}

export async function toggleFavLibraryWord(params: { userId: string; id: string; isFav?: boolean }) {
  const row = await prisma.userWord.findFirst({
    where: { id: params.id, userId: params.userId },
    select: { id: true, isFav: true },
  });
  if (!row) throw httpError(404, "Word not found");
  const next = typeof params.isFav === "boolean" ? params.isFav : !row.isFav;
  const updated = await prisma.userWord.update({
    where: { id: params.id },
    data: { isFav: next },
  });
  return { success: true, item: updated };
}