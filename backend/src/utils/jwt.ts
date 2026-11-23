
import jwt from "jsonwebtoken";

const JWT_ALGORITHM = "HS256" as const;

const JWT_ISSUER = "customer-inquiry-management-api";

const JWT_AUDIENCE = "customer-inquiry-management-client";

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new Error("JWT_ACCESS_SECRET is not configured.");
  }

  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "JWT_ACCESS_SECRET must contain at least 32 bytes."
    );
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
      algorithm: JWT_ALGORITHM,
      subject: user.sub,
      expiresIn: "15m",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getAccessSecret(), {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}
