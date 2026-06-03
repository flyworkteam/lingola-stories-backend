const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const axios = require("axios");
const usersRepo = require("../repositories/users_repository");

function collectGoogleClientIds() {
  const fromSeparate = [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ];

  const ids = fromSeparate.map((id) => (id || "").trim()).filter(Boolean);

  if (ids.length > 0) return ids;

  // Eski tek satırlık GOOGLE_CLIENT_IDS (geriye dönük uyumluluk)
  return (process.env.GOOGLE_CLIENT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

const ALLOWED_CLIENT_IDS = collectGoogleClientIds();

if (ALLOWED_CLIENT_IDS.length === 0) {
  console.error(
    "[Auth] Google client id yok. .env içine GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID ekleyin."
  );
}

// google-auth-library v1/certs bazı sunucularda 403 veriyor; JWKS (v3) kullanıyoruz.
const googleJwksClient = jwksClient({
  jwksUri:
    process.env.GOOGLE_JWKS_URI ||
    "https://www.googleapis.com/oauth2/v3/certs",
  cache: true,
  cacheMaxAge: 60 * 60 * 1000,
  timeout: 30000,
  requestHeaders: {
    "User-Agent": "LingolaStories-Backend/1.0",
    Accept: "application/json",
  },
});

const appleClient = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

const AuthService = {
  async _verifyGoogle(token) {
    if (!token || typeof token !== "string") {
      throw new Error("Google idToken missing");
    }
    if (ALLOWED_CLIENT_IDS.length === 0) {
      throw new Error("Google client IDs not configured on server");
    }

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded?.header?.kid) {
      throw new Error("Invalid Google Token Structure");
    }

    const key = await googleJwksClient.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      algorithms: ["RS256"],
      audience: ALLOWED_CLIENT_IDS,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });

    return {
      email: verified.email,
      providerId: verified.sub,
      name: verified.name || verified.given_name || "Language Learner",
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
