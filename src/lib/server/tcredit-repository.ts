import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  Approval,
  Appeal,
  CommitteeReview,
  Contribution,
  ContributionStatus,
  ContributionType,
  EffortTier,
  OrgUnit,
  Recommendation,
  User,
  canApproveContribution,
  calculateCredit
} from "@/lib/domain";

type PrismaRecommendationRow = {
  id: string;
  contributionId: string;
  recommenderId: string;
  comment: string | null;
  isPrivate: boolean;
  status: Recommendation["status"];
  notificationChannel: Recommendation["notificationChannel"] | null;
  notifiedAt: Date | null;
  submittedAt: Date | null;
  createdAt: Date;
};

type PrismaApprovalRow = {
  id: string;
  contributionId: string;
  approverId: string;
  inputScore: number;
  outcomeScore: number;
  impactScore: number;
  finalTier: EffortTier;
  finalCredit: number;
  decision: ContributionStatus;
  comment: string;
  createdAt: Date;
};

type PrismaCommitteeReviewRow = {
  id: string;
  contributionId: string;
  signalType: string;
  severity: string;
  status: "OPEN" | "REVIEWING" | "CLOSED";
  note: string | null;
};

type PrismaUserRow = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  employmentType: User["employmentType"];
  position: string;
  roles: User["roles"];
  orgUnit: {
    code: string;
  };
};

type PrismaAppealRow = {
  id: string;
  contributionId: string;
  appellantId: string;
  reason: string;
  status: Appeal["status"];
  createdAt: Date;
};

function toDateString(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

function toScore(value: number): 0 | 1 {
  return value === 1 ? 1 : 0;
}

function mapPrismaContribution(item: {
  id: string;
  contributorId: string;
  title: string;
  description: string;
  type: ContributionType;
  activityDate: Date;
  relatedOrgUnitCode: string;
  status: ContributionStatus;
  requestedTier: EffortTier;
  expectedCredit: number;
  submittedWithin30d: boolean;
  createdAt: Date;
}): Contribution {
  return {
    ...item,
    activityDate: toDateString(item.activityDate),
    createdAt: toDateString(item.createdAt)
  };
}

function mapPrismaUser(item: PrismaUserRow): User {
  return {
    id: item.id,
    employeeNo: item.employeeNo,
    name: item.name,
    email: item.email,
    employmentType: item.employmentType,
    position: item.position,
    orgUnitCode: item.orgUnit.code,
    roles: item.roles
  };
}

export async function listUsers(): Promise<User[]> {
  const rows = (await prisma.user.findMany({
    include: { orgUnit: { select: { code: true } } },
    orderBy: { employeeNo: "asc" }
  })) as PrismaUserRow[];

  return rows.map(mapPrismaUser);
}

export async function getUserById(userId?: string): Promise<User | undefined> {
  if (!userId) {
    return undefined;
  }

  const row = (await prisma.user.findUnique({
    where: { id: userId },
    include: { orgUnit: { select: { code: true } } }
  })) as PrismaUserRow | null;

  return row ? mapPrismaUser(row) : undefined;
}

export async function getDefaultUser(): Promise<User> {
  const users = await listUsers();
  const admin = users.find((user) => user.id === "user-05") ?? users.find((user) => user.roles.includes("ADMIN"));
  const user = admin ?? users[0];

  if (!user) {
    throw new Error("초기 사용자가 없습니다. npm run db:seed를 실행해 주세요.");
  }

  return user;
}

export async function listOrgUnits(): Promise<OrgUnit[]> {
  const rows = await prisma.orgUnit.findMany({
    orderBy: { code: "asc" }
  });

  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    parentId: item.parentId ?? undefined
  }));
}

export async function listAppeals(): Promise<Appeal[]> {
  const rows = (await prisma.appeal.findMany({
    orderBy: { createdAt: "desc" }
  })) as PrismaAppealRow[];

  return rows.map((item) => ({
    id: item.id,
    contributionId: item.contributionId,
    appellantId: item.appellantId,
    reason: item.reason,
    status: item.status,
    createdAt: toDateString(item.createdAt)
  }));
}

export async function listContributions(): Promise<Contribution[]> {
  const rows = await prisma.contribution.findMany({
    orderBy: { createdAt: "desc" }
  });

  return rows.map(mapPrismaContribution);
}

export async function listRecommendations(): Promise<Recommendation[]> {
  const rows = (await prisma.recommendation.findMany({
    orderBy: { createdAt: "desc" }
  })) as PrismaRecommendationRow[];

  return rows.map((item) => ({
    id: item.id,
    contributionId: item.contributionId,
    recommenderId: item.recommenderId,
    comment: item.comment ?? undefined,
    isPrivate: item.isPrivate,
    status: item.status,
    notificationChannel: item.notificationChannel ?? undefined,
    notifiedAt: item.notifiedAt ? toDateString(item.notifiedAt) : undefined,
    submittedAt: item.submittedAt ? toDateString(item.submittedAt) : undefined,
    createdAt: toDateString(item.createdAt)
  }));
}

export async function listApprovals(): Promise<Approval[]> {
  const rows = (await prisma.approval.findMany({
    where: {
      decision: { in: ["APPROVED", "REJECTED"] }
    },
    orderBy: { createdAt: "desc" }
  })) as PrismaApprovalRow[];

  return rows.map((item) => ({
    id: item.id,
    contributionId: item.contributionId,
    approverId: item.approverId,
    inputScore: toScore(item.inputScore),
    outcomeScore: toScore(item.outcomeScore),
    impactScore: toScore(item.impactScore),
    finalTier: item.finalTier,
    finalCredit: item.finalCredit,
    decision: item.decision === "APPROVED" ? "APPROVED" : "REJECTED",
    comment: item.comment,
    createdAt: toDateString(item.createdAt)
  }));
}

export async function listCommitteeReviews(): Promise<CommitteeReview[]> {
  const rows = (await prisma.committeeReview.findMany({
    orderBy: { createdAt: "desc" }
  })) as PrismaCommitteeReviewRow[];

  return rows.map((item) => ({
    id: item.id,
    contributionId: item.contributionId,
    signalType: item.signalType,
    severity: item.severity as CommitteeReview["severity"],
    status: item.status,
    note: item.note ?? undefined
  }));
}

export async function getBudgetPool() {
  const pool = await prisma.budgetPool.findFirst({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }]
  });
  const issued = await prisma.approval.aggregate({
    _sum: { finalCredit: true },
    where: { decision: "APPROVED" }
  });

  if (!pool) {
    return {
      year: new Date().getFullYear(),
      term: "미설정",
      totalBudgetKrw: 0,
      nominalCreditValue: 0,
      issuedCreditLimit: 0,
      issuedCredit: issued._sum.finalCredit ?? 0
    };
  }

  return {
    year: pool.year,
    term: pool.term,
    totalBudgetKrw: Number(pool.totalBudgetKrw),
    nominalCreditValue: pool.nominalCreditValue,
    issuedCreditLimit: pool.issuedCreditLimit,
    issuedCredit: issued._sum.finalCredit ?? 0
  };
}

export async function getCumulativeCreditsForUser(userId: string) {
  const issued = await prisma.approval.aggregate({
    _sum: { finalCredit: true },
    where: {
      decision: "APPROVED",
      contribution: {
        contributorId: userId
      }
    }
  });

  return issued._sum.finalCredit ?? 0;
}

export async function getPendingRecommendationCountForUser(userId: string) {
  return prisma.recommendation.count({
    where: {
      recommenderId: userId,
      status: "REQUESTED"
    }
  });
}

export async function getPendingApprovalCountForUser(user: User) {
  if (!user.roles.includes("APPROVER") && !user.roles.includes("ADMIN")) {
    return 0;
  }

  return prisma.contribution.count({
    where: {
      status: "PENDING_APPROVAL",
      ...(user.roles.includes("ADMIN") ? {} : { relatedOrgUnitCode: user.orgUnitCode })
    }
  });
}

export async function createContribution(input: {
  contributorId: string;
  title: string;
  description: string;
  type: ContributionType;
  activityDate: Date;
  relatedOrgUnitCode: string;
  status: ContributionStatus;
  requestedTier: EffortTier;
  expectedCredit: number;
  submittedWithin30d: boolean;
  recommenderIds?: string[];
}) {
  const { recommenderIds = [], ...contributionInput } = input;
  const uniqueRecommenderIds = [...new Set(recommenderIds)].filter((id) => id !== input.contributorId);

  const contribution = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const saved = await tx.contribution.create({
      data: contributionInput
    });

    if (uniqueRecommenderIds.length > 0) {
      await tx.recommendation.createMany({
        data: uniqueRecommenderIds.map((recommenderId) => ({
          contributionId: saved.id,
          recommenderId,
          status: "REQUESTED",
          notificationChannel: "IN_APP",
          notifiedAt: new Date()
        })),
        skipDuplicates: true
      });
    }

    return saved;
  });

  return mapPrismaContribution(contribution);
}

export async function submitApproval(input: {
  actor: User;
  contributionId: string;
  inputScore: 0 | 1;
  outcomeScore: 0 | 1;
  impactScore: 0 | 1;
  finalTier: EffortTier;
  decision: Extract<ContributionStatus, "APPROVED" | "REJECTED">;
  comment: string;
}) {
  const approval = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const contribution = await tx.contribution.findUnique({
      where: { id: input.contributionId },
      select: {
        id: true,
        relatedOrgUnitCode: true,
        status: true
      }
    });

    if (!contribution) {
      throw new Error("승인 대상 공헌을 찾을 수 없습니다.");
    }

    if (!canApproveContribution(input.actor, contribution)) {
      throw new Error("해당 공헌을 승인/반려할 권한이 없습니다.");
    }

    const finalCredit =
      input.decision === "APPROVED"
        ? calculateCredit(input.inputScore, input.outcomeScore, input.impactScore, input.finalTier)
        : 0;

    const saved = await tx.approval.upsert({
      where: { contributionId: input.contributionId },
      create: {
        contributionId: input.contributionId,
        approverId: input.actor.id,
        inputScore: input.inputScore,
        outcomeScore: input.outcomeScore,
        impactScore: input.impactScore,
        finalTier: input.finalTier,
        finalCredit,
        decision: input.decision,
        comment: input.comment
      },
      update: {
        approverId: input.actor.id,
        inputScore: input.inputScore,
        outcomeScore: input.outcomeScore,
        impactScore: input.impactScore,
        finalTier: input.finalTier,
        finalCredit,
        decision: input.decision,
        comment: input.comment
      }
    });

    await tx.contribution.update({
      where: { id: input.contributionId },
      data: { status: input.decision }
    });

    await tx.auditEvent.create({
      data: {
        actorId: input.actor.id,
        contributionId: input.contributionId,
        action: input.decision,
        details: {
          finalCredit,
          finalTier: input.finalTier,
          inputScore: input.inputScore,
          outcomeScore: input.outcomeScore,
          impactScore: input.impactScore
        }
      }
    });

    return saved;
  });

  return {
    id: approval.id,
    contributionId: approval.contributionId,
    approverId: approval.approverId,
    inputScore: toScore(approval.inputScore),
    outcomeScore: toScore(approval.outcomeScore),
    impactScore: toScore(approval.impactScore),
    finalTier: approval.finalTier,
    finalCredit: approval.finalCredit,
    decision: approval.decision === "APPROVED" ? "APPROVED" : "REJECTED",
    comment: approval.comment,
    createdAt: toDateString(approval.createdAt)
  } satisfies Approval;
}

export async function submitRecommendationComment(input: {
  recommendationId: string;
  recommenderId: string;
  comment: string;
  isPrivate: boolean;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const recommendation = await tx.recommendation.findUnique({
      where: { id: input.recommendationId },
      select: { id: true, contributionId: true, recommenderId: true }
    });

  if (!recommendation || recommendation.recommenderId !== input.recommenderId) {
    throw new Error("해당 추천 의견을 입력할 권한이 없습니다.");
  }

    const saved = await tx.recommendation.update({
      where: { id: input.recommendationId },
      data: {
        comment: input.comment,
        isPrivate: input.isPrivate,
        status: "SUBMITTED",
        submittedAt: new Date()
      }
    });

    const remainingRecommendationCount = await tx.recommendation.count({
      where: {
        contributionId: recommendation.contributionId,
        status: { not: "SUBMITTED" }
      }
    });

    if (remainingRecommendationCount === 0) {
      await tx.contribution.updateMany({
        where: {
          id: recommendation.contributionId,
          status: "PENDING_RECOMMEND"
        },
        data: { status: "PENDING_APPROVAL" }
      });
    }

    return saved;
  });
}

export function revalidateTcreditPages() {
  ["/", "/approvals", "/approver-insights", "/committee", "/contributions/mine"].forEach((path) => {
    revalidatePath(path);
  });
}
