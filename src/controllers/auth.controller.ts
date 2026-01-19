import { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../services/auth.service";
import { z } from "zod";

export const AuthController = {
  // Misafir Girişi
  async guestLogin(req: FastifyRequest, reply: FastifyReply) {
    console.log("istek geldi ");
    try {
      const bodySchema = z.object({
        deviceId: z.string().min(3),
      });
      const { deviceId } = bodySchema.parse(req.body);
      const result = await AuthService.loginAsGuest(req.server, deviceId);
      return reply.code(200).send(result);
    } catch (error) {
      req.log.error(error);
      return reply
        .code(400)
        .send({ error: "Giriş yapılamadı", details: error });
    }
  },

  async googleLogin(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { idToken } = req.body as { idToken: string };
      const user = await AuthService.socialLogin("google", idToken);
      // ✅ `this` yerine `AuthController` kullanıyoruz
      return AuthController._generateTokenAndSend(req, reply, user);
    } catch (error) {
      return reply.code(401).send({ error: "Google girişi başarısız" });
    }
  },

  async appleLogin(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { idToken, name } = req.body as { idToken: string; name?: string };
      const user = await AuthService.socialLogin("apple", idToken, name);
      return AuthController._generateTokenAndSend(req, reply, user);
    } catch (error) {
      return reply.code(401).send({ error: "Apple girişi başarısız" });
    }
  },

  async facebookLogin(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { accessToken } = req.body as { accessToken: string };
      const user = await AuthService.socialLogin("facebook", accessToken);
      return AuthController._generateTokenAndSend(req, reply, user);
    } catch (error) {
      return reply.code(401).send({ error: "Facebook girişi başarısız" });
    }
  },

  // Ortak Token Üretici (Helper)
  _generateTokenAndSend(req: FastifyRequest, reply: FastifyReply, user: any) {
    const token = req.server.jwt.sign({
      id: user.id,
      email: user.email,
      isPremium: user.isPremium,
    });
    return reply.code(200).send({ token, user });
  },

  async getMe(req: FastifyRequest, reply: FastifyReply) {
    try {
      const user = req.user as { id: string; email: string };
      const me = await AuthService.getMe(user.id);
      return reply.code(200).send(me);
    } catch (error) {
      return reply.code(401).send({ error: "Kullanıcı bulunamadı" });
    }
  },
};
