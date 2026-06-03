const { authenticate } = require("../middlewares/auth_middleware");
const {
  addLibraryWordHandler,
  listLibraryWordsHandler,
  deleteLibraryWordHandler,
  toggleFavLibraryWordHandler,
} = require("../controllers/library_controller");

async function libraryRoutes(app) {
  app.log.info("✅ libraryRoutes registered");

  app.get(
    "/api/library/words",
    { preHandler: [authenticate] },
    listLibraryWordsHandler
  );

  app.post(
    "/api/library/words",
    { preHandler: [authenticate] },
    addLibraryWordHandler
  );

  app.delete(
    "/api/library/words/:id",
    { preHandler: [authenticate] },
    deleteLibraryWordHandler
  );

  app.patch(
    "/api/library/words/:id/fav",
    { preHandler: [authenticate] },
    toggleFavLibraryWordHandler
  );
}

module.exports = libraryRoutes;
