const Fastify = require("fastify");
const cors = require("@fastify/cors");
const jwt = require("@fastify/jwt");
const dotenv = require("dotenv");

dotenv.config();
require("./config/database");

const { authRoutes } = require("./routes/auth_routes");
const { userRoutes } = require("./routes/user_routes");
const storyRoutes = require("./routes/story_routes");
const { wordRoutes } = require("./routes/word_routes");
const libraryRoutes = require("./routes/library_routes");
const progressRoutes = require("./routes/progress_routes");
const homeRoutes = require("./routes/home_routes");
const { notificationRoutes } = require("./routes/notification_routes");

const app = Fastify({
  logger: true,
  bodyLimit: 10485760,
});

app.register(cors, { origin: true });

app.register(jwt, {
  secret: process.env.JWT_SECRET || "gizli-super-anahtar",
});

app.register(authRoutes, { prefix: "/auth" });
app.register(userRoutes);
app.register(storyRoutes, { prefix: "/stories" });
app.register(wordRoutes);
app.register(libraryRoutes);
app.register(progressRoutes);
app.register(homeRoutes);
app.register(notificationRoutes, { prefix: "/notifications" });

app.get("/", async () => {
  return { status: "OK", message: "Lingola Backend" };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3039;
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
