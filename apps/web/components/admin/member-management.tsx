"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";

const mockMembers = [
  {
    id: "1",
    address: "0x1234...5678",
    status: "Active",
  },
  {
    id: "2",
    address: "0xabcd...efgh",
    status: "Suspended",
  },
  {
    id: "3",
    address: "0x9876...5432",
    status: "Banned",
  },
];

export default function MemberManagement() {
  const [members, setMembers] = useState(mockMembers);

  const handleStatusChange = (id: string, newStatus: string) => {
    // In a real app, this would be an API call
    console.log(`Updating member ${id} to status ${newStatus}`);
    setMembers(
      members.map((member) =>
        member.id === id ? { ...member, status: newStatus } : member
      )
    );
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-mono">{member.address}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    member.status === "Active"
                      ? "default"
                      : member.status === "Suspended"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(member.id, "Active")}
                    >
                      Set as Active
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(member.id, "Suspended")}
                    >
                      Set as Suspended
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(member.id, "Banned")}
                    >
                      Set as Banned
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
