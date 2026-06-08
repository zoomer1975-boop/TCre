const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const orgUnits = [
  { id: "org-univ", name: "계명대학교", code: "KMU" },
  { id: "org-innovation", name: "대학혁신지원사업단", code: "INNOVATION", parentId: "org-univ" },
  { id: "org-planning", name: "기획처", code: "PLANNING", parentId: "org-univ" },
  { id: "org-global", name: "국제처", code: "GLOBAL", parentId: "org-univ" },
  { id: "org-engineering", name: "공과대학", code: "ENGINEERING", parentId: "org-univ" },
  { id: "org-finance", name: "재무팀", code: "FINANCE", parentId: "org-univ" }
];

const users = [
  {
    id: "user-01",
    employeeNo: "K2026001",
    name: "김하늘",
    email: "haneul.kim@kmu.ac.kr",
    employmentType: "STAFF",
    position: "대학혁신지원사업 담당",
    orgUnitId: "org-innovation",
    roles: ["CONTRIBUTOR"]
  },
  {
    id: "user-07",
    employeeNo: "K2026007",
    name: "오지훈",
    email: "jihoon.oh@kmu.ac.kr",
    employmentType: "STAFF",
    position: "대학혁신지원사업단 팀장",
    orgUnitId: "org-innovation",
    roles: ["CONTRIBUTOR", "APPROVER"]
  },
  {
    id: "user-02",
    employeeNo: "K2026002",
    name: "박도윤",
    email: "doyun.park@kmu.ac.kr",
    employmentType: "STAFF",
    position: "팀장",
    orgUnitId: "org-planning",
    roles: ["CONTRIBUTOR", "APPROVER"]
  },
  {
    id: "user-03",
    employeeNo: "K2026003",
    name: "이서연",
    email: "seoyeon.lee@kmu.ac.kr",
    employmentType: "FACULTY",
    position: "컴퓨터공학과 교수",
    orgUnitId: "org-engineering",
    roles: ["CONTRIBUTOR"]
  },
  {
    id: "user-04",
    employeeNo: "K2026004",
    name: "정민준",
    email: "minjun.jung@kmu.ac.kr",
    employmentType: "STAFF",
    position: "부처장",
    orgUnitId: "org-global",
    roles: ["CONTRIBUTOR", "APPROVER", "COMMITTEE"]
  },
  {
    id: "user-05",
    employeeNo: "K2026005",
    name: "최유진",
    email: "yujin.choi@kmu.ac.kr",
    employmentType: "STAFF",
    position: "제도 관리자",
    orgUnitId: "org-planning",
    roles: ["CONTRIBUTOR", "APPROVER", "COMMITTEE", "ADMIN"]
  },
  {
    id: "user-06",
    employeeNo: "K2026006",
    name: "공과대 학장",
    email: "engineering.dean@kmu.ac.kr",
    employmentType: "FACULTY",
    position: "공과대 학장",
    orgUnitId: "org-engineering",
    roles: ["CONTRIBUTOR", "APPROVER"]
  }
];

const contributions = [
  {
    id: "contrib-01",
    contributorId: "user-01",
    title: "대학혁신지원사업 사업비 집중 처리 지원",
    description: "연말 사업비 처리량이 급증한 기간에 재무팀과 협력하여 증빙 확인과 집행 문서 정리를 주도했습니다.",
    type: "COLLABORATION",
    activityDate: new Date("2026-05-20"),
    relatedOrgUnitCode: "FINANCE",
    status: "APPROVED",
    requestedTier: "L2",
    expectedCredit: 6,
    submittedWithin30d: true
  },
  {
    id: "contrib-02",
    contributorId: "user-03",
    title: "AI 부트캠프 사업 제안서 공동 집필",
    description: "공과대학 교수진 5명과 함께 신규 사업 제안서를 작성하고 내부 평가 대응 자료를 정리했습니다.",
    type: "CHALLENGE",
    activityDate: new Date("2026-05-08"),
    relatedOrgUnitCode: "INNOVATION",
    status: "PENDING_APPROVAL",
    requestedTier: "L3",
    expectedCredit: 18,
    submittedWithin30d: true
  },
  {
    id: "contrib-03",
    contributorId: "user-01",
    title: "국제학생 행정지원 매뉴얼 개선",
    description: "국제학생 문의 유형을 정리하고 처리 절차를 표준화하여 반복 민원 대응 시간을 줄였습니다.",
    type: "IMPROVEMENT",
    activityDate: new Date("2026-04-20"),
    relatedOrgUnitCode: "GLOBAL",
    status: "UNDER_REVIEW",
    requestedTier: "L2",
    expectedCredit: 9,
    submittedWithin30d: false
  },
  {
    id: "contrib-04",
    contributorId: "user-02",
    title: "대학 구조개편 회의 자료 긴급 작성",
    description: "기획처 긴급 TF에서 부서별 데이터를 취합하고 총괄 보고서 초안을 작성했습니다.",
    type: "EXCELLENCE",
    activityDate: new Date("2026-05-27"),
    relatedOrgUnitCode: "PLANNING",
    status: "REJECTED",
    requestedTier: "L1",
    expectedCredit: 3,
    submittedWithin30d: true
  }
];

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.committeeReview.deleteMany();
  await prisma.appeal.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.user.deleteMany();
  await prisma.orgUnit.deleteMany();
  await prisma.budgetPool.deleteMany();

  await prisma.orgUnit.create({ data: orgUnits[0] });
  for (const orgUnit of orgUnits.slice(1)) {
    await prisma.orgUnit.create({ data: orgUnit });
  }
  await prisma.user.createMany({ data: users });
  await prisma.contribution.createMany({ data: contributions });
  await prisma.recommendation.createMany({
    data: [
      {
        id: "rec-01",
        contributionId: "contrib-01",
        recommenderId: "user-02",
        comment: "타 부서 요청에도 처리 기준을 명확히 안내해 일정 지연을 막았습니다.",
        isPrivate: false,
        status: "SUBMITTED",
        notificationChannel: "EMAIL",
        notifiedAt: new Date("2026-05-25"),
        submittedAt: new Date("2026-05-26")
      },
      {
        id: "rec-02",
        contributionId: "contrib-02",
        recommenderId: "user-01",
        comment: "단기간에 제안서 완성도를 높이는 데 실질적으로 기여했습니다.",
        isPrivate: false,
        status: "SUBMITTED",
        notificationChannel: "EMAIL",
        notifiedAt: new Date("2026-05-22"),
        submittedAt: new Date("2026-05-23")
      },
      {
        id: "rec-03",
        contributionId: "contrib-03",
        recommenderId: "user-04",
        comment: "기한 초과 여부 검토가 필요하지만 매뉴얼 개선 효과는 확인되었습니다.",
        isPrivate: true,
        status: "SUBMITTED",
        notificationChannel: "IN_APP",
        notifiedAt: new Date("2026-05-28"),
        submittedAt: new Date("2026-05-29")
      }
    ]
  });
  await prisma.approval.createMany({
    data: [
      {
        id: "approval-01",
        contributionId: "contrib-01",
        approverId: "user-02",
        inputScore: 1,
        outcomeScore: 1,
        impactScore: 0,
        finalTier: "L2",
        finalCredit: 6,
        decision: "APPROVED",
        comment: "타 부서 협력 부담을 줄인 점을 인정합니다."
      },
      {
        id: "approval-02",
        contributionId: "contrib-04",
        approverId: "user-04",
        inputScore: 0,
        outcomeScore: 0,
        impactScore: 0,
        finalTier: "L1",
        finalCredit: 0,
        decision: "REJECTED",
        comment: "통상적인 회의자료 준비 범위를 벗어난 기여가 충분히 설명되지 않았습니다."
      }
    ]
  });
  await prisma.appeal.create({
    data: {
      id: "appeal-01",
      contributionId: "contrib-04",
      appellantId: "user-02",
      reason: "긴급 TF 참여와 야간 작업이 있었으므로 단순 회의자료 준비와 다릅니다.",
      status: "SUBMITTED"
    }
  });
  await prisma.committeeReview.createMany({
    data: [
      {
        id: "review-01",
        contributionId: "contrib-03",
        signalType: "30일 초과 입력",
        severity: "보통",
        status: "OPEN",
        note: "unbillable 처리 여부와 활동 효과를 함께 검토"
      },
      {
        id: "review-02",
        contributionId: "contrib-04",
        signalType: "반려 이의신청",
        severity: "높음",
        status: "REVIEWING",
        note: "승인권자 의견과 신청자 소명 비교 필요"
      }
    ]
  });
  await prisma.budgetPool.create({
    data: {
      year: 2026,
      term: "하반기 시범운영",
      totalBudgetKrw: BigInt(800_000_000),
      nominalCreditValue: 50_000,
      issuedCreditLimit: 16_000
    }
  });
  await prisma.auditEvent.createMany({
    data: [
      {
        actorId: "user-02",
        contributionId: "contrib-01",
        action: "APPROVED",
        details: { finalCredit: 6, finalTier: "L2" }
      },
      {
        actorId: "user-04",
        contributionId: "contrib-04",
        action: "REJECTED",
        details: { finalCredit: 0, finalTier: "L1" }
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
