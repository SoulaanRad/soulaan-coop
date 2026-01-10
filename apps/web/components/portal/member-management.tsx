"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Eye, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export default function MemberManagement() {
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch users based on filter
  const allUsersQuery = api.admin.getAllUsersWithApplications.useQuery(undefined, {
    enabled: statusFilter === 'ALL',
  });
  const allUsers = allUsersQuery.data?.json;

  const filteredUsersQuery = api.admin.getUsersByStatus.useQuery(
    { status: statusFilter as UserStatus },
    { enabled: statusFilter !== 'ALL' }
  );
  const filteredUsers = filteredUsersQuery.data?.json;

  // Use the appropriate query and data based on filter
  const isLoading = statusFilter === 'ALL' ? allUsersQuery.isLoading : filteredUsersQuery.isLoading;
  const error = statusFilter === 'ALL' ? allUsersQuery.error : filteredUsersQuery.error;
  const refetch = statusFilter === 'ALL' ? allUsersQuery.refetch : filteredUsersQuery.refetch;
  const users = statusFilter === 'ALL' ? allUsers : filteredUsers;

  console.log('🔍 Member Management Debug:', {
    statusFilter,
    users,
    isLoading,
    error: error?.message,
    usersCount: users?.length
  });

  // Get stats
  const { data: statsResponse, error: statsError } = api.admin.getApplicationStats.useQuery(undefined, {
    onError: (err) => {
      console.error('❌ Error loading stats:', err);
    },
  });
  const stats = statsResponse?.json;

  // Update status mutation
  const updateStatus = api.admin.updateUserStatus.useMutation({
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      setReviewNotes("");
    },
  });

  const handleStatusChange = (userId: string, newStatus: UserStatus) => {
    updateStatus.mutate({
      userId,
      status: newStatus,
      reviewNotes: reviewNotes || undefined,
    });
  };

  const handleViewApplication = (user: any) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PENDING':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'REJECTED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'SUSPENDED':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-500 text-center">
          <p className="font-semibold">Error loading users</p>
          <p className="text-sm text-gray-400 mt-2">{error.message}</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-slate-800 border border-yellow-500/20 rounded-lg p-4">
            <div className="text-sm text-yellow-400">Pending</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          </div>
          <div className="bg-slate-800 border border-green-500/20 rounded-lg p-4">
            <div className="text-sm text-green-400">Active</div>
            <div className="text-2xl font-bold text-green-400">{stats.active}</div>
          </div>
          <div className="bg-slate-800 border border-red-500/20 rounded-lg p-4">
            <div className="text-sm text-red-400">Rejected</div>
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
          </div>
          <div className="bg-slate-800 border border-orange-500/20 rounded-lg p-4">
            <div className="text-sm text-orange-400">Suspended</div>
            <div className="text-2xl font-bold text-orange-400">{stats.suspended}</div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Label htmlFor="status-filter" className="text-sm font-medium text-gray-200">
          Filter by status:
        </Label>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-white">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="ALL" className="text-white hover:bg-slate-700">All users</SelectItem>
            <SelectItem value="PENDING" className="text-white hover:bg-slate-700">Pending</SelectItem>
            <SelectItem value="ACTIVE" className="text-white hover:bg-slate-700">Active</SelectItem>
            <SelectItem value="REJECTED" className="text-white hover:bg-slate-700">Rejected</SelectItem>
            <SelectItem value="SUSPENDED" className="text-white hover:bg-slate-700">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead>Application</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users && users.length > 0 ? (
              users.map((user: any) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {user.phone || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(user.status)}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    {user.application ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewApplication(user)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-500">No application</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.status === 'PENDING' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-500 hover:text-green-400"
                            onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                            disabled={updateStatus.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-400"
                            onClick={() => handleStatusChange(user.id, 'REJECTED')}
                            disabled={updateStatus.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {user.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-500 hover:text-orange-400"
                          onClick={() => handleStatusChange(user.id, 'SUSPENDED')}
                          disabled={updateStatus.isPending}
                        >
                          Suspend
                        </Button>
                      )}
                      {user.status === 'SUSPENDED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-500 hover:text-green-400"
                          onClick={() => handleStatusChange(user.id, 'ACTIVE')}
                          disabled={updateStatus.isPending}
                        >
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Application Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review application for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser?.application && (
            <div className="space-y-4">
              {/* Personal Information */}
              <div>
                <h3 className="font-semibold mb-2 text-sm text-gray-400">Personal Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{' '}
                    <span className="font-medium">
                      {selectedUser.application.data.firstName} {selectedUser.application.data.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{' '}
                    <span className="font-medium">{selectedUser.application.data.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{' '}
                    <span className="font-medium">{selectedUser.application.data.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Identity:</span>{' '}
                    <span className="font-medium capitalize">
                      {selectedUser.application.data.identity?.replace(/-/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commitment */}
              <div>
                <h3 className="font-semibold mb-2 text-sm text-gray-400">Commitment & Participation</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Agree to Mission:</span>{' '}
                    <Badge variant={selectedUser.application.data.agreeToMission === 'yes' ? 'default' : 'secondary'}>
                      {selectedUser.application.data.agreeToMission}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Monthly Commitment:</span>{' '}
                    <span className="font-medium">{selectedUser.application.data.monthlyCommitment}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Use UC:</span>{' '}
                    <Badge variant={selectedUser.application.data.useUC === 'yes' ? 'default' : 'secondary'}>
                      {selectedUser.application.data.useUC}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-gray-500">Accept Fees:</span>{' '}
                    <Badge variant={selectedUser.application.data.acceptFees === 'yes' ? 'default' : 'secondary'}>
                      {selectedUser.application.data.acceptFees}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Spending Categories */}
              {selectedUser.application.data.spendingCategories && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-gray-400">Spending Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.application.data.spendingCategories.map((cat: string, i: number) => (
                      <Badge key={i} variant="outline">{cat}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivation & Desired Service */}
              {(selectedUser.application.data.motivation || selectedUser.application.data.desiredService) && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-gray-400">Additional Information</h3>
                  {selectedUser.application.data.motivation && (
                    <div className="mb-3">
                      <span className="text-gray-500 text-sm block mb-1">Motivation:</span>
                      <p className="text-sm bg-slate-900 p-3 rounded">
                        {selectedUser.application.data.motivation}
                      </p>
                    </div>
                  )}
                  {selectedUser.application.data.desiredService && (
                    <div>
                      <span className="text-gray-500 text-sm block mb-1">Desired Service:</span>
                      <p className="text-sm bg-slate-900 p-3 rounded">
                        {selectedUser.application.data.desiredService}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Review Section */}
              <div>
                <Label htmlFor="review-notes" className="text-sm font-medium">
                  Review Notes (optional)
                </Label>
                <Textarea
                  id="review-notes"
                  placeholder="Add notes about this application review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-2"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedUser?.status === 'PENDING' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange(selectedUser.id, 'REJECTED')}
                  disabled={updateStatus.isPending}
                  className="text-red-500 hover:text-red-400 border-red-500/20"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleStatusChange(selectedUser.id, 'ACTIVE')}
                  disabled={updateStatus.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
