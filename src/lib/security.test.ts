import { afterEach, describe, expect, it, vi } from "vitest";
import { isMockIdentityEnabled, isWithinMaxLength, lengthErrorMessage } from "@/lib/security";

describe("security helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables mock identity in production unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_MOCK_IDENTITY", "");
    expect(isMockIdentityEnabled()).toBe(false);

    vi.stubEnv("ENABLE_MOCK_IDENTITY", "true");
    expect(isMockIdentityEnabled()).toBe(true);
  });

  it("validates string length limits", () => {
    expect(isWithinMaxLength("abc", 3)).toBe(true);
    expect(isWithinMaxLength("abcd", 3)).toBe(false);
    expect(lengthErrorMessage("공헌 제목", 255)).toContain("255자");
  });
});
