import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/auth";
import { AuthedRequest, requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password format" });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { company: true, manager: true },
  });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ userId: user.id, companyId: user.companyId });
  const reportCount = await prisma.user.count({ where: { managerId: user.id } });

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      title: user.title,
      isHR: user.isHR,
      managerId: user.managerId,
      manager: user.manager ? { id: user.manager.id, name: user.manager.name } : null,
      isManager: reportCount > 0,
      company: { id: user.company.id, name: user.company.name, slug: user.company.slug },
    },
  });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { company: true, manager: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const reportCount = await prisma.user.count({ where: { managerId: user.id } });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    title: user.title,
    isHR: user.isHR,
    isManager: reportCount > 0,
    manager: user.manager ? { id: user.manager.id, name: user.manager.name } : null,
    company: { id: user.company.id, name: user.company.name, slug: user.company.slug },
  });
});
