const { z } = require("zod");
const { AuthService } = require("../services/auth_service");

const AuthController = {
  async guestLogin(req, reply) {
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

  async googleLogin(req, reply) {
    try {
      const { idToken } = req.body;
      const user = await AuthService.socialLogin("google", idToken);
      return AuthController._generateTokenAndSend(req, reply, user);
    } catch (error) {
      return reply.code(401).send({ error: "Google girişi başarısız" });
    }
  },

  async appleLogin(req, reply) {
    try {
      const { idToken, name } = req.body;
      const user = await AuthService.socialLogin("apple", idToken, name);
      return AuthController._generateTokenAndSend(req, reply, user);
    } catch (error) {
      return reply.code(401).send({ error: "Apple girişi başarısız" });
    }
  },

  async facebookLogin(req, reply) {
    try {
      const { accessToken } = req.body;
      const user = await AuthService.socialLogin("facebook", accessToken);
      return AuthController._generateTokenAndSend(req, reply, user);
    } catch (error) {
      return reply.code(401).send({ error: "Facebook girişi başarısız" });
    }
  },

  _generateTokenAndSend(req, reply, user) {
    const token = req.server.jwt.sign({
      id: user.id,
      email: user.email,
      isPremium: user.isPremium,
    });
    return reply.code(200).send({ token, user });
  },

  async getMe(req, reply) {
    try {
      const user = req.user;
      const me = await AuthService.getMe(user.id);
      return reply.code(200).send(me);
    } catch (error) {
      return reply.code(401).send({ error: "Kullanıcı bulunamadı" });
    }
  },
};

module.exports = { AuthController };
