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
  canAccessRole,
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
  resolution: string | null;
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

export async function listAppeals(filter?: { appellantId?: string }): Promise<Appeal[]> {
  const rows = (await prisma.appeal.findMany({
    where: {
      ...(filter?.appellantId ? { appellantId: filter.appellantId } : {})
    },
    orderBy: { createdAt: "desc" }
  })) as PrismaAppealRow[];

  return rows.map((item) => ({
    id: item.id,
    contributionId: item.contributionId,
    appellantId: item.appellantId,
    reason: item.reason,
    status: item.status,
    resolution: item.resolution ?? undefined,
    createdAt: toDateString(item.createdAt)
  }));
}

function contributionVisibilityWhere(user: User): Prisma.ContributionWhereInput {
  if (user.roles.includes("ADMIN")) {
    return {};
  }

  if (user.roles.includes("APPROVER")) {
    return {
      relatedOrgUnitCode: user.orgUnitCode,
      OR: [
        { status: { not: "PENDING_RECOMMEND" } },
        { contributorId: user.id },
        { recommendations: { some: { recommenderId: user.id } } }
      ]
    };
  }

  return { contributorId: user.id };
}

export async function listContributions(filter?: {
  contributorId?: string;
  ids?: string[];
  status?: ContributionStatus;
  relatedOrgUnitCode?: string;
  visibleTo?: User;
  take?: number;
}): Promise<Contribution[]> {
  const baseWhere: Prisma.ContributionWhereInput = {
    ...(filter?.contributorId ? { contributorId: filter.contributorId } : {}),
    ...(filter?.ids ? { id: { in: filter.ids } } : {}),
    ...(filter?.status ? { status: filter.status } : {}),
    ...(filter?.relatedOrgUnitCode ? { relatedOrgUnitCode: filter.relatedOrgUnitCode } : {})
  };
  const rows = await prisma.contribution.findMany({
    where: filter?.visibleTo ? { AND: [baseWhere, contributionVisibilityWhere(filter.visibleTo)] } : baseWhere,
    orderBy: { createdAt: "desc" },
    ...(filter?.take ? { take: filter.take } : {})
  });

  return rows.map(mapPrismaContribution);
}

export async function countContributionsByStatus(status: ContributionStatus) {
  return prisma.contribution.count({ where: { status } });
}

export async function listRecommendations(filter?: {
  contributionId?: string;
  recommenderId?: string;
}): Promise<Recommendation[]> {
  const rows = (await prisma.recommendation.findMany({
    where: {
      ...(filter?.contributionId ? { contributionId: filter.contributionId } : {}),
      ...(filter?.recommenderId ? { recommenderId: filter.recommenderId } : {})
    },
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

export async function listApprovals(filter?: {
  contributionIds?: string[];
  contributorId?: string;
  approverId?: string;
}): Promise<Approval[]> {
  const rows = (await prisma.approval.findMany({
    where: {
      decision: { in: ["APPROVED", "REJECTED"] },
      ...(filter?.contributionIds ? { contributionId: { in: filter.contributionIds } } : {}),
      ...(filter?.contributorId ? { contribution: { contributorId: filter.contributorId } } : {}),
      ...(filter?.approverId ? { approverId: filter.approverId } : {})
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

    if (input.decision === "APPROVED") {
      const pool = await tx.budgetPool.findFirst({
        orderBy: [{ year: "desc" }, { createdAt: "desc" }]
      });

      if (pool) {
        const issued = await tx.approval.aggregate({
          _sum: { finalCredit: true },
          where: {
            decision: "APPROVED",
            contributionId: { not: input.contributionId }
          }
        });
        const issuedCredit = issued._sum.finalCredit ?? 0;

        if (issuedCredit + finalCredit > pool.issuedCreditLimit) {
          throw new Error(
            `Credit 발행 한도를 초과해 승인할 수 없습니다. (잔여 한도 ${Math.max(pool.issuedCreditLimit - issuedCredit, 0)} C)`
          );
        }
      }
    }

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

async function advanceContributionIfRecommendationsDone(tx: Prisma.TransactionClient, contributionId: string) {
  const remainingRequestedCount = await tx.recommendation.count({
    where: {
      contributionId,
      status: "REQUESTED"
    }
  });

  if (remainingRequestedCount === 0) {
    await tx.contribution.updateMany({
      where: {
        id: contributionId,
        status: "PENDING_RECOMMEND"
      },
      data: { status: "PENDING_APPROVAL" }
    });
  }
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

    await advanceContributionIfRecommendationsDone(tx, recommendation.contributionId);

    return saved;
  });
}

export async function declineRecommendation(input: { recommendationId: string; recommenderId: string }) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const recommendation = await tx.recommendation.findUnique({
      where: { id: input.recommendationId },
      select: { id: true, contributionId: true, recommenderId: true, status: true }
    });

    if (!recommendation || recommendation.recommenderId !== input.recommenderId) {
      throw new Error("해당 추천 요청을 처리할 권한이 없습니다.");
    }

    if (recommendation.status !== "REQUESTED") {
      throw new Error("이미 처리된 추천 요청입니다.");
    }

    const saved = await tx.recommendation.update({
      where: { id: input.recommendationId },
      data: { status: "CANCELED" }
    });

    await advanceContributionIfRecommendationsDone(tx, recommendation.contributionId);

    return saved;
  });
}

export async function createAppeal(input: { actor: User; contributionId: string; reason: string }) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const contribution = await tx.contribution.findUnique({
      where: { id: input.contributionId },
      select: { id: true, contributorId: true, status: true }
    });

    if (!contribution || contribution.contributorId !== input.actor.id) {
      throw new Error("본인 공헌에 대해서만 이의신청할 수 있습니다.");
    }

    if (contribution.status !== "REJECTED") {
      throw new Error("반려된 공헌만 이의신청할 수 있습니다.");
    }

    const openAppealCount = await tx.appeal.count({
      where: {
        contributionId: input.contributionId,
        status: { in: ["SUBMITTED", "REVIEWING"] }
      }
    });

    if (openAppealCount > 0) {
      throw new Error("이미 진행 중인 이의신청이 있습니다.");
    }

    const appeal = await tx.appeal.create({
      data: {
        contributionId: input.contributionId,
        appellantId: input.actor.id,
        reason: input.reason
      }
    });

    await tx.contribution.update({
      where: { id: input.contributionId },
      data: { status: "UNDER_REVIEW" }
    });

    await tx.committeeReview.create({
      data: {
        contributionId: input.contributionId,
        signalType: "이의신청",
        severity: "보통",
        status: "OPEN",
        note: input.reason.slice(0, 200)
      }
    });

    await tx.auditEvent.create({
      data: {
        actorId: input.actor.id,
        contributionId: input.contributionId,
        action: "APPEAL_SUBMITTED",
        details: { reason: input.reason }
      }
    });

    return appeal;
  });
}

export async function resolveAppeal(input: {
  actor: User;
  appealId: string;
  decision: "RESOLVED" | "DISMISSED";
  resolution: string;
}) {
  if (!canAccessRole(input.actor, "COMMITTEE")) {
    throw new Error("위원회 심의 권한이 없습니다.");
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const appeal = await tx.appeal.findUnique({
      where: { id: input.appealId },
      select: { id: true, contributionId: true, status: true }
    });

    if (!appeal) {
      throw new Error("이의신청을 찾을 수 없습니다.");
    }

    if (appeal.status === "RESOLVED" || appeal.status === "DISMISSED") {
      throw new Error("이미 처리된 이의신청입니다.");
    }

    const saved = await tx.appeal.update({
      where: { id: input.appealId },
      data: {
        status: input.decision,
        resolution: input.resolution
      }
    });

    await tx.contribution.updateMany({
      where: {
        id: appeal.contributionId,
        status: "UNDER_REVIEW"
      },
      data: { status: input.decision === "RESOLVED" ? "PENDING_APPROVAL" : "REJECTED" }
    });

    await tx.auditEvent.create({
      data: {
        actorId: input.actor.id,
        contributionId: appeal.contributionId,
        action: input.decision === "RESOLVED" ? "APPEAL_RESOLVED" : "APPEAL_DISMISSED",
        details: { resolution: input.resolution }
      }
    });

    return saved;
  });
}

export async function updateCommitteeReviewStatus(input: {
  actor: User;
  reviewId: string;
  status: "REVIEWING" | "CLOSED";
}) {
  if (!canAccessRole(input.actor, "COMMITTEE")) {
    throw new Error("위원회 심의 권한이 없습니다.");
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const review = await tx.committeeReview.findUnique({
      where: { id: input.reviewId },
      select: { id: true, contributionId: true, status: true }
    });

    if (!review) {
      throw new Error("심의 항목을 찾을 수 없습니다.");
    }

    if (review.status === "CLOSED") {
      throw new Error("이미 종결된 심의 항목입니다.");
    }

    const saved = await tx.committeeReview.update({
      where: { id: input.reviewId },
      data: { status: input.status }
    });

    await tx.auditEvent.create({
      data: {
        actorId: input.actor.id,
        contributionId: review.contributionId,
        action: input.status === "REVIEWING" ? "REVIEW_STARTED" : "REVIEW_CLOSED",
        details: { reviewId: input.reviewId }
      }
    });

    return saved;
  });
}

export function revalidateTcreditPages() {
  ["/", "/approvals", "/approver-insights", "/committee", "/contributions/mine"].forEach((path) => {
    revalidatePath(path);
  });
}
