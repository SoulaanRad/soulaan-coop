"use client";

import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wallet, Shield, User, Copy, CheckCircle, Coins } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/trpc/client";
import { useCoin } from "@/hooks/use-platform-config";

export default function SettingsPage() {
  const { isAdmin, adminRole, address: sessionAddress } = useWeb3Auth();
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);
  const coin = useCoin();

  // Get current user info
  const { data: currentUser } = api.user.getUserByWallet.useQuery(
    { walletAddress: address || '' },
    { enabled: !!address }
  );

  // Coin config editing state
  const [editSymbol, setEditSymbol] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [configSaved, setConfigSaved] = useState(false);

  const updateConfig = api.platformConfig.updateConfig.useMutation({
    onSuccess: () => {
      setConfigSaved(true);
      setEditSymbol("");
      setEditName("");
      setEditDescription("");
      setTimeout(() => setConfigSaved(false), 3000);
    },
  });

  const handleSaveCoinConfig = () => {
    const updates: { key: "coin.symbol" | "coin.name" | "coin.description" | "platform.name"; value: string }[] = [];
    if (editSymbol.trim()) updates.push({ key: "coin.symbol", value: editSymbol.trim() });
    if (editName.trim()) updates.push({ key: "coin.name", value: editName.trim() });
    if (editDescription.trim()) updates.push({ key: "coin.description", value: editDescription.trim() });
    if (updates.length > 0) {
      updateConfig.mutate({ updates, updatedBy: sessionAddress ?? undefined });
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your portal account and preferences</p>
      </div>

      {/* Account Information */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your portal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-400">Name</Label>
            <p className="text-white font-medium mt-1">{currentUser?.name || 'Not set'}</p>
          </div>
          <div>
            <Label className="text-gray-400">Email</Label>
            <p className="text-white font-medium mt-1">{currentUser?.email || 'Not set'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Information */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-5 w-5" />
            Connected Wallet
          </CardTitle>
          <CardDescription>Your connected Web3 wallet address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-400">Wallet Address</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-sm bg-slate-800 px-3 py-2 rounded-md text-gray-300 font-mono flex-1">
                {address || sessionAddress || "Not connected"}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyAddress}
                disabled={!address}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-gray-400">Wallet Status</Label>
            <div className="flex items-center gap-2 mt-1">
              <div className={`h-2 w-2 rounded-full ${address ? "bg-green-500" : "bg-gray-500"}`} />
              <span className="text-sm text-gray-300">
                {address ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Status */}
      {isAdmin && (
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-orange-600/5 bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-amber-500" />
              Admin Access
            </CardTitle>
            <CardDescription>Your administrative privileges</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-400">Admin Role</Label>
              <p className="text-white font-medium mt-1 flex items-center gap-2">
                <span className="px-3 py-1 text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md">
                  {adminRole || "Administrator"}
                </span>
              </p>
            </div>
            <div>
              <Label className="text-gray-400">Permissions</Label>
              <ul className="mt-2 space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Approve and reject member applications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Create wallets for members
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Manage member accounts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  View portal statistics and analytics
                </li>
                {adminRole?.includes("Treasury Safe") && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-amber-500" />
                    Treasury Safe multisig owner (highest authority)
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coin & Platform Config — admin only */}
      {isAdmin && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Coins className="h-5 w-5 text-amber-500" />
              Coin & Platform Config
            </CardTitle>
            <CardDescription>
              Change the reward token name and symbol used throughout the app.
              Current: <span className="text-amber-400 font-semibold">{coin.name} ({coin.symbol})</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-400">Symbol (e.g. SC)</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  placeholder={coin.symbol}
                  value={editSymbol}
                  onChange={(e) => setEditSymbol(e.target.value)}
                  maxLength={10}
                />
              </div>
              <div>
                <Label className="text-gray-400">Full Name (e.g. Soulaan Coin)</Label>
                <Input
                  className="mt-1 bg-slate-800 border-slate-700 text-white"
                  placeholder={coin.name}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={80}
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-400">Description (shown on coin detail screens)</Label>
              <Input
                className="mt-1 bg-slate-800 border-slate-700 text-white"
                placeholder={coin.description || "Short description of the coin"}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleSaveCoinConfig}
                disabled={updateConfig.isPending || (!editSymbol && !editName && !editDescription)}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {updateConfig.isPending ? "Saving..." : "Save Changes"}
              </Button>
              {configSaved && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> Saved — restart app to see changes everywhere
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Information */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Authentication and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-400">Authentication Method</Label>
            <p className="text-white mt-1">Wallet Signature (Web3)</p>
            <p className="text-xs text-gray-400 mt-1">
              You authenticate using cryptographic signatures from your connected wallet.
            </p>
          </div>
          <div>
            <Label className="text-gray-400">Access Level</Label>
            <p className="text-white mt-1">
              {isAdmin ? "Administrator" : "Member"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isAdmin
                ? "You have full administrative access to the portal."
                : "You have standard member access to the portal."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
