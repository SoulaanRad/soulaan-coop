"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Redemption {
  id: string;
  user: string;
  amount: string;
  date: string;
  status: string;
  reason?: string;
}

function RedemptionTable({
  redemptions,
  onProcess,
}: {
  redemptions: Redemption[];
  onProcess: (id: string, action: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            {redemptions[0]?.status === "Needs Review" && (
              <TableHead>Reason</TableHead>
            )}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {redemptions.map((req) => (
            <TableRow key={req.id}>
              <TableCell className="font-mono">{req.user}</TableCell>
              <TableCell>{req.amount}</TableCell>
              <TableCell>{req.date}</TableCell>
              {req.status === "Needs Review" && (
                <TableCell>
                  <Badge variant="destructive">{req.reason}</Badge>
                </TableCell>
              )}
              <TableCell className="text-right space-x-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onProcess(req.id, "Fulfill")}
                >
                  Fulfill
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onProcess(req.id, "Cancel")}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onProcess(req.id, "Forfeit")}
                >
                  Forfeit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function RedemptionRequests() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);

  useEffect(() => {
    fetch("/api/admin/redemptions")
      .then((res) => res.json())
      .then(setRedemptions);
  }, []);

  const handleProcessRequest = async (id: string, action: string) => {
    await fetch(`/api/admin/redemptions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setRedemptions(redemptions.filter((req) => req.id !== id));
  };

  const pendingRedemptions = redemptions.filter(
    (r) => r.status === "Pending"
  );
  const needsReviewRedemptions = redemptions.filter(
    (r) => r.status === "Needs Review"
  );

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">
          Pending ({pendingRedemptions.length})
        </TabsTrigger>
        <TabsTrigger value="needsReview">
          Needs Review ({needsReviewRedemptions.length})
        </TabsTrigger>
      </TabsList>
      <TabsContent value="pending">
        <RedemptionTable
          redemptions={pendingRedemptions}
          onProcess={handleProcessRequest}
        />
      </TabsContent>
      <TabsContent value="needsReview">
        <RedemptionTable
          redemptions={needsReviewRedemptions}
          onProcess={handleProcessRequest}
        />
      </TabsContent>
    </Tabs>
  );
}
