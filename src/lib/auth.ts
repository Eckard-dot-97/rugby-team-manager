import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET as string;

export type SessionUser = {
  id: number;
  email: string;
  role: "parent" | "coach";
};

export function signToken(user: SessionUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

// Reads the session cookie set at login and returns the user, or null.
export function getSessionUser(req: NextRequest): SessionUser | null {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  return verifyToken(token);
}
