"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MemberManagement from "./member-management";
import RedemptionRequests from "./redemption-requests";

export default function AdminPanel() {
  return (
    <Tabs defaultValue="members" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="members">Member Management</TabsTrigger>
        <TabsTrigger value="redemptions">Redemption Requests</TabsTrigger>
      </TabsList>
      <TabsContent value="members">
        <MemberManagement />
      </TabsContent>
      <TabsContent value="redemptions">
        <RedemptionRequests />
      </TabsContent>
    </Tabs>
  );
}
