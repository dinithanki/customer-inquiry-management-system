
import type { Request, Response, NextFunction } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getAllowedOrigins(req: Request): Set<string> {
  const frontendOrigin =
    process.env.FRONTEND_ORIGIN || "http://localhost:3000";

  // Also allow same-origin requests from Swagger UI.
  const apiOrigin = `${req.protocol}://${req.get("host")}`;

  return new Set([
    new URL(frontendOrigin).origin,
    new URL(apiOrigin).origin,
  ]);
}

export function requireTrustedOrigin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  try {
    const allowedOrigins = getAllowedOrigins(req);

    const origin = req.get("origin");
    const referer = req.get("referer");

    // Browser requests normally include Origin.
    if (origin) {
      if (origin === "null" || !allowedOrigins.has(origin)) {
        res.status(403).json({
          success: false,
          message: "Request origin is not allowed",
        });
        return;
      }

      next();
      return;
    }

    // Use Referer as a fallback when Origin is unavailable.
    if (referer) {
      let refererOrigin: string;

      try {
        refererOrigin = new URL(referer).origin;
      } catch {
        res.status(403).json({
          success: false,
          message: "Invalid request origin",
        });
        return;
      }

      if (!allowedOrigins.has(refererOrigin)) {
        res.status(403).json({
          success: false,
          message: "Request origin is not allowed",
        });
        return;
      }
    }

    // Requests without Origin or Referer are allowed for
    // non-browser clients such as Postman and automated tests.
    next();
  } catch (error) {
    console.error("Trusted origin middleware error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to verify request origin",
    });
  }
}
