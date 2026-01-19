// routes/library.routes.ts
import type { FastifyInstance } from "fastify";
import { authenticate } from "../middlewares/auth.middleware";
import {
  addLibraryWordHandler,
  listLibraryWordsHandler,
  deleteLibraryWordHandler,
  toggleFavLibraryWordHandler,
  type AddBody,
  type ListQuery,
  type DeleteParams,
  type ToggleFavBody,
} from "../controllers/library.controller";

export default async function libraryRoutes(app: FastifyInstance) {
  app.log.info("✅ libraryRoutes registered");

  app.get<{ Querystring: ListQuery }>(
    "/api/library/words",
    { preHandler: [authenticate] },
    listLibraryWordsHandler
  );

  app.post<{ Body: AddBody }>(
    "/api/library/words",
    { preHandler: [authenticate] },
    addLibraryWordHandler
  );

  app.delete<{ Params: DeleteParams }>(
    "/api/library/words/:id",
    { preHandler: [authenticate] },
    deleteLibraryWordHandler
  );

  app.patch<{ Params: DeleteParams; Body: ToggleFavBody }>(
    "/api/library/words/:id/fav",
    { preHandler: [authenticate] },
    toggleFavLibraryWordHandler
  );
}
