import type { UserRole } from "./db/schema.js";

export type AuthUser = {
  id: number;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
