export type Role = "CONTRIBUTOR" | "APPROVER" | "COMMITTEE" | "ADMIN";

export type EmploymentType = "FACULTY" | "STAFF" | "CONTRACT";

export type ContributionType =
  | "EXCELLENCE"
  | "COLLABORATION"
  | "IMPROVEMENT"
  | "CHALLENGE"
  | "PRIDE"
  | "DEDICATION";

export type EffortTier = "L1" | "L2" | "L3";

export type ContributionStatus =
  | "DRAFT"
  | "PENDING_RECOMMEND"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "UNBILLABLE"
  | "UNDER_REVIEW";

export interface OrgUnit {
  id: string;
  name: string;
  code: string;
  parentId?: string;
}

export interface User {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  employmentType: EmploymentType;
  position: string;
  orgUnitCode: string;
  roles: Role[];
}

export interface Recommendation {
  id: string;
  contributionId: string;
  recommenderId: string;
  comment?: string;
  isPrivate: boolean;
  status: "REQUESTED" | "SUBMITTED" | "CANCELED";
  notificationChannel?: "EMAIL" | "IN_APP";
  notifiedAt?: string;
  submittedAt?: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  contributionId: string;
  approverId: string;
  inputScore: 0 | 1;
  outcomeScore: 0 | 1;
  impactScore: 0 | 1;
  finalTier: EffortTier;
  finalCredit: number;
  decision: Extract<ContributionStatus, "APPROVED" | "REJECTED">;
  comment: string;
  createdAt: string;
}

export interface Appeal {
  id: string;
  contributionId: string;
  appellantId: string;
  reason: string;
  status: "SUBMITTED" | "REVIEWING" | "RESOLVED" | "DISMISSED";
  resolution?: string;
  createdAt: string;
}

export const appealStatusLabels: Record<Appeal["status"], string> = {
  SUBMITTED: "접수",
  REVIEWING: "검토 중",
  RESOLVED: "재심의 회부",
  DISMISSED: "기각"
};

export interface CommitteeReview {
  id: string;
  contributionId: string;
  signalType: string;
  severity: "낮음" | "보통" | "높음";
  status: "OPEN" | "REVIEWING" | "CLOSED";
  note?: string;
}

export const reviewStatusLabels: Record<CommitteeReview["status"], string> = {
  OPEN: "접수",
  REVIEWING: "검토 중",
  CLOSED: "종결"
};

export interface Contribution {
  id: string;
  contributorId: string;
  title: string;
  description: string;
  type: ContributionType;
  activityDate: string;
  relatedOrgUnitCode: string;
  status: ContributionStatus;
  requestedTier: EffortTier;
  expectedCredit: number;
  submittedWithin30d: boolean;
  createdAt: string;
}

export interface BudgetPool {
  year: number;
  term: string;
  totalBudgetKrw: number;
  nominalCreditValue: number;
  issuedCreditLimit: number;
  issuedCredit: number;
}

export const contributionTypeLabels: Record<ContributionType, string> = {
  EXCELLENCE: "탁월",
  COLLABORATION: "협력",
  IMPROVEMENT: "개선",
  CHALLENGE: "도전",
  PRIDE: "긍지",
  DEDICATION: "헌신"
};

export const contributionTypeDescriptions: Record<ContributionType, string> = {
  EXCELLENCE: "뛰어난 업무 성과 창출",
  COLLABORATION: "통상업무 외 중요 업무 참여",
  IMPROVEMENT: "기존 업무의 문제 해결",
  CHALLENGE: "신규 및 고난도 업무 수행",
  PRIDE: "대외적 위상 제고",
  DEDICATION: "기타 공헌 활동"
};

export const contributionTypes = Object.keys(contributionTypeLabels) as ContributionType[];

export const tierLabels: Record<EffortTier, string> = {
  L1: "L1 단발",
  L2: "L2 단기집중",
  L3: "L3 중기프로젝트"
};

export const effortTiers = Object.keys(tierLabels) as EffortTier[];

export const tierMultipliers: Record<EffortTier, number> = {
  L1: 1,
  L2: 3,
  L3: 6
};

export const tierDetails: Record<
  EffortTier,
  {
    label: string;
    meaning: string;
    appliedTo: string;
    multiplier: number;
  }
> = {
  L1: {
    label: "단발",
    meaning: "일회성",
    appliedTo: "회의 1~2회, 단건 자료",
    multiplier: tierMultipliers.L1
  },
  L2: {
    label: "단기집중",
    meaning: "수일~1주",
    appliedTo: "단기 TF, 보고서 1건",
    multiplier: tierMultipliers.L2
  },
  L3: {
    label: "중기프로젝트",
    meaning: "수주~수개월",
    appliedTo: "사업 제안서, 평가 대응",
    multiplier: tierMultipliers.L3
  }
};

export const statusLabels: Record<ContributionStatus, string> = {
  DRAFT: "초안",
  PENDING_RECOMMEND: "추천 대기",
  PENDING_APPROVAL: "승인 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  UNBILLABLE: "입력기한 초과",
  UNDER_REVIEW: "위원회 검토"
};

export const statusGuides: Record<
  ContributionStatus,
  {
    meaning: string;
    nextStep: string;
  }
> = {
  DRAFT: {
    meaning: "아직 제출되지 않은 작성 중 상태입니다.",
    nextStep: "입력을 완료하면 추천인 지정 여부와 활동일 기준에 따라 추천 대기, 승인 대기, 입력기한 초과로 이동합니다."
  },
  PENDING_RECOMMEND: {
    meaning: "관련 부서 구성원 또는 지정 추천인의 추천 의견을 기다리는 단계입니다.",
    nextStep: "추천 의견이 제출되면 승인권자 검토를 위한 승인 대기 단계로 이동합니다."
  },
  PENDING_APPROVAL: {
    meaning: "승인권자가 공헌 내용, 추천 의견, 예상 Credit을 검토하는 단계입니다.",
    nextStep: "승인되면 Credit이 확정되고, 설명이 부족하거나 인정 범위가 아니면 반려될 수 있습니다."
  },
  APPROVED: {
    meaning: "공헌이 인정되어 최종 Credit이 확정된 상태입니다.",
    nextStep: "확정 Credit은 공헌 내역과 누적 Credit에 반영됩니다."
  },
  REJECTED: {
    meaning: "승인권자가 공헌 인정 대상이 아니거나 보완이 필요하다고 판단한 상태입니다.",
    nextStep: "반려 사유를 확인한 뒤 필요하면 보완 또는 이의신청 절차를 진행합니다."
  },
  UNBILLABLE: {
    meaning: "활동일 기준 30일을 초과해 입력되어 일반 승인 대상에서 제외된 상태입니다.",
    nextStep: "운영 정책에 따라 unbillable로 분류됩니다."
  },
  UNDER_REVIEW: {
    meaning: "이상 징후, 이의신청, 비공개 의견 등으로 위원회가 확인하는 단계입니다.",
    nextStep: "검토 결과에 따라 승인, 반려, 조정 등 후속 처리가 결정됩니다."
  }
};

export const approvalDecisions = ["APPROVED", "REJECTED"] as const;

export function isContributionType(value: string): value is ContributionType {
  return contributionTypes.includes(value as ContributionType);
}

export function isEffortTier(value: string): value is EffortTier {
  return effortTiers.includes(value as EffortTier);
}

export function isApprovalDecision(value: string): value is Approval["decision"] {
  return approvalDecisions.includes(value as Approval["decision"]);
}

export function calculateCredit(
  inputScore: 0 | 1,
  outcomeScore: 0 | 1,
  impactScore: 0 | 1,
  tier: EffortTier
) {
  return (inputScore + outcomeScore + impactScore) * tierMultipliers[tier];
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSubmittedWithin30Days(activityDate: Date, submittedAt: Date) {
  const millisPerDay = 24 * 60 * 60 * 1000;
  const diff = startOfLocalDay(submittedAt).getTime() - startOfLocalDay(activityDate).getTime();
  const dayDiff = Math.round(diff / millisPerDay);

  return dayDiff >= 0 && dayDiff <= 30;
}

export function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function resolveInitialStatus(
  activityDate: Date,
  submittedAt: Date,
  hasRecommenders = false
): ContributionStatus {
  if (!isSubmittedWithin30Days(activityDate, submittedAt)) {
    return "UNBILLABLE";
  }

  return hasRecommenders ? "PENDING_RECOMMEND" : "PENDING_APPROVAL";
}

export function canAccessRole(user: User, role: Role) {
  return user.roles.includes(role) || user.roles.includes("ADMIN");
}

export function canApproveContribution(
  user: User,
  contribution: Pick<Contribution, "relatedOrgUnitCode" | "status">
) {
  if (!canAccessRole(user, "APPROVER")) {
    return false;
  }

  if (contribution.status !== "PENDING_APPROVAL") {
    return false;
  }

  return user.roles.includes("ADMIN") || contribution.relatedOrgUnitCode === user.orgUnitCode;
}

export function formatKrw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
