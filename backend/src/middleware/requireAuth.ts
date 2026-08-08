import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    name: string;
    email: string;
    isHR: boolean;
    managerId: string | null;
  };
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  try {
    const payload = verifyToken(header.slice("Bearer ".length));
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }
    req.user = {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      isHR: user.isHR,
      managerId: user.managerId,
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireHR(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user?.isHR) {
    return res.status(403).json({ error: "HR access required" });
  }
  next();
}
