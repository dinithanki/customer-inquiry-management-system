
import { Router } from "express";

import {
  login,
  refresh,
  logout,
  getMe,
  changePassword,
} from "../controllers/auth.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public authentication routes
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Protected authentication routes
router.get("/me", requireAuth, getMe);

// Password change must remain accessible to authenticated users
// who are required to change their temporary password.
router.post("/change-password", requireAuth, changePassword);

export default router;
