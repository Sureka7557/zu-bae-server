import type { User } from "@clerk/express";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string | null;
      };
      user?: User;
    }
  }
}

export {};