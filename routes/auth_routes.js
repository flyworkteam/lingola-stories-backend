const { AuthController } = require("../controllers/auth_controller");

async function authRoutes(app) {
  app.post("/guest", AuthController.guestLogin);
  app.post("/google", AuthController.googleLogin);
  app.post("/apple", AuthController.appleLogin);
  app.post("/facebook", AuthController.facebookLogin);
}

module.exports = { authRoutes };
