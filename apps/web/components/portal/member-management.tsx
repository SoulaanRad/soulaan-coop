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
import { Eye, FileText, CheckCircle2, XCircle, Loader2, Wallet, RefreshCw, Info, AlertTriangle } from "lucide-react";

type UserStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

export default function MemberManagement() {
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'ALL'>('ALL');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletModalState, setWalletModalState] = useState<{
    type: 'confirm' | 'success' | 'error';
    message: string;
    walletAddress?: string;
    userId?: string;
  }>({
    type: 'confirm',
    message: '',
  });
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncModalState, setSyncModalState] = useState<{
    type: 'loading' | 'success' | 'error';
    message: string;
    txHash?: string;
    action?: string;
  }>({
    type: 'loading',
    message: '',
  });
  const [blockchainInfoModalOpen, setBlockchainInfoModalOpen] = useState(false);
  const [selectedUserForBlockchainInfo, setSelectedUserForBlockchainInfo] = useState<string | null>(null);

  // Fetch users based on filter
  const allUsersQuery = api.admin.getAllUsersWithApplications.useQuery(undefined, {
    enabled: statusFilter === 'ALL',
  });
  const allUsers = allUsersQuery.data;

  const filteredUsersQuery = api.admin.getUsersByStatus.useQuery(
    { status: statusFilter as UserStatus },
    { enabled: statusFilter !== 'ALL' }
  );
  const filteredUsers = filteredUsersQuery.data;

  // Use the appropriate query and data based on filter
  const isLoading = statusFilter === 'ALL' ? allUsersQuery.isLoading : filteredUsersQuery.isLoading;
  const error = statusFilter === 'ALL' ? allUsersQuery.error : filteredUsersQuery.error;
  const refetch = statusFilter === 'ALL' ? allUsersQuery.refetch : filteredUsersQuery.refetch;
  const users = statusFilter === 'ALL' ? allUsers : filteredUsers;

  // Get stats
  const { data: stats, error: statsError } = api.admin.getApplicationStats.useQuery(undefined, {
    onError: (err) => {
      console.error('❌ Error loading stats:', err);
    },
  });

  // Update status mutation
  const updateStatus = api.admin.updateUserStatus.useMutation({
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      setReviewNotes("");
    },
  });

  // Create wallet mutation
  const createWallet = api.admin.createWalletForUserAdmin.useMutation({
    onSuccess: (data) => {
      refetch();
      setWalletModalState({
        type: 'success',
        message: 'Wallet created successfully!',
        walletAddress: data.walletAddress,
      });
    },
    onError: (error) => {
      setWalletModalState({
        type: 'error',
        message: error.message || 'Failed to create wallet. Please try again.',
      });
    },
  });

  // Sync membership to contract mutation
  const syncMembership = api.admin.syncMembershipToContract.useMutation({
    onSuccess: (data) => {
      setSyncModalState({
        type: 'success',
        message: data.success
          ? `Membership synced successfully!`
          : `Sync failed: ${data.error}`,
        txHash: data.txHash,
        action: data.action,
      });
    },
    onError: (error) => {
      setSyncModalState({
        type: 'error',
        message: error.message || 'Failed to sync membership to contract.',
      });
    },
  });

  // Query for blockchain info
  const blockchainInfoQuery = api.admin.getUserBlockchainInfo.useQuery(
    { userId: selectedUserForBlockchainInfo || '' },
    { 
      enabled: !!selectedUserForBlockchainInfo && blockchainInfoModalOpen,
      onSuccess: (data) => {
        if (data.blockchain) {
          console.log('🔍 Blockchain Info:', {
            scBalance: data.blockchain.scBalance,
            ucBalance: data.blockchain.ucBalance,
            ethBalance: data.blockchain.ethBalance,
          });
        }
      }
    }
  );

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

  const handleCreateWallet = (userId: string, userName: string) => {
    setWalletModalState({
      type: 'confirm',
      message: `Create a wallet for ${userName}? This will generate a new blockchain wallet address.`,
      userId,
    });
    setWalletModalOpen(true);
  };

  const confirmCreateWallet = () => {
    if (walletModalState.userId) {
      createWallet.mutate({ userId: walletModalState.userId });
    }
  };

  const closeWalletModal = () => {
    setWalletModalOpen(false);
    setTimeout(() => {
      setWalletModalState({
        type: 'confirm',
        message: '',
      });
    }, 300); // Wait for modal animation
  };

  const handleSyncMembership = (userId: string, userName: string) => {
    setSyncModalState({
      type: 'loading',
      message: `Syncing membership for ${userName} to the blockchain...`,
    });
    setSyncModalOpen(true);
    syncMembership.mutate({ userId });
  };

  const closeSyncModal = () => {
    setSyncModalOpen(false);
    setTimeout(() => {
      setSyncModalState({
        type: 'loading',
        message: '',
      });
    }, 300);
  };

  const handleViewBlockchainInfo = (userId: string) => {
    setSelectedUserForBlockchainInfo(userId);
    setBlockchainInfoModalOpen(true);
  };

  const closeBlockchainInfoModal = () => {
    setBlockchainInfoModalOpen(false);
    setTimeout(() => {
      setSelectedUserForBlockchainInfo(null);
    }, 300);
  };

  const formatBalance = (formatted: string) => {
    const num = parseFloat(formatted);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
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
        <Button 
          onClick={() => refetch()} 
          variant="outline"
          className="border-slate-700 text-gray-300 hover:bg-slate-800 hover:text-white"
        >
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
              <TableHead>Wallet</TableHead>
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
                  <TableCell>
                    {user.walletAddress ? (
                      <div className="flex items-center gap-1">
                        <Wallet className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-gray-400 font-mono">
                          {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewBlockchainInfo(user.id)}
                          className="text-blue-500 hover:text-blue-400 p-1 h-6 w-6"
                          title="View blockchain info"
                        >
                          <Info className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncMembership(user.id, user.name || user.email)}
                          disabled={syncMembership.isPending}
                          className="text-purple-500 hover:text-purple-400 p-1 h-6 w-6"
                          title="Sync membership to contract"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCreateWallet(user.id, user.name || user.email)}
                        disabled={createWallet.isPending || user.status !== 'ACTIVE'}
                        className="text-blue-500 hover:text-blue-400"
                      >
                        <Wallet className="h-4 w-4 mr-1" />
                        Create
                      </Button>
                    )}
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
                      {user.status === 'PENDING' && (
                        <span className="text-sm text-gray-500">
                          Pending approval
                        </span>
                      )}
                      {user.status === 'REJECTED' && (
                        <span className="text-sm text-gray-500">
                          -
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-gray-500 py-8">
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

              {/* Introduction Video */}
              {selectedUser.application.videoCID && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-gray-400">Introduction Video</h3>
                  <div className="bg-slate-900 rounded overflow-hidden">
                    <video
                      controls
                      className="w-full max-h-64"
                      preload="metadata"
                    >
                      <source
                        src={`https://gateway.pinata.cloud/ipfs/${selectedUser.application.videoCID}`}
                        type="video/mp4"
                      />
                    </video>
                  </div>
                </div>
              )}

              {/* Profile Photo */}
              {selectedUser.application.photoCID && (
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-gray-400">Profile Photo</h3>
                  <div className="bg-slate-900 rounded p-3">
                    <img
                      src={`https://gateway.pinata.cloud/ipfs/${selectedUser.application.photoCID}`}
                      alt="Profile"
                      className="max-w-xs rounded"
                    />
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wallet Creation Modal */}
      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {walletModalState.type === 'confirm' && 'Create Wallet'}
              {walletModalState.type === 'success' && 'Wallet Created'}
              {walletModalState.type === 'error' && 'Error'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {walletModalState.type === 'confirm' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  {walletModalState.message}
                </p>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Note:</strong> This will generate a new Ethereum wallet on Base Sepolia testnet.
                    The private key will be encrypted and stored securely.
                  </p>
                </div>
              </div>
            )}

            {walletModalState.type === 'success' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {walletModalState.message}
                </p>
                {walletModalState.walletAddress && (
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet Address:</p>
                    <p className="text-sm font-mono break-all text-gray-900 dark:text-gray-100">
                      {walletModalState.walletAddress}
                    </p>
                  </div>
                )}
              </div>
            )}

            {walletModalState.type === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  {walletModalState.message}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {walletModalState.type === 'confirm' && (
              <>
                <Button variant="outline" onClick={closeWalletModal} disabled={createWallet.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={confirmCreateWallet}
                  disabled={createWallet.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createWallet.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Create Wallet
                    </>
                  )}
                </Button>
              </>
            )}
            {(walletModalState.type === 'success' || walletModalState.type === 'error') && (
              <Button onClick={closeWalletModal} className="w-full">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Membership Modal */}
      <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {syncModalState.type === 'loading' && 'Syncing Membership'}
              {syncModalState.type === 'success' && 'Sync Complete'}
              {syncModalState.type === 'error' && 'Sync Failed'}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {syncModalState.type === 'loading' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
                <p className="text-center text-sm text-gray-400">
                  {syncModalState.message}
                </p>
                <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <p className="text-xs text-purple-900 dark:text-purple-100">
                    This is syncing the user's membership status from the database to the SoulaaniCoin smart contract on the blockchain.
                  </p>
                </div>
              </div>
            )}

            {syncModalState.type === 'success' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {syncModalState.message}
                </p>
                {syncModalState.action && (
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Action taken:</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {syncModalState.action === 'already_synced' && 'Already in sync - no changes needed'}
                      {syncModalState.action === 'added_member' && 'Added as new member on contract'}
                      {syncModalState.action === 'status_updated' && 'Membership status updated on contract'}
                    </p>
                  </div>
                )}
                {syncModalState.txHash && (
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transaction Hash:</p>
                    <a
                      href={`https://sepolia.basescan.org/tx/${syncModalState.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono break-all text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {syncModalState.txHash}
                    </a>
                  </div>
                )}
              </div>
            )}

            {syncModalState.type === 'error' && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  {syncModalState.message}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {syncModalState.type !== 'loading' && (
              <Button onClick={closeSyncModal} className="w-full">
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blockchain Info Modal */}
      <Dialog open={blockchainInfoModalOpen} onOpenChange={setBlockchainInfoModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Blockchain Status</DialogTitle>
            <DialogDescription>
              User's wallet and contract information
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {blockchainInfoQuery.isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            )}

            {blockchainInfoQuery.error && (
              <div className="space-y-4">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900 rounded-full">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  {blockchainInfoQuery.error.message}
                </p>
              </div>
            )}

            {blockchainInfoQuery.data && (
              <div className="space-y-4">
                {/* User Info */}
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">User</p>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {blockchainInfoQuery.data.user.name || blockchainInfoQuery.data.user.email}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    DB Status: <Badge className={getStatusColor(blockchainInfoQuery.data.user.status)}>
                      {blockchainInfoQuery.data.user.status}
                    </Badge>
                  </p>
                </div>

                {!blockchainInfoQuery.data.blockchain ? (
                  <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-sm text-yellow-900 dark:text-yellow-100">
                        User does not have a wallet address
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Wallet Address */}
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Wallet Address</p>
                      <a
                        href={`https://sepolia.basescan.org/address/${blockchainInfoQuery.data.blockchain.walletAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono break-all text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {blockchainInfoQuery.data.blockchain.walletAddress}
                      </a>
                    </div>

                    {/* Balances */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ETH Balance</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatBalance(blockchainInfoQuery.data.blockchain.ethBalance.formatted)}
                        </p>
                        <p className="text-xs text-gray-500">ETH</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">UnityCoin</p>
                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                          {formatBalance(blockchainInfoQuery.data.blockchain.ucBalance.formatted)}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">UC</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3 text-center border border-purple-200 dark:border-purple-800">
                        <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">SoulaaniCoin</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          {formatBalance(blockchainInfoQuery.data.blockchain.scBalance.formatted)}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">SC</p>
                        <p className="text-[10px] text-purple-500 dark:text-purple-400 mt-1 font-mono">
                          Raw: {blockchainInfoQuery.data.blockchain.scBalance.formatted}
                        </p>
                      </div>
                    </div>

                    {/* Membership Status */}
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Contract Membership</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Status:</span>{' '}
                          <Badge className={
                            blockchainInfoQuery.data.blockchain.memberStatusLabel === 'Active'
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : blockchainInfoQuery.data.blockchain.memberStatusLabel === 'NotMember'
                              ? 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                              : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                          }>
                            {blockchainInfoQuery.data.blockchain.memberStatusLabel}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-gray-500">Is Member:</span>{' '}
                          <span className={blockchainInfoQuery.data.blockchain.isMember ? 'text-green-500' : 'text-red-500'}>
                            {blockchainInfoQuery.data.blockchain.isMember ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Is Active:</span>{' '}
                          <span className={blockchainInfoQuery.data.blockchain.isActiveMember ? 'text-green-500' : 'text-red-500'}>
                            {blockchainInfoQuery.data.blockchain.isActiveMember ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sync Status */}
                    {blockchainInfoQuery.data.comparison && (
                      <div className={`rounded-lg p-3 ${
                        blockchainInfoQuery.data.comparison.isSynced
                          ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800'
                          : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {blockchainInfoQuery.data.comparison.isSynced ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          )}
                          <p className={`text-sm font-medium ${
                            blockchainInfoQuery.data.comparison.isSynced
                              ? 'text-green-900 dark:text-green-100'
                              : 'text-yellow-900 dark:text-yellow-100'
                          }`}>
                            {blockchainInfoQuery.data.comparison.isSynced
                              ? 'Database and Contract are in sync'
                              : 'Out of sync'}
                          </p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-600 dark:text-gray-400">
                            DB: <strong>{blockchainInfoQuery.data.comparison.dbStatus}</strong> | Contract: <strong>{blockchainInfoQuery.data.comparison.contractStatus}</strong>
                          </p>
                          {blockchainInfoQuery.data.comparison.syncAction && (
                            <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                              {blockchainInfoQuery.data.comparison.syncAction}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={closeBlockchainInfoModal} variant="outline">
              Close
            </Button>
            {blockchainInfoQuery.data?.blockchain && blockchainInfoQuery.data.comparison && !blockchainInfoQuery.data.comparison.isSynced && (
              <Button
                onClick={() => {
                  closeBlockchainInfoModal();
                  if (selectedUserForBlockchainInfo) {
                    handleSyncMembership(
                      selectedUserForBlockchainInfo,
                      blockchainInfoQuery.data?.user.name || blockchainInfoQuery.data?.user.email || ''
                    );
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
