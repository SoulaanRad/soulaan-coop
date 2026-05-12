import MemberManagement from "@/components/portal/member-management";

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Members</h1>
        <p className="mt-1 text-zinc-400">Review membership status, wallets, and co-op access</p>
      </div>
      <MemberManagement />
    </div>
  );
}
