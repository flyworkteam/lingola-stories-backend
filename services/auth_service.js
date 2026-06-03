const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const axios = require("axios");
const usersRepo = require("../repositories/users_repository");

const GOOGLE_CLIENT_IDS_STRING = process.env.GOOGLE_CLIENT_IDS || "";
const ALLOWED_CLIENT_IDS = GOOGLE_CLIENT_IDS_STRING.split(",").map((id) =>
  id.trim()
);
const googleClient = new OAuth2Client(ALLOWED_CLIENT_IDS[0]);

const appleClient = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

const AuthService = {
  async _verifyGoogle(token) {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: ALLOWED_CLIENT_IDS,
    });
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Google Payload Empty");
    return {
      email: payload.email,
      providerId: payload.sub,
      name: payload.name || payload.given_name || "Language Learner",
    };
  },

  async _verifyApple(token) {
    const decodedToken = jwt.decode(token, { complete: true });
    if (!decodedToken) throw new Error("Invalid Apple Token Structure");

    const key = await appleClient.getSigningKey(decodedToken.header.kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_BUNDLE_ID,
      algorithms: ["RS256"],
    });

    return {
      email: verified.email,
      providerId: verified.sub,
      name: null,
    };
  },

  async _verifyFacebook(token) {
    const userUrl = `https://graph.facebook.com/me?fields=id,email,name&access_token=${token}`;
    const userRes = await axios.get(userUrl);
    if (!userRes.data.id) throw new Error("Facebook Token Invalid");

    return {
      email: userRes.data.email,
      providerId: userRes.data.id,
      name: userRes.data.name,
    };
  },

  async socialLogin(provider, idToken, nameFromClient) {
    let socialUser;

    if (provider === "google")
      socialUser = await AuthService._verifyGoogle(idToken);
    else if (provider === "apple")
      socialUser = await AuthService._verifyApple(idToken);
    else if (provider === "facebook")
      socialUser = await AuthService._verifyFacebook(idToken);
    else throw new Error("Unsupported provider");

    const effectiveEmail =
      socialUser.email ||
      `${provider}_${socialUser.providerId}@storylang.internal`;

    let user = await usersRepo.findUserForSocialLogin(
      provider,
      socialUser,
      effectiveEmail
    );

    if (!user) {
      user = await usersRepo.createSocialUser(
        provider,
        socialUser,
        nameFromClient
      );
    } else {
      const needsUpdate =
        (provider === "google" && !user.googleSub) ||
        (provider === "apple" && !user.appleSub) ||
        (provider === "facebook" && !user.facebookSub);

      if (needsUpdate) {
        user = await usersRepo.updateUserSocialIds(
          user.id,
          provider,
          socialUser.providerId
        );
      }
    }

    return user;
  },

  async loginAsGuest(fastify, deviceId) {
    let user = await usersRepo.findUserByDeviceId(deviceId);

    if (!user) {
      user = await usersRepo.createGuestUser(deviceId);
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: "guest",
    });

    return { user, token };
  },

  async getMe(userId) {
    return usersRepo.getUserWithRelations(userId);
  },
};

module.exports = { AuthService };
