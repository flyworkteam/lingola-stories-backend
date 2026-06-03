const { authenticate } = require("../middlewares/auth_middleware");
const { getHomeHandler } = require("../controllers/home_controller");

async function homeRoutes(app) {
  app.get("/api/home", { preHandler: [authenticate] }, getHomeHandler);
}

module.exports = homeRoutes;
