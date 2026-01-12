"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberManagement from "./member-management";
import RedemptionRequests from "./redemption-requests";
import UCTransactions from "./uc-transactions";
import OnrampTransactions from "./onramp-transactions";

export default function AdminPanel() {
  return (
    <Tabs defaultValue="members" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="members">Member Management</TabsTrigger>
        <TabsTrigger value="redemptions">Redemption Requests</TabsTrigger>
        <TabsTrigger value="uc-transactions">UC Transfers</TabsTrigger>
        <TabsTrigger value="onramp">Onramp</TabsTrigger>
      </TabsList>
      <TabsContent value="members">
        <MemberManagement />
      </TabsContent>
      <TabsContent value="redemptions">
        <RedemptionRequests />
      </TabsContent>
      <TabsContent value="uc-transactions">
        <UCTransactions />
      </TabsContent>
      <TabsContent value="onramp">
        <OnrampTransactions />
      </TabsContent>
    </Tabs>
  );
}
