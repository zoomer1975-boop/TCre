import { OrgUnit, User } from "@/lib/domain";

export function createUserNameLookup(users: User[]) {
  return Object.fromEntries(users.map((user) => [user.id, user.name]));
}

export function createOrgNameLookup(orgUnits: OrgUnit[]) {
  return Object.fromEntries(orgUnits.map((orgUnit) => [orgUnit.code, orgUnit.name]));
}
