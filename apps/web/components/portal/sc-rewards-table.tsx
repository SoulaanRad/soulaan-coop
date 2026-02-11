"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  UserX,
} from "lucide-react";

interface SCReward {
  id: string;
  userId: string;
  amountSC: number;
  reason: string;
  status: string;
  txHash: string | null;
  createdAt: Date;
  completedAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  retryCount: number;
  user: {
    id: string;
    name: string | null;
    email: string;
    walletAddress: string | null;
  };
  relatedStore: {
    id: string;
    name: string;
  } | null;
  relatedOrder: {
    id: string;
    totalUSD: number;
  } | null;
}

interface SCRewardsTableProps {
  rewards: SCReward[];
  onRefresh: () => void;
}

function RetryDialogContent({ reward }: { reward: SCReward }) {
  const { data: memberStatus, isLoading } = api.scRewards.checkUserMemberStatus.useQuery({
    userId: reward.userId,
  });

  return (
    <div className="space-y-3 py-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <span className="text-gray-400">User:</span>
        <span className="text-white">{reward.user.name || reward.user.email}</span>
        
        <span className="text-gray-400">Wallet:</span>
        <span className="text-white text-xs font-mono">{memberStatus?.walletAddress.slice(0, 10)}...{memberStatus?.walletAddress.slice(-8)}</span>
        
        <span className="text-gray-400">Member Status:</span>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : memberStatus?.isActiveMember ? (
            <>
              <UserCheck className="h-4 w-4 text-green-400" />
              <span className="text-green-400 font-semibold">{memberStatus.memberStatusText}</span>
            </>
          ) : (
            <>
              <UserX className="h-4 w-4 text-red-400" />
              <span className="text-red-400 font-semibold">{memberStatus?.memberStatusText || 'Not Member'}</span>
            </>
          )}
        </div>
        
        <span className="text-gray-400">Amount:</span>
        <span className="text-amber-400 font-semibold">{reward.amountSC.toFixed(4)} SC</span>
        
        <span className="text-gray-400">Retry Count:</span>
        <span className="text-white">{reward.retryCount} / 3</span>
        
        {reward.failureReason && (
          <>
            <span className="text-gray-400">Last Error:</span>
            <span className="text-red-400 text-xs">{reward.failureReason}</span>
          </>
        )}
      </div>

      {!isLoading && !memberStatus?.isActiveMember && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            This user is not an active member. They must be approved before SC can be minted.
          </p>
        </div>
      )}

      {reward.retryCount >= 2 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <p className="text-amber-400 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            This is the final retry attempt. After this, manual review will be required.
          </p>
        </div>
      )}
    </div>
  );
}

export function SCRewardsTable({ rewards, onRefresh }: SCRewardsTableProps) {
  const [selectedReward, setSelectedReward] = useState<SCReward | null>(null);
  const [showRetryDialog, setShowRetryDialog] = useState(false);

  const retry = api.scRewards.retrySCReward.useMutation({
    onSuccess: (data) => {
      toast.success('SC Reward Minted Successfully', {
        description: (
          <div className="space-y-1">
            <p>{data.message}</p>
            {data.txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${data.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-xs font-mono block"
              >
                {data.txHash.slice(0, 10)}...{data.txHash.slice(-8)}
              </a>
            )}
          </div>
        ),
        duration: 5000,
      });
      setShowRetryDialog(false);
      setSelectedReward(null);
      onRefresh();
    },
    onError: (error) => {
      toast.error('Retry Failed', {
        description: error.message,
        duration: 6000,
      });
    },
  });

  const handleRetryClick = (reward: SCReward) => {
    setSelectedReward(reward);
    setShowRetryDialog(true);
  };

  const handleRetry = () => {
    if (selectedReward) {
      retry.mutate({ id: selectedReward.id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'STORE_PURCHASE_REWARD':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">Purchase</Badge>;
      case 'STORE_SALE_REWARD':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">Sale</Badge>;
      case 'MANUAL_ADJUSTMENT':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">Manual</Badge>;
      default:
        return <Badge variant="outline">{reason}</Badge>;
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBlockExplorerUrl = (txHash: string) => {
    // Base Sepolia explorer
    return `https://sepolia.basescan.org/tx/${txHash}`;
  };

  return (
    <>
      <div className="rounded-lg border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800 hover:bg-slate-800/50">
              <TableHead className="text-gray-400">User</TableHead>
              <TableHead className="text-gray-400">Amount SC</TableHead>
              <TableHead className="text-gray-400">Reason</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Store/Order</TableHead>
              <TableHead className="text-gray-400">Transaction</TableHead>
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rewards.map((reward) => (
              <TableRow key={reward.id} className="border-slate-800 hover:bg-slate-800/30">
                <TableCell>
                  <div>
                    <p className="text-white font-medium">{reward.user.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{reward.user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-amber-400 font-semibold">{reward.amountSC.toFixed(4)} SC</span>
                </TableCell>
                <TableCell>{getReasonBadge(reward.reason)}</TableCell>
                <TableCell>{getStatusBadge(reward.status)}</TableCell>
                <TableCell>
                  {reward.relatedStore ? (
                    <div className="text-sm">
                      <p className="text-white">{reward.relatedStore.name}</p>
                      {reward.relatedOrder && (
                        <p className="text-xs text-gray-500">
                          ${reward.relatedOrder.totalUSD.toFixed(2)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {reward.txHash ? (
                    <a
                      href={getBlockExplorerUrl(reward.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 text-sm"
                    >
                      {reward.txHash.slice(0, 6)}...{reward.txHash.slice(-4)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-gray-500">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p className="text-white">{formatDate(reward.createdAt)}</p>
                    {reward.status === 'FAILED' && reward.failedAt && (
                      <p className="text-xs text-red-400">Failed: {formatDate(reward.failedAt)}</p>
                    )}
                    {reward.status === 'COMPLETED' && reward.completedAt && (
                      <p className="text-xs text-green-400">Done: {formatDate(reward.completedAt)}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {reward.status === 'FAILED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetryClick(reward)}
                      className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                      disabled={reward.retryCount >= 3}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {reward.retryCount >= 3 ? 'Max Retries' : 'Retry'}
                    </Button>
                  )}
                  {reward.status === 'COMPLETED' && reward.txHash && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                      asChild
                    >
                      <a
                        href={getBlockExplorerUrl(reward.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Retry Dialog */}
      <Dialog open={showRetryDialog} onOpenChange={setShowRetryDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Retry SC Reward Mint</DialogTitle>
            <DialogDescription className="text-gray-400">
              This will attempt to mint SC tokens again for this reward. The system will first check if the tokens were already minted on-chain.
            </DialogDescription>
          </DialogHeader>
          {selectedReward && <RetryDialogContent reward={selectedReward} />}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRetryDialog(false);
                setSelectedReward(null);
              }}
              disabled={retry.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRetry}
              disabled={retry.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {retry.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Mint
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
