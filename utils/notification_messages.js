const {
  NOTIFICATION_MESSAGES,
  NOTIFICATION_TITLES,
  SUPPORTED_LANGS,
} = require("../config/constants");

function normalizeLang(lang) {
  const code = String(lang || "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return SUPPORTED_LANGS.includes(code) ? code : "en";
}

function pickMessage(typeKey, lang) {
  const config = NOTIFICATION_MESSAGES[typeKey];
  if (!config) return "";

  const code = normalizeLang(lang);
  const pool = config[code] || config.en || config.tr;
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickTitle(lang) {
  const code = normalizeLang(lang);
  return NOTIFICATION_TITLES[code] || NOTIFICATION_TITLES.en;
}

module.exports = { normalizeLang, pickMessage, pickTitle };
