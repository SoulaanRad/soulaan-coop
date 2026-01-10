import MemberManagement from "@/components/portal/member-management";

export default function MembersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Member Management</h1>
        <p className="text-gray-400 mt-1">View and manage all co-op members</p>
      </div>
      <MemberManagement />
    </div>
  );
}
