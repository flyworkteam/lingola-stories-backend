import { FastifyRequest, FastifyReply } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch (err) {
    // 401 dönmek daha doğru
    return reply.code(401).send(err);
  }
}

// ✅ Eski isimle import eden route'lar kırılmasın diye alias:
export const authMiddleware = authenticate;
