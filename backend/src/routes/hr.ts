import { Router } from "express";
import { prisma } from "../lib/prisma";
import { AuthedRequest, requireAuth, requireHR } from "../middleware/requireAuth";

export const hrRouter = Router();

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Full org chart for the HR lead's own company: every manager -> direct
// report edge. This is the same edge the feedback-submission check is built
// on, so "who reports to whom" can never drift out of sync with "who owes
// feedback to whom".
hrRouter.get("/org", requireAuth, requireHR, async (req: AuthedRequest, res) => {
  const users = await prisma.user.findMany({
    where: { companyId: req.user!.companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, title: true, managerId: true, isHR: true },
  });
  res.json(users);
});

// For every manager -> direct-report edge in the company, has feedback been
// submitted for the given period? Built directly off the (employeeId, period)
// unique constraint on Feedback, so "missing" isn't inferred from absence of
// activity — it's a clean anti-join.
hrRouter.get("/tracker", requireAuth, requireHR, async (req: AuthedRequest, res) => {
  const period = typeof req.query.period === "string" && req.query.period ? req.query.period : currentPeriod();

  const reports = await prisma.user.findMany({
    where: { companyId: req.user!.companyId, managerId: { not: null } },
    select: {
      id: true,
      name: true,
      title: true,
      manager: { select: { id: true, name: true } },
    },
    orderBy: [{ manager: { name: "asc" } }, { name: "asc" }],
  });

  const feedbackForPeriod = await prisma.feedback.findMany({
    where: { companyId: req.user!.companyId, period },
    select: { employeeId: true, submittedAt: true },
  });
  const submittedByEmployee = new Map(feedbackForPeriod.map((f) => [f.employeeId, f.submittedAt]));

  const rows = reports.map((r) => ({
    employeeId: r.id,
    employeeName: r.name,
    employeeTitle: r.title,
    managerId: r.manager!.id,
    managerName: r.manager!.name,
    submitted: submittedByEmployee.has(r.id),
    submittedAt: submittedByEmployee.get(r.id) ?? null,
  }));

  const missing = rows.filter((r) => !r.submitted);

  res.json({ period, total: rows.length, missingCount: missing.length, rows });
});

// Distinct periods that have at least one submission, for populating a
// period picker in the HR app (plus the current month, always offered).
hrRouter.get("/periods", requireAuth, requireHR, async (req: AuthedRequest, res) => {
  const feedbacks = await prisma.feedback.findMany({
    where: { companyId: req.user!.companyId },
    select: { period: true },
    distinct: ["period"],
  });
  const periods = new Set(feedbacks.map((f) => f.period));
  periods.add(currentPeriod());
  res.json(Array.from(periods).sort());
});
