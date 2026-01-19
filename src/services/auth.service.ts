import { prisma } from "../utils/prisma";
import { FastifyInstance } from "fastify";
import { OAuth2Client } from "google-auth-library";
import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import axios from "axios";

const GOOGLE_CLIENT_IDS_STRING = process.env.GOOGLE_CLIENT_IDS || "";
const ALLOWED_CLIENT_IDS = GOOGLE_CLIENT_IDS_STRING.split(",").map((id) =>
  id.trim()
);
const googleClient = new OAuth2Client(ALLOWED_CLIENT_IDS[0]);

// Apple Key Client
const appleClient = jwksClient({
  jwksUri: "https://appleid.apple.com/auth/keys",
});

export const AuthService = {
  // --- SOSYAL DOĞRULAMA METODLARI ---

  async _verifyGoogle(token: string) {
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

  async _verifyApple(token: string) {
    const decodedToken = jwt.decode(token, { complete: true }) as any;
    if (!decodedToken) throw new Error("Invalid Apple Token Structure");

    const key = await appleClient.getSigningKey(decodedToken.header.kid);
    const signingKey = key.getPublicKey();

    const verified = jwt.verify(token, signingKey, {
      issuer: "https://appleid.apple.com",
      audience: process.env.APPLE_BUNDLE_ID, // .env'de tanımlı olmalı
      algorithms: ["RS256"],
    }) as any;

    return {
      email: verified.email,
      providerId: verified.sub,
      name: null, // Apple her zaman isim dönmez
    };
  },

  async _verifyFacebook(token: string) {
    const userUrl = `https://graph.facebook.com/me?fields=id,email,name&access_token=${token}`;
    const userRes = await axios.get(userUrl);
    if (!userRes.data.id) throw new Error("Facebook Token Invalid");

    return {
      email: userRes.data.email,
      providerId: userRes.data.id,
      name: userRes.data.name,
    };
  },

  // --- ANA LOGIN/REGISTER METODU ---

  async socialLogin(
    provider: "google" | "apple" | "facebook",
    idToken: string,
    nameFromClient?: string
  ) {
    let socialUser;

    // A. Sağlayıcıya göre doğrula
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

    // B. Kullanıcıyı Bul veya Oluştur
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: effectiveEmail },
          {
            googleSub:
              provider === "google" ? socialUser.providerId : undefined,
          },
          {
            appleSub: provider === "apple" ? socialUser.providerId : undefined,
          },
          {
            facebookSub:
              provider === "facebook" ? socialUser.providerId : undefined,
          },
        ].filter((condition) => Object.values(condition)[0] !== undefined),
      },
    });

    if (!user) {
      // YENİ KAYIT
      user = await prisma.user.create({
        data: {
          email: socialUser.email,
          googleSub: provider === "google" ? socialUser.providerId : null,
          appleSub: provider === "apple" ? socialUser.providerId : null,
          facebookSub: provider === "facebook" ? socialUser.providerId : null,
          isPremium: false,
          profile: {
            create: {
              name: nameFromClient || socialUser.name || "Language Learner",
              appLanguage: "en",
            },
          },
        },
      });
    } else {
      // MEVCUT KULLANICI - Eksik Social ID'leri bağla
      const updateData: any = {};
      if (provider === "google" && !user.googleSub)
        updateData.googleSub = socialUser.providerId;
      if (provider === "apple" && !user.appleSub)
        updateData.appleSub = socialUser.providerId;
      if (provider === "facebook" && !user.facebookSub)
        updateData.facebookSub = socialUser.providerId;

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
      }
    }

    return user;
  },

  // Misafir Girişi Lojiği
  async loginAsGuest(fastify: FastifyInstance, deviceId: string) {
    // 1. Bu cihaz ID'sine sahip kullanıcı var mı?
    let user = await prisma.user.findUnique({
      where: { deviceId },
    });

    // 2. Yoksa yeni oluştur
    if (!user) {
      user = await prisma.user.create({
        data: {
          deviceId,
          isPremium: false,
          profile: {
            create: {
              currentLevel: "A1", // Varsayılan seviye
              appLanguage: "tr", // Varsayılan dil
            },
          },
        },
      });
    }

    // 3. Token Oluştur (JWT)
    // Token içine userId ve email gömüyoruz
    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: "guest",
    });

    return { user, token };
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true, // Profil detaylarını da getir
        userWords: true, // Şimdilik kelimeleri de görelim

        interests: true, // ✅ UserInterest tablosunu getir
        targetLanguages: true, // ✅ UserTargetLanguage tablosunu getir
      },
    });
    return user;
  },
};
