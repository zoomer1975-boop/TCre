export function isMockIdentityEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.ENABLE_MOCK_IDENTITY === "true";
}

export function isWithinMaxLength(value: string, maxLength: number) {
  return value.length <= maxLength;
}

export function lengthErrorMessage(label: string, maxLength: number) {
  return `${label}은(는) ${maxLength}자 이내로 입력해 주세요.`;
}

