import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import dotenv from "dotenv";

import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";
import storyRoutes from "./routes/story.routes";
import { wordRoutes } from "./routes/word.routes";
import libraryRoutes from "./routes/library.routes";
import progressRoutes from "./routes/progress.routes";
import homeRoutes from "./routes/home.routes";

import { notificationRoutes } from "./routes/notification.routes"; 

dotenv.config();

const app = Fastify({
  logger: true,
  bodyLimit: 10485760,
});

app.register(cors, { origin: true });

app.register(jwt, {
  secret: process.env.JWT_SECRET || "gizli-super-anahtar",
});

// Rotalar
app.register(authRoutes, { prefix: "/auth" });
app.register(userRoutes);
app.register(storyRoutes, { prefix: "/stories" });
app.register(wordRoutes);
app.register(libraryRoutes);
app.register(progressRoutes);
app.register(homeRoutes);

// ✅ YENİ EKLENEN ROTA KAYDI
// Bu sayede endpointler: /notifications/session/end şeklinde olacak
app.register(notificationRoutes, { prefix: "/notifications" });

app.get("/", async () => {
  return { status: "OK", message: "Lingola Backend" };
});

const start = async () => {
  try {
    const port = 3016;
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();