const { authenticate } = require("../middlewares/auth_middleware");
const {
  saveBookmarkProgressHandler,
  completeStoryHandler,
  getBookmarkProgressHandler,
  clearBookmarkProgressHandler,
} = require("../controllers/progress_controller");

async function progressRoutes(app) {
  app.get(
    "/api/stories/:storyId/progress/bookmark",
    { preHandler: [authenticate] },
    getBookmarkProgressHandler
  );

  app.patch(
    "/api/stories/:storyId/progress/bookmark",
    { preHandler: [authenticate] },
    saveBookmarkProgressHandler
  );

  app.post(
    "/api/stories/:storyId/progress/complete",
    { preHandler: [authenticate] },
    completeStoryHandler
  );

  app.delete(
    "/api/stories/:storyId/progress/bookmark",
    { preHandler: [authenticate] },
    clearBookmarkProgressHandler
  );
}

module.exports = progressRoutes;
