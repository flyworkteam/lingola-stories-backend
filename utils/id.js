const crypto = require("crypto");

/** Prisma cuid() ile uyumlu kısa benzersiz ID */
function createId() {
  const t = Date.now().toString(36);
  const r = crypto.randomBytes(8).toString("hex");
  return `c${t}${r}`.slice(0, 25);
}

module.exports = { createId };
