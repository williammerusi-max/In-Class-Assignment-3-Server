import type { RequestHandler } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { user, UserRole  } from "../db/schema.js";
import { loginSchema, registerSchema } from "../validators/auth.validators.js";
import { AppError } from "../utils/app-error.js";



const signToken = (id: number, role: UserRole): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new AppError("JWT secret is not configured", 500);
  return jwt.sign({ id, role }, secret, { expiresIn: "1d" });
};

export const register: RequestHandler = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = await db.select().from(user).where(eq(user.username, data.username)).limit(1);
    if (existing[0]) throw new AppError("Username already exists", 409);

    const password = await bcrypt.hash(data.password, 10);
    const inserted = await db.insert(user).values({
      username: data.username,
      password,
      role: data.role,
    }).$returningId();

    const id = inserted[0]?.id;
    if (!id) throw new AppError("Could not create account", 500);

    res.status(201).json({ id, username: data.username, role: data.role, token: signToken(id, data.role) });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const users = await db.select().from(user).where(eq(user.username, data.username)).limit(1);
    const dbuser = users[0]; //cant be user, naming conflig
    if (!dbuser) throw new AppError("Invalid username or password", 401);

    const validPassword = await bcrypt.compare(data.password, dbuser.password);
    if (!validPassword) throw new AppError("Invalid username or password", 401);

    const role = dbuser.role;
    res.json({ id: dbuser.id, username: dbuser.username, role, token: signToken(dbuser.id, role) });
  } catch (error) {
    console.error("Debug login error:", error)
    next(error);
  }
};
