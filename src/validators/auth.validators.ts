import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().min(1).max(45),
  password: z.string().min(6).max(255),
  role: z.enum(["student", "teacher"])
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});
