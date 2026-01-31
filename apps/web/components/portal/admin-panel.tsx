"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberManagement from "./member-management";
import RedemptionRequests from "./redemption-requests";
import AllTransactions from "./all-transactions";
import UCTransactions from "./uc-transactions";
import TreasuryDashboard from "./treasury-dashboard";

export default function AdminPanel() {
  return (
    <Tabs defaultValue="treasury" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
        </TabsList>
        <TabsContent value="treasury">
          <TreasuryDashboard />
        </TabsContent>
        <TabsContent value="members">
          <MemberManagement />
        </TabsContent>
        <TabsContent value="transactions">
          <AllTransactions />
        </TabsContent>
        <TabsContent value="blockchain">
          <UCTransactions />
        </TabsContent>
        <TabsContent value="redemptions">
          <RedemptionRequests />
        </TabsContent>
    </Tabs>
  );
}
