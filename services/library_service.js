const axios = require("axios");
const wordsRepo = require("../repositories/words_repository");

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function trimSlash(s) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

async function callWordDbTranslate(params) {
  const WORD_DB_URL = process.env.WORD_DB_URL;
  const BASE_TOKEN = process.env.BASE_TOKEN;

  if (!WORD_DB_URL || !BASE_TOKEN) {
    throw httpError(500, "WORD_DB_URL / BASE_TOKEN env eksik");
  }

  const base = trimSlash(WORD_DB_URL);
  const candidates = [`${base}/api/words/translate`, `${base}/words/translate`];

  let lastErr = null;

  for (const url of candidates) {
    try {
      const res = await axios.get(url, {
        params,
        headers: { "x-api-token": BASE_TOKEN },
        timeout: 15_000,
      });
      return { url, data: res.data };
    } catch (e) {
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

async function addWordToLibrary(params) {
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

  const saved = await wordsRepo.upsertUserWord({
    userId: params.userId,
    sourceLang,
    word,
    targetLang,
    translation: translation ? String(translation) : null,
    level: detectedLevel ? String(detectedLevel) : null,
    isFav: params.isFav ?? true,
  });

  return { success: true, item: saved, wordDb: data.data };
}

async function listLibraryWords(params) {
  const q = (params.q ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const count = await wordsRepo.countUserWords(params.userId, q || undefined);
  const items = await wordsRepo.findUserWords({
    userId: params.userId,
    q: q || undefined,
    limit,
    offset,
  });

  if (!params.sourceLang && !params.targetLang) {
    return { success: true, count, items };
  }

  const reqSource = params.sourceLang?.trim().toLowerCase();
  const reqTarget = params.targetLang?.trim().toLowerCase();

  const updatedItems = await Promise.all(
    items.map(async (item) => {
      let wordToUpdate = item.word;
      let transToUpdate = item.translation;
      let sourceToUpdate = item.sourceLang;
      let targetToUpdate = item.targetLang;

      let hasChanges = false;

      if (reqSource && item.sourceLang !== reqSource) {
        try {
          const { data } = await callWordDbTranslate({
            word: item.word,
            sourceLang: item.sourceLang,
            targetLang: reqSource,
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

      if (reqTarget && item.targetLang !== reqTarget) {
        try {
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

      if (hasChanges) {
        try {
          return await wordsRepo.updateUserWordById(item.id, {
            word: wordToUpdate,
            sourceLang: sourceToUpdate,
            translation: transToUpdate,
            targetLang: targetToUpdate,
          });
        } catch (dbErr) {
          console.error("DB update failed during transformation", dbErr);
          return item;
        }
      }

      return item;
    })
  );

  return { success: true, count, items: updatedItems };
}

async function deleteLibraryWord(params) {
  const found = await wordsRepo.findUserWordByIdForUser(params.id, params.userId);
  if (!found) throw httpError(404, "Word not found");
  await wordsRepo.deleteUserWord(params.id);
  return { success: true };
}

async function toggleFavLibraryWord(params) {
  const row = await wordsRepo.findUserWordByIdForUser(params.id, params.userId);
  if (!row) throw httpError(404, "Word not found");
  const next = typeof params.isFav === "boolean" ? params.isFav : !row.isFav;
  const updated = await wordsRepo.updateUserWordFav(params.id, next);
  return { success: true, item: updated };
}

module.exports = {
  addWordToLibrary,
  listLibraryWords,
  deleteLibraryWord,
  toggleFavLibraryWord,
};
