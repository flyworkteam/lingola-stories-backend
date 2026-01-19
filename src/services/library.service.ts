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

  // ✅ bazı ortamlarda /api prefix var, bazılarında yok → ikisini de dene
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
      // 404 ise diğer path'i dene, diğer statuslarda direkt patlat
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

export async function addWordToLibrary(params: {
  userId: string;
  word: string;
  sourceLang: string;
  targetLang: string;
  level?: string;
  isFav?: boolean;
}) {
  const word = String(params.word ?? "")
    .trim()
    .toLowerCase();
  const sourceLang = String(params.sourceLang ?? "en")
    .trim()
    .toLowerCase();
  const targetLang = String(params.targetLang ?? "")
    .trim()
    .toLowerCase();

  if (!word) throw httpError(400, "word zorunlu");
  if (!targetLang) throw httpError(400, "targetLang zorunlu");

  // 1) Word DB'den çeviri datasını çek
  const { data } = await callWordDbTranslate({
    word,
    sourceLang,
    targetLang,
    level: params.level,
  });

  if (!data?.success || !data?.data) {
    throw httpError(404, data?.message || "Word DB: çeviri bulunamadı");
  }

  // docs response:
  // data: { id, verb, verbLang, level, source:{word,language}, target:{translation,pronunciation,language}}
  const payload = data.data;
  const translation = payload?.target?.translation ?? null;
  const detectedLevel = payload?.level ?? null;

  // 2) UserWord upsert
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

  return {
    success: true,
    item: saved,
    wordDb: data.data, // debug için iyi, istersen kaldırırız
  };
}

export async function listLibraryWords(params: {
  userId: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const q = (params.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const where: any = { userId: params.userId };

  if (q) {
    where.OR = [{ word: { contains: q } }, { translation: { contains: q } }];
  }

  const [count, items] = await Promise.all([
    prisma.userWord.count({ where }),
    prisma.userWord.findMany({
      where,
      orderBy: [
        { level: "asc" }, // 1. Önce Seviye (A0, A1, A2...)
        { updatedAt: "desc" }, // 2. Seviye içinde en son güncellenen en üstte
      ],
      skip: offset,
      take: limit,
    }),
  ]);

  return { success: true, count, items };
}

export async function deleteLibraryWord(params: {
  userId: string;
  id: string;
}) {
  const found = await prisma.userWord.findFirst({
    where: { id: params.id, userId: params.userId },
    select: { id: true },
  });

  if (!found) throw httpError(404, "Word not found");

  await prisma.userWord.delete({ where: { id: params.id } });

  return { success: true };
}

export async function toggleFavLibraryWord(params: {
  userId: string;
  id: string;
  isFav?: boolean; // undefined => toggle
}) {
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
