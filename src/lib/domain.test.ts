import { describe, expect, it } from "vitest";
import {
  Contribution,
  User,
  calculateCredit,
  canAccessRole,
  canApproveContribution,
  isApprovalDecision,
  isContributionType,
  isEffortTier,
  isSubmittedWithin30Days,
  resolveInitialStatus
} from "@/lib/domain";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user",
    employeeNo: "1",
    name: "User",
    email: "user@kmu.ac.kr",
    employmentType: "STAFF",
    position: "담당",
    orgUnitCode: "PLANNING",
    roles: ["CONTRIBUTOR"],
    ...overrides
  };
}

function makeContribution(overrides: Partial<Contribution> = {}): Contribution {
  return {
    id: "contribution",
    contributorId: "contributor",
    title: "공헌",
    description: "설명",
    type: "COLLABORATION",
    activityDate: "2026-06-01",
    relatedOrgUnitCode: "PLANNING",
    status: "PENDING_APPROVAL",
    requestedTier: "L1",
    expectedCredit: 3,
    submittedWithin30d: true,
    createdAt: "2026-06-01",
    ...overrides
  };
}

describe("T-Credit domain rules", () => {
  it("calculates credit using input, outcome, impact and effort tier", () => {
    expect(calculateCredit(1, 1, 1, "L1")).toBe(3);
    expect(calculateCredit(1, 1, 0, "L2")).toBe(6);
    expect(calculateCredit(1, 1, 1, "L3")).toBe(18);
  });

  it("treats submissions after 30 days as unbillable", () => {
    expect(isSubmittedWithin30Days(new Date("2026-05-03"), new Date("2026-06-02"))).toBe(true);
    expect(isSubmittedWithin30Days(new Date("2026-05-02"), new Date("2026-06-02"))).toBe(false);
    expect(resolveInitialStatus(new Date("2026-05-02"), new Date("2026-06-02"))).toBe("UNBILLABLE");
  });

  it("ignores the time of day when checking the 30-day window", () => {
    expect(isSubmittedWithin30Days(new Date(2026, 4, 3), new Date(2026, 5, 2, 23, 59))).toBe(true);
    expect(isSubmittedWithin30Days(new Date(2026, 4, 2), new Date(2026, 5, 2, 0, 1))).toBe(false);
    expect(isSubmittedWithin30Days(new Date(2026, 5, 2, 9, 0), new Date(2026, 5, 2, 8, 0))).toBe(true);
  });

  it("routes current submissions by recommender assignment", () => {
    expect(resolveInitialStatus(new Date("2026-06-01"), new Date("2026-06-02"), false)).toBe("PENDING_APPROVAL");
    expect(resolveInitialStatus(new Date("2026-06-01"), new Date("2026-06-02"), true)).toBe("PENDING_RECOMMEND");
  });

  it("lets admins access role-gated screens", () => {
    expect(
      canAccessRole(
        makeUser({ name: "Admin", email: "admin@kmu.ac.kr", position: "관리자", roles: ["ADMIN"] }),
        "COMMITTEE"
      )
    ).toBe(true);
  });

  it("validates form enum values at runtime", () => {
    expect(isContributionType("COLLABORATION")).toBe(true);
    expect(isContributionType("UNKNOWN")).toBe(false);
    expect(isEffortTier("L2")).toBe(true);
    expect(isEffortTier("L9")).toBe(false);
    expect(isApprovalDecision("APPROVED")).toBe(true);
    expect(isApprovalDecision("PENDING_APPROVAL")).toBe(false);
  });

  it("allows approvers to process only pending contributions in their org", () => {
    const approver = makeUser({ roles: ["CONTRIBUTOR", "APPROVER"], orgUnitCode: "PLANNING" });

    expect(canApproveContribution(approver, makeContribution())).toBe(true);
    expect(canApproveContribution(approver, makeContribution({ relatedOrgUnitCode: "GLOBAL" }))).toBe(false);
    expect(canApproveContribution(approver, makeContribution({ status: "PENDING_RECOMMEND" }))).toBe(false);
    expect(canApproveContribution(approver, makeContribution({ status: "APPROVED" }))).toBe(false);
  });

  it("lets admins approve any pending contribution but rejects non-approvers", () => {
    const admin = makeUser({ roles: ["ADMIN"], orgUnitCode: "PLANNING" });
    const contributor = makeUser({ roles: ["CONTRIBUTOR"], orgUnitCode: "PLANNING" });

    expect(canApproveContribution(admin, makeContribution({ relatedOrgUnitCode: "GLOBAL" }))).toBe(true);
    expect(canApproveContribution(contributor, makeContribution())).toBe(false);
  });
});
