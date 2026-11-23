
import jwt from "jsonwebtoken";

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured.");
  }

  return secret;
}

export interface AccessTokenPayload {
  sub: string;
  role: "ADMIN" | "STAFF";
  sid: string;
}

export function generateAccessToken(
  user: AccessTokenPayload
): string {
  return jwt.sign(
    {
      role: user.role,
      sid: user.sid,
    },
    getAccessSecret(),
    {
      subject: user.sub,
      expiresIn: "15m",
      issuer: "customer-inquiry-management-api",
      audience: "customer-inquiry-management-client",
    }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getAccessSecret(), {
    issuer: "customer-inquiry-management-api",
    audience: "customer-inquiry-management-client",
  });
}
