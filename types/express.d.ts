import type { HydratedDocument } from "mongoose";
import type { IUser } from "./index.js"; // adjust if this file isn't in the same folder as types/index.ts

// req.user is your MongoDB user (set by `protect`), not Clerk's User type.
// Don't declare `auth` here: @clerk/express already adds it as a function.
declare global {
  namespace Express {
    interface Request {
      user: HydratedDocument<IUser>;
    }
  }
}

export {};