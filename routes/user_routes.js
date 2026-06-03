const { AuthController } = require("../controllers/auth_controller");
const { authenticate } = require("../middlewares/auth_middleware");
const { UserController } = require("../controllers/user_controller");

async function userRoutes(app) {
  app.get("/me", { onRequest: [authenticate] }, AuthController.getMe);

  app.post(
    "/me/avatar",
    { onRequest: [authenticate] },
    UserController.uploadAvatar
  );

  app.put(
    "/me/profile",
    { onRequest: [authenticate] },
    UserController.updateProfile
  );

  app.delete(
    "/me",
    { preHandler: [authenticate] },
    UserController.deleteAccount
  );
}

module.exports = { userRoutes };
