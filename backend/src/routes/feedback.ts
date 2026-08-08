import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth } from "../middleware/requireAuth";

export const feedbackRouter = Router();

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

feedbackRouter.get("/parameters", requireAuth, async (_req, res) => {
  const parameters = await prisma.feedbackParameter.findMany({ orderBy: { order: "asc" } });
  res.json(parameters);
});

// People I directly manage — the roster I can give feedback to.
feedbackRouter.get("/me/reports", requireAuth, async (req: AuthedRequest, res) => {
  const reports = await prisma.user.findMany({
    where: { managerId: req.user!.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, email: true },
  });
  res.json(reports);
});

// My own feedback history, across all months, for the "scores over time" view.
feedbackRouter.get("/me/feedback", requireAuth, async (req: AuthedRequest, res) => {
  const feedbacks = await prisma.feedback.findMany({
    where: { employeeId: req.user!.id },
    orderBy: { period: "asc" },
    include: {
      manager: { select: { id: true, name: true } },
      scores: { include: { parameter: true }, orderBy: { parameter: { order: "asc" } } },
    },
  });
  res.json(feedbacks);
});

const submitSchema = z.object({
  employeeId: z.string(),
  period: z.string().regex(PERIOD_RE, "period must be in YYYY-MM format"),
  scores: z
    .array(
      z.object({
        parameterId: z.string(),
        score: z.number().int().min(1).max(5),
        comment: z.string().min(1, "comment is required"),
      })
    )
    .min(1),
});

// A manager submits (or edits, within the same month) feedback for one of
// their direct reports. Authorization is enforced structurally: the target
// employee's managerId must equal the caller's id — not a role check.
feedbackRouter.post("/feedback", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
  }
  const { employeeId, period, scores } = parsed.data;

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.managerId !== req.user!.id) {
    return res.status(403).json({ error: "You can only submit feedback for your direct reports" });
  }

  const parameters = await prisma.feedbackParameter.findMany();
  const parameterIds = new Set(parameters.map((p) => p.id));
  if (scores.length !== parameters.length || !scores.every((s) => parameterIds.has(s.parameterId))) {
    return res.status(400).json({ error: "Scores must cover exactly the fixed set of parameters" });
  }

  const existing = await prisma.feedback.findUnique({
    where: { employeeId_period: { employeeId, period } },
  });

  const feedback = await prisma.$transaction(async (tx) => {
    const fb = existing
      ? await tx.feedback.update({
          where: { id: existing.id },
          data: { managerId: req.user!.id, submittedAt: new Date() },
        })
      : await tx.feedback.create({
          data: {
            companyId: req.user!.companyId,
            employeeId,
            managerId: req.user!.id,
            period,
          },
        });

    await tx.feedbackScore.deleteMany({ where: { feedbackId: fb.id } });
    await tx.feedbackScore.createMany({
      data: scores.map((s) => ({
        feedbackId: fb.id,
        parameterId: s.parameterId,
        score: s.score,
        comment: s.comment,
      })),
    });

    return tx.feedback.findUniqueOrThrow({
      where: { id: fb.id },
      include: { scores: { include: { parameter: true } } },
    });
  });

  res.status(existing ? 200 : 201).json(feedback);
});

// View one employee's feedback history — allowed for the employee themself,
// their direct manager, or HR within the same company.
feedbackRouter.get("/feedback/:employeeId", requireAuth, async (req: AuthedRequest, res) => {
  const { employeeId } = req.params;
  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee || employee.companyId !== req.user!.companyId) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const isSelf = employee.id === req.user!.id;
  const isTheirManager = employee.managerId === req.user!.id;
  if (!isSelf && !isTheirManager && !req.user!.isHR) {
    return res.status(403).json({ error: "Not authorized to view this employee's feedback" });
  }

  const feedbacks = await prisma.feedback.findMany({
    where: { employeeId },
    orderBy: { period: "asc" },
    include: {
      manager: { select: { id: true, name: true } },
      scores: { include: { parameter: true }, orderBy: { parameter: { order: "asc" } } },
    },
  });
  res.json(feedbacks);
});
