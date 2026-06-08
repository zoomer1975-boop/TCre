"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { mockUserCookieName } from "@/lib/providers/identity";
import { isMockIdentityEnabled } from "@/lib/security";
import { getUserById } from "@/lib/server/tcredit-repository";

export async function switchUserAction(userId: string) {
  if (!isMockIdentityEnabled()) {
    throw new Error("운영 환경에서는 목 계정 전환을 사용할 수 없습니다.");
  }

  const user = await getUserById(userId);

  if (!user) {
    throw new Error("존재하지 않는 사용자입니다.");
  }

  const cookieStore = await cookies();
  cookieStore.set(mockUserCookieName, user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  revalidatePath("/", "layout");

  return user;
}
