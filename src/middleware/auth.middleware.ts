import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "../db/schema.js";
import { AppError } from "../utils/app-error.js";

type JwtPayload = {
  userId: number;
  role: UserRole;
};

const isJwtPayload = (value: unknown): value is JwtPayload => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.userId === "number" && (candidate.role === "STUDENT" || candidate.role === "TEACHER");
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError("Missing authorization token", 401));
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next(new AppError("JWT secret is not configured", 500));
    return;
  }

  try {
    const decoded = jwt.verify(header.replace("Bearer ", ""), secret);
    if (!isJwtPayload(decoded)) {
      next(new AppError("Invalid token payload", 401));
      return;
    }
    req.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
};

export const requireRole = (role: UserRole): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }
    if (req.user.role !== role) {
      next(new AppError("You do not have permission to access this resource", 403));
      return;
    }
    next();
  };
};
