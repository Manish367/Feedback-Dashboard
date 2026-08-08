import { FeedbackParameter, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

const PARAMETERS = [
  { key: "ownership", label: "Ownership", order: 1 },
  { key: "communication", label: "Communication", order: 2 },
  { key: "quality_of_work", label: "Quality of Work", order: 3 },
  { key: "collaboration", label: "Collaboration", order: 4 },
  { key: "initiative", label: "Initiative", order: 5 },
];

const COMMENTS: Record<string, Record<number, string[]>> = {
  ownership: {
    5: ["Owns outcomes end-to-end without needing reminders.", "Steps up and takes accountability even when things go wrong."],
    4: ["Reliably owns their work; the odd task needs a nudge.", "Takes responsibility for most deliverables proactively."],
    3: ["Gets things done but needs prompting to close loops.", "Ownership is inconsistent across different projects."],
  },
  communication: {
    5: ["Communicates clearly and proactively, even with bad news.", "Keeps everyone aligned with crisp, timely updates."],
    4: ["Generally communicates well; occasionally light on detail.", "Good at status updates, could involve stakeholders earlier."],
    3: ["Updates are often reactive rather than proactive.", "Communication is fine one-on-one but weak in group settings."],
  },
  quality_of_work: {
    5: ["Output is consistently polished and thoroughly checked.", "Sets the bar for quality on the team."],
    4: ["Solid, dependable quality with minor rough edges.", "Work rarely needs rework, small details sometimes missed."],
    3: ["Quality is acceptable but needs more attention to detail.", "Meets the bar but rarely exceeds it."],
  },
  collaboration: {
    5: ["Actively helps teammates and shares credit generously.", "A go-to person others rely on for support."],
    4: ["Collaborates well, responsive when others need help.", "Good team player, could initiate cross-team help more."],
    3: ["Works fine in their lane, less engaged outside it.", "Collaboration happens but usually needs to be asked."],
  },
  initiative: {
    5: ["Consistently identifies and acts on opportunities unprompted.", "Brings new ideas to the table every month."],
    4: ["Takes initiative on most projects, sometimes waits for direction.", "Good instincts, could push proposals further on their own."],
    3: ["Sticks to assigned scope, rarely goes beyond it.", "Initiative shows up occasionally, not yet a habit."],
  },
};

// Deterministic PRNG so re-running the seed produces the same data.
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Picks a pseudo-random element from an array using the given RNG.
function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

// Generates a score and matching comment for one parameter.
function scoreAndComment(rng: () => number, parameterKey: string, favorable: boolean) {
  const score = favorable ? (rng() < 0.6 ? 5 : 4) : rng() < 0.5 ? 4 : 3;
  const comment = pick(rng, COMMENTS[parameterKey][score]);
  return { score, comment };
}

// Hashes a plaintext password for storage.
async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

// Resets the database and seeds both demo companies with users and feedback.
async function main() {
  console.log("Resetting existing data...");
  await prisma.feedbackScore.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.feedbackParameter.deleteMany();

  console.log("Seeding fixed feedback parameters...");
  const parameters: FeedbackParameter[] = [];
  for (const p of PARAMETERS) {
    parameters.push(await prisma.feedbackParameter.create({ data: p }));
  }

  const passwordHash = await hash(DEMO_PASSWORD);

  const now = new Date(2026, 7, 8);
  const periods: string[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const [p0, p1, p2, currentPeriod] = periods;

  // Creates one manager's feedback submission (all 5 parameters) for one employee/period.
  async function submitFeedback(opts: {
    companyId: string;
    employeeId: string;
    managerId: string;
    period: string;
    favorable?: boolean;
    seed: number;
  }) {
    const rng = makeRng(opts.seed);
    const favorable = opts.favorable ?? true;
    const feedback = await prisma.feedback.create({
      data: {
        companyId: opts.companyId,
        employeeId: opts.employeeId,
        managerId: opts.managerId,
        period: opts.period,
      },
    });
    for (const param of parameters) {
      const { score, comment } = scoreAndComment(rng, param.key, favorable);
      await prisma.feedbackScore.create({
        data: { feedbackId: feedback.id, parameterId: param.id, score, comment },
      });
    }
  }

  console.log("Seeding Ashoka Textiles...");
  const ashoka = await prisma.company.create({
    data: { name: "Ashoka Textiles", slug: "ashoka-textiles" },
  });

  const ananya = await prisma.user.create({
    data: {
      companyId: ashoka.id,
      name: "Ananya Kapoor",
      email: "ananya.kapoor@ashokatextiles.com",
      passwordHash,
      title: "COO",
    },
  });

  const rohan = await prisma.user.create({
    data: {
      companyId: ashoka.id,
      name: "Rohan Mehta",
      email: "rohan.mehta@ashokatextiles.com",
      passwordHash,
      title: "VP Operations",
      managerId: ananya.id,
    },
  });

  const kavita = await prisma.user.create({
    data: {
      companyId: ashoka.id,
      name: "Kavita Nair",
      email: "kavita.nair@ashokatextiles.com",
      passwordHash,
      title: "HR Lead",
      managerId: ananya.id,
      isHR: true,
    },
  });

  const priya = await prisma.user.create({
    data: {
      companyId: ashoka.id,
      name: "Priya Sharma",
      email: "priya.sharma@ashokatextiles.com",
      passwordHash,
      title: "Team Lead, Production",
      managerId: rohan.id,
    },
  });

  const priyaTeamSpecs = [
    { name: "Aditi Joshi", title: "Design Associate" },
    { name: "Karan Malhotra", title: "Production Associate" },
    { name: "Neha Reddy", title: "QA Associate" },
    { name: "Suresh Pillai", title: "Merchandiser" },
    { name: "Farah Sheikh", title: "Sourcing Associate" },
    { name: "Vikram Solanki", title: "Logistics Associate" },
  ];
  const priyaTeam = [];
  for (const spec of priyaTeamSpecs) {
    priyaTeam.push(
      await prisma.user.create({
        data: {
          companyId: ashoka.id,
          name: spec.name,
          email: `${spec.name.toLowerCase().replace(/\s+/g, ".")}@ashokatextiles.com`,
          passwordHash,
          title: spec.title,
          managerId: priya.id,
        },
      })
    );
  }

  let seedCounter = 1;
  for (const period of [p0, p1, p2]) {
    await submitFeedback({
      companyId: ashoka.id,
      employeeId: rohan.id,
      managerId: ananya.id,
      period,
      favorable: true,
      seed: seedCounter++,
    });
  }

  for (const period of periods) {
    await submitFeedback({
      companyId: ashoka.id,
      employeeId: priya.id,
      managerId: rohan.id,
      period,
      favorable: true,
      seed: seedCounter++,
    });
  }

  for (let idx = 0; idx < priyaTeam.length; idx++) {
    const member = priyaTeam[idx];
    for (const period of [p0, p1, p2]) {
      const favorable = !(idx % 3 === 0 && period === p1);
      await submitFeedback({
        companyId: ashoka.id,
        employeeId: member.id,
        managerId: priya.id,
        period,
        favorable,
        seed: seedCounter++,
      });
    }
    if (idx < 3) {
      await submitFeedback({
        companyId: ashoka.id,
        employeeId: member.id,
        managerId: priya.id,
        period: currentPeriod,
        favorable: true,
        seed: seedCounter++,
      });
    }
  }

  console.log("Seeding Bright Path Consulting...");
  const brightPath = await prisma.company.create({
    data: { name: "Bright Path Consulting", slug: "bright-path-consulting" },
  });

  const sameer = await prisma.user.create({
    data: {
      companyId: brightPath.id,
      name: "Sameer Verma",
      email: "sameer.verma@brightpathconsulting.com",
      passwordHash,
      title: "Founder",
    },
  });

  const teamSpecs = [
    { name: "Meera Iyer", title: "Senior Consultant", isHR: false },
    { name: "Arjun Rao", title: "Consultant", isHR: false },
    { name: "Divya Menon", title: "Consultant", isHR: false },
    { name: "Kabir Singh", title: "Consultant", isHR: false },
    { name: "Ritu Bhatia", title: "Associate Consultant", isHR: false },
    { name: "Yash Kulkarni", title: "Associate Consultant", isHR: false },
    { name: "Ishaan Chopra", title: "Analyst", isHR: false },
    { name: "Leela Krishnan", title: "HR Lead", isHR: true },
  ];

  const brightPathTeam = [];
  for (const spec of teamSpecs) {
    brightPathTeam.push(
      await prisma.user.create({
        data: {
          companyId: brightPath.id,
          name: spec.name,
          email: `${spec.name.toLowerCase().replace(/\s+/g, ".")}@brightpathconsulting.com`,
          passwordHash,
          title: spec.title,
          managerId: sameer.id,
          isHR: spec.isHR,
        },
      })
    );
  }

  for (let idx = 0; idx < brightPathTeam.length; idx++) {
    const member = brightPathTeam[idx];
    for (const period of [p0, p1, p2]) {
      const favorable = !(idx === 4 && period === p0);
      await submitFeedback({
        companyId: brightPath.id,
        employeeId: member.id,
        managerId: sameer.id,
        period,
        favorable,
        seed: seedCounter++,
      });
    }
    if (idx < 5) {
      await submitFeedback({
        companyId: brightPath.id,
        employeeId: member.id,
        managerId: sameer.id,
        period: currentPeriod,
        favorable: true,
        seed: seedCounter++,
      });
    }
  }

  console.log("\nSeed complete.");
  console.log(`Demo password for every seeded user: ${DEMO_PASSWORD}`);
  console.log("\nAshoka Textiles logins:");
  console.log(`  ${ananya.email} (COO, top of tree)`);
  console.log(`  ${rohan.email} (manages Priya)`);
  console.log(`  ${priya.email} (manages 6, reports to Rohan)`);
  console.log(`  ${kavita.email} (HR lead)`);
  console.log("\nBright Path Consulting logins:");
  console.log(`  ${sameer.email} (Founder, manages 8 directly)`);
  console.log(`  meera.iyer@brightpathconsulting.com ... (8 direct reports)`);
  console.log(`  leela.krishnan@brightpathconsulting.com (HR lead, also a direct report)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
