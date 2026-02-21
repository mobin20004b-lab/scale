import crypto from "crypto";

const REAUTH_TTL_SECONDS = 5 * 60;
const REAUTH_COOKIE_NAME = "scale_reauth";

const getSecret = () => process.env.NEXTAUTH_SECRET || "dev-scale-secret";

const signPayload = (payload: string) =>
  crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");

export const createRecentReauthCookie = (userId: string) => {
  const expiresAt = Math.floor(Date.now() / 1000) + REAUTH_TTL_SECONDS;
  const payload = `${userId}:${expiresAt}`;
  const signature = signPayload(payload);

  return {
    name: REAUTH_COOKIE_NAME,
    value: `${payload}:${signature}`,
    maxAge: REAUTH_TTL_SECONDS,
  };
};

export const hasValidRecentReauth = (
  cookieValue: string | undefined,
  userId: string
) => {
  if (!cookieValue) return false;

  const [tokenUserId, expiresAt, signature] = cookieValue.split(":");
  if (!tokenUserId || !expiresAt || !signature) return false;
  if (tokenUserId !== userId) return false;

  const payload = `${tokenUserId}:${expiresAt}`;
  const expectedSignature = signPayload(payload);

  const received = Buffer.from(signature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");
  if (received.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(received, expected)) return false;

  const exp = Number(expiresAt);
  if (!Number.isFinite(exp)) return false;

  return Math.floor(Date.now() / 1000) <= exp;
};

export const recentReauthCookieName = REAUTH_COOKIE_NAME;
