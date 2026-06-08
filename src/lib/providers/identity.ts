import { cookies } from "next/headers";
import { User } from "@/lib/domain";
import { isMockIdentityEnabled } from "@/lib/security";
import { getDefaultUser, getUserById } from "@/lib/server/tcredit-repository";

const mockUserCookieName = "tcredit_mock_user_id";

export interface IdentityProvider {
  getCurrentUser(userId?: string): Promise<User>;
}

export class DatabaseIdentityProvider implements IdentityProvider {
  async getCurrentUser(userId?: string) {
    const user = await getUserById(userId);
    if (user) {
      return user;
    }

    if (isMockIdentityEnabled()) {
      return getDefaultUser();
    }

    throw new Error("인증된 사용자를 확인할 수 없습니다.");
  }
}

const provider = new DatabaseIdentityProvider();

export async function getCurrentUser() {
  const cookieStore = await cookies();
  return provider.getCurrentUser(cookieStore.get(mockUserCookieName)?.value);
}

export { mockUserCookieName };
