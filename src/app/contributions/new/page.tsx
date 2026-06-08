import { ContributionForm } from "@/components/ContributionForm";
import { PageHeader } from "@/components/PageHeader";
import { formatDateInputValue } from "@/lib/domain";
import { getCurrentUser } from "@/lib/providers/identity";
import { listOrgUnits, listUsers } from "@/lib/server/tcredit-repository";

export default async function NewContributionPage() {
  const [orgUnits, users, currentUser] = await Promise.all([listOrgUnits(), listUsers(), getCurrentUser()]);
  const today = formatDateInputValue(new Date());

  return (
    <>
      <PageHeader
        eyebrow="Contribution Log"
        title="공헌 입력"
        description=""
      />
      <ContributionForm orgUnits={orgUnits} users={users} currentUserId={currentUser.id} today={today} />
    </>
  );
}
