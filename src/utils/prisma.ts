import { PrismaClient } from "@prisma/client";

// Prisma'yı en sade haliyle başlatıyoruz
// İçine boş bir obje {} veya log ayarlarını eklemek hatayı çözer.
export const prisma = new PrismaClient({
  log: ["info", "warn", "error"], // Terminalde hataları ve bilgileri görelim
});
