"use client";

import { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import type { Hash } from "viem";
import { baseSepolia, base } from "viem/chains";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { DeploymentStep, ContractCard } from "@/components/deployment-status";
import { CoopConfigPreview } from "@/components/config-preview";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/trpc/client";

interface DeploymentStepType {
  id: string;
  name: string;
  description: string;
  status: "pending" | "deploying" | "completed" | "failed";
  txHash?: Hash;
  contractAddress?: string;
  error?: string;
}

interface DeployedContracts {
  unityCoin?: string;
  soulaaniCoin?: string;
  allyCoin?: string;
  redemptionVault?: string;
  verifiedStoreRegistry?: string;
  scRewardEngine?: string;
  storePaymentRouter?: string;
};

export default function InitializePage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { open } = useWeb3Modal();

  // tRPC mutation for saving co-op config
  const createCoopConfig = api.coopConfig.create.useMutation();

  const [currentPhase, setCurrentPhase] = useState<"config" | "deploy" | "complete">("config");
  const [network, setNetwork] = useState<"baseSepolia" | "base">("baseSepolia");
  
  // Optional contracts selection
  const [optionalContracts, setOptionalContracts] = useState({
    redemptionVault: false,
    verifiedStoreRegistry: false,
    scRewardEngine: false,
    storePaymentRouter: false,
  });
  
  // Co-op Configuration
  const [coopConfig, setCoopConfig] = useState({
    name: "",
    shortName: "",
    tagline: "",
    description: "",
    treasuryAddress: "",
    governanceBotAddress: "",
    primaryColor: "#2563eb",
    accentColor: "#16a34a",
    
    // Governance
    quorumPercent: 15,
    approvalThresholdPercent: 51,
    votingWindowDays: 7,
    screeningPassThreshold: 0.6,
    
    // Payment settings
    minPaymentAmount: 0.01,
    maxPaymentAmount: 10000,
    claimExpirationDays: 7,
    withdrawalMinAmount: 1,
    
    // Fees
    p2pFeePercent: 0,
    withdrawalFeePercent: 0,
    withdrawalFeeFlat: 0,
  });

  const getDeploymentSteps = (): DeploymentStepType[] => {
    const steps: DeploymentStepType[] = [
      { id: "sc", name: "Deploy SoulaaniCoin", description: "Governance token (REQUIRED)", status: "pending" },
      { id: "ally", name: "Deploy AllyCoin", description: "Cross-coop membership token (REQUIRED)", status: "pending" },
      { id: "uc", name: "Deploy UnityCoin", description: "Main payment currency (REQUIRED)", status: "pending" },
    ];

    if (optionalContracts.redemptionVault) {
      steps.push({ id: "vault", name: "Deploy RedemptionVault", description: "Handles UC redemptions (OPTIONAL)", status: "pending" });
    }
    if (optionalContracts.verifiedStoreRegistry) {
      steps.push({ id: "registry", name: "Deploy VerifiedStoreRegistry", description: "On-chain store verification (OPTIONAL)", status: "pending" });
    }
    if (optionalContracts.scRewardEngine) {
      steps.push({ id: "engine", name: "Deploy SCRewardEngine", description: "Reward calculation engine (OPTIONAL)", status: "pending" });
    }
    if (optionalContracts.storePaymentRouter) {
      steps.push({ id: "router", name: "Deploy StorePaymentRouter", description: "Payment routing system (OPTIONAL)", status: "pending" });
    }

    const needsRoles = optionalContracts.scRewardEngine || optionalContracts.storePaymentRouter;
    if (needsRoles) {
      steps.push({ id: "roles", name: "Grant Roles", description: "Set up permissions", status: "pending" });
    }

    // Always add database save step
    steps.push({ id: "save-db", name: "Save to Database", description: "Register co-op in system", status: "pending" });

    return steps;
  };

  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStepType[]>(getDeploymentSteps());

  const [deployedContracts, setDeployedContracts] = useState<DeployedContracts>({});

  const updateStepStatus = (
    stepId: string,
    status: DeploymentStepType["status"],
    data?: { txHash?: Hash; contractAddress?: string; error?: string }
  ) => {
    setDeploymentSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, status, ...data } : step
      )
    );
  };

  const deployContracts = async () => {
    if (!walletClient || !publicClient || !address) {
      alert("Please connect your wallet first");
      return;
    }

    setDeploymentSteps(getDeploymentSteps());
    setCurrentPhase("deploy");

    try {
      const selectedChain = network === "baseSepolia" ? baseSepolia : base;
      
      // Import required contract artifacts
      const soulaaniCoinArtifact = await import("@/lib/contracts/SoulaaniCoin.json");
      const allyCoinArtifact = await import("@/lib/contracts/AllyCoin.json");
      const unityCoinArtifact = await import("@/lib/contracts/UnityCoin.json");

      const treasuryAddress = (coopConfig.treasuryAddress || address) as `0x${string}`;
      const governanceBotAddress = (coopConfig.governanceBotAddress || address) as `0x${string}`;

      // Step 1: Deploy SoulaaniCoin
      updateStepStatus("sc", "deploying");
      const scHash = await walletClient.deployContract({
        abi: soulaaniCoinArtifact.abi,
        bytecode: soulaaniCoinArtifact.bytecode as `0x${string}`,
        args: [governanceBotAddress],
        chain: selectedChain,
      });
      updateStepStatus("sc", "deploying", { txHash: scHash });
      
      const scReceipt = await publicClient.waitForTransactionReceipt({ hash: scHash });
      const soulaaniCoinAddress = scReceipt.contractAddress!;
      updateStepStatus("sc", "completed", { txHash: scHash, contractAddress: soulaaniCoinAddress });
      setDeployedContracts((prev) => ({ ...prev, soulaaniCoin: soulaaniCoinAddress }));

      // Step 2: Deploy AllyCoin
      updateStepStatus("ally", "deploying");
      const allyHash = await walletClient.deployContract({
        abi: allyCoinArtifact.abi,
        bytecode: allyCoinArtifact.bytecode as `0x${string}`,
        args: [governanceBotAddress, soulaaniCoinAddress],
        chain: selectedChain,
      });
      updateStepStatus("ally", "deploying", { txHash: allyHash });
      
      const allyReceipt = await publicClient.waitForTransactionReceipt({ hash: allyHash });
      const allyCoinAddress = allyReceipt.contractAddress!;
      updateStepStatus("ally", "completed", { txHash: allyHash, contractAddress: allyCoinAddress });
      setDeployedContracts((prev) => ({ ...prev, allyCoin: allyCoinAddress }));

      // Link AllyCoin to SoulaaniCoin
      const linkHash = await walletClient.writeContract({
        address: soulaaniCoinAddress,
        abi: soulaaniCoinArtifact.abi,
        functionName: "setAllyCoin",
        args: [allyCoinAddress, "Initial deployment - linking AllyCoin"],
        chain: selectedChain,
      });
      await publicClient.waitForTransactionReceipt({ hash: linkHash });

      // Step 3: Deploy UnityCoin
      updateStepStatus("uc", "deploying");
      const ucHash = await walletClient.deployContract({
        abi: unityCoinArtifact.abi,
        bytecode: unityCoinArtifact.bytecode as `0x${string}`,
        args: [treasuryAddress, soulaaniCoinAddress, address],
        chain: selectedChain,
      });
      updateStepStatus("uc", "deploying", { txHash: ucHash });
      
      const ucReceipt = await publicClient.waitForTransactionReceipt({ hash: ucHash });
      const unityCoinAddress = ucReceipt.contractAddress!;
      updateStepStatus("uc", "completed", { txHash: ucHash, contractAddress: unityCoinAddress });
      setDeployedContracts((prev) => ({ ...prev, unityCoin: unityCoinAddress }));

      let redemptionVaultAddress: string | undefined;
      let verifiedStoreRegistryAddress: string | undefined;
      let scRewardEngineAddress: string | undefined;
      let storePaymentRouterAddress: string | undefined;

      // Step 3: Deploy RedemptionVault (Optional)
      if (optionalContracts.redemptionVault) {
        const redemptionVaultArtifact = await import("@/lib/contracts/RedemptionVault.json");
        updateStepStatus("vault", "deploying");
        const vaultHash = await walletClient.deployContract({
          abi: redemptionVaultArtifact.abi,
          bytecode: redemptionVaultArtifact.bytecode as `0x${string}`,
          args: [unityCoinAddress, treasuryAddress],
          chain: selectedChain,
        });
        updateStepStatus("vault", "deploying", { txHash: vaultHash });
        
        const vaultReceipt = await publicClient.waitForTransactionReceipt({ hash: vaultHash });
        redemptionVaultAddress = vaultReceipt.contractAddress!;
        updateStepStatus("vault", "completed", { txHash: vaultHash, contractAddress: redemptionVaultAddress });
        setDeployedContracts((prev) => ({ ...prev, redemptionVault: redemptionVaultAddress }));
      }

      // Step 4: Deploy VerifiedStoreRegistry (Optional)
      if (optionalContracts.verifiedStoreRegistry) {
        const verifiedStoreRegistryArtifact = await import("@/lib/contracts/VerifiedStoreRegistry.json");
        updateStepStatus("registry", "deploying");
        const registryHash = await walletClient.deployContract({
          abi: verifiedStoreRegistryArtifact.abi,
          bytecode: verifiedStoreRegistryArtifact.bytecode as `0x${string}`,
          args: [treasuryAddress],
          chain: selectedChain,
        });
        updateStepStatus("registry", "deploying", { txHash: registryHash });
        
        const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash });
        verifiedStoreRegistryAddress = registryReceipt.contractAddress!;
        updateStepStatus("registry", "completed", { txHash: registryHash, contractAddress: verifiedStoreRegistryAddress });
        setDeployedContracts((prev) => ({ ...prev, verifiedStoreRegistry: verifiedStoreRegistryAddress }));
      }

      // Step 5: Deploy SCRewardEngine (Optional, requires registry)
      if (optionalContracts.scRewardEngine && verifiedStoreRegistryAddress) {
        const scRewardEngineArtifact = await import("@/lib/contracts/SCRewardEngine.json");
        updateStepStatus("engine", "deploying");
        const engineHash = await walletClient.deployContract({
          abi: scRewardEngineArtifact.abi,
          bytecode: scRewardEngineArtifact.bytecode as `0x${string}`,
          args: [treasuryAddress, soulaaniCoinAddress, verifiedStoreRegistryAddress],
          chain: selectedChain,
        });
        updateStepStatus("engine", "deploying", { txHash: engineHash });
        
        const engineReceipt = await publicClient.waitForTransactionReceipt({ hash: engineHash });
        scRewardEngineAddress = engineReceipt.contractAddress!;
        updateStepStatus("engine", "completed", { txHash: engineHash, contractAddress: scRewardEngineAddress });
        setDeployedContracts((prev) => ({ ...prev, scRewardEngine: scRewardEngineAddress }));
      }

      // Step 6: Deploy StorePaymentRouter (Optional, requires registry and engine)
      if (optionalContracts.storePaymentRouter && verifiedStoreRegistryAddress && scRewardEngineAddress) {
        const storePaymentRouterArtifact = await import("@/lib/contracts/StorePaymentRouter.json");
        updateStepStatus("router", "deploying");
        const routerHash = await walletClient.deployContract({
          abi: storePaymentRouterArtifact.abi,
          bytecode: storePaymentRouterArtifact.bytecode as `0x${string}`,
          args: [treasuryAddress, unityCoinAddress, verifiedStoreRegistryAddress, scRewardEngineAddress],
          chain: selectedChain,
        });
        updateStepStatus("router", "deploying", { txHash: routerHash });
        
        const routerReceipt = await publicClient.waitForTransactionReceipt({ hash: routerHash });
        storePaymentRouterAddress = routerReceipt.contractAddress!;
        updateStepStatus("router", "completed", { txHash: routerHash, contractAddress: storePaymentRouterAddress });
        setDeployedContracts((prev) => ({ ...prev, storePaymentRouter: storePaymentRouterAddress }));
      }

      // Step 7: Grant Roles (Only if needed)
      if (scRewardEngineAddress || storePaymentRouterAddress) {
        updateStepStatus("roles", "deploying");
        
        // Grant GOVERNANCE_AWARD role to SCRewardEngine on SoulaaniCoin
        if (scRewardEngineAddress) {
          const GOVERNANCE_AWARD = "0x" + Buffer.from("GOVERNANCE_AWARD").toString("hex");
          const grantAwardHash = await walletClient.writeContract({
            address: soulaaniCoinAddress,
            abi: soulaaniCoinArtifact.abi,
            functionName: "grantRole",
            args: [GOVERNANCE_AWARD, scRewardEngineAddress],
            chain: selectedChain,
          });
          await publicClient.waitForTransactionReceipt({ hash: grantAwardHash });
        }

        // Grant REWARD_EXECUTOR role to StorePaymentRouter on SCRewardEngine
        if (storePaymentRouterAddress && scRewardEngineAddress) {
          const scRewardEngineArtifact = await import("@/lib/contracts/SCRewardEngine.json");
          const REWARD_EXECUTOR = "0x" + Buffer.from("REWARD_EXECUTOR").toString("hex");
          const grantExecutorHash = await walletClient.writeContract({
            address: scRewardEngineAddress as `0x${string}`,
            abi: scRewardEngineArtifact.abi,
            functionName: "grantRole",
            args: [REWARD_EXECUTOR, storePaymentRouterAddress],
            chain: selectedChain,
          });
          await publicClient.waitForTransactionReceipt({ hash: grantExecutorHash });
        }

        updateStepStatus("roles", "completed");
      }

      // Save co-op configuration to database
      updateStepStatus("save-db", "deploying");
      try {
        console.log("Saving co-op configuration to database...");
        
        // Ensure required fields have values
        const coopName = coopConfig.name.trim() || "New Co-op";
        const coopShortName = coopConfig.shortName.trim() || coopName.substring(0, 20);
        const coopId = coopShortName.toLowerCase().replace(/\s+/g, "-");
        const coopTagline = coopConfig.tagline.trim() || "Building economic empowerment together";
        const coopDescription = coopConfig.description.trim() || `${coopName} - A cooperative for economic empowerment.`;
        
        // Convert hex colors to Tailwind classes for consistency, or keep hex for custom colors
        const bgColor = coopConfig.primaryColor || "#2563eb";
        const accentColor = coopConfig.accentColor || "#16a34a";

        await createCoopConfig.mutateAsync({
          coopId,
          reason: "Initial deployment via web UI",
          name: coopName,
          slug: coopId,
          tagline: coopTagline,
          description: coopDescription,
          displayMission: coopDescription,
          displayFeatures: [
            { title: "Shared Wealth Fund", description: "Community fund for collective investment and support." },
            { title: "Democratic Governance", description: "Members vote on proposals and shape priorities." },
            { title: "Local Economy", description: "Support local businesses and keep wealth in the community." },
          ],
          eligibility: "Open to all community members",
          bgColor: bgColor,
          accentColor: accentColor,
          displayOrder: 999,
          charterText: `${coopName} Charter - Building economic empowerment through cooperative ownership.`,
          quorumPercent: coopConfig.quorumPercent,
          approvalThresholdPercent: coopConfig.approvalThresholdPercent,
          votingWindowDays: coopConfig.votingWindowDays,
        });
        console.log("✅ Co-op configuration saved to database");
        updateStepStatus("save-db", "completed");
      } catch (dbError: any) {
        console.error("Failed to save to database:", dbError);
        updateStepStatus("save-db", "failed", { error: dbError.message || "Database save failed" });
        // Don't fail the deployment if DB save fails - contracts are already deployed
      }

      setCurrentPhase("complete");
    } catch (error: any) {
      console.error("Deployment failed:", error);
      const failedStep = deploymentSteps.find((s) => s.status === "deploying");
      if (failedStep) {
        updateStepStatus(failedStep.id, "failed", { error: error.message });
      }
    }
  };

  const downloadConfig = () => {
    const config = {
      coopConfig: {
        ...coopConfig,
        network,
      },
      contracts: deployedContracts,
      deployedAt: new Date().toISOString(),
      deployer: address,
      chainId: network === "baseSepolia" ? 84532 : 8453,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${coopConfig.shortName || "coop"}-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEnvFile = () => {
    let envContent = `# Co-op Configuration
COOP_NAME="${coopConfig.name}"
COOP_SHORT_NAME="${coopConfig.shortName}"
COOP_TAGLINE="${coopConfig.tagline}"
COOP_PRIMARY_COLOR="${coopConfig.primaryColor}"
COOP_ACCENT_COLOR="${coopConfig.accentColor}"

# Contract Addresses (Required)
SOULAANI_COIN_ADDRESS="${deployedContracts.soulaaniCoin || ""}"
ALLY_COIN_ADDRESS="${deployedContracts.allyCoin || ""}"
UNITY_COIN_ADDRESS="${deployedContracts.unityCoin || ""}"
`;

    // Add optional contract addresses only if deployed
    if (deployedContracts.redemptionVault) {
      envContent += `REDEMPTION_VAULT_ADDRESS="${deployedContracts.redemptionVault}"\n`;
    }
    if (deployedContracts.verifiedStoreRegistry) {
      envContent += `VERIFIED_STORE_REGISTRY_ADDRESS="${deployedContracts.verifiedStoreRegistry}"\n`;
    }
    if (deployedContracts.scRewardEngine) {
      envContent += `SC_REWARD_ENGINE_ADDRESS="${deployedContracts.scRewardEngine}"\n`;
    }
    if (deployedContracts.storePaymentRouter) {
      envContent += `STORE_PAYMENT_ROUTER_ADDRESS="${deployedContracts.storePaymentRouter}"\n`;
    }

    envContent += `
# Governance
TREASURY_SAFE_ADDRESS="${coopConfig.treasuryAddress || address || ""}"
GOVERNANCE_BOT_ADDRESS="${coopConfig.governanceBotAddress || address || ""}"

# Network
CHAIN_ID="${network === "baseSepolia" ? "84532" : "8453"}"
RPC_URL="${network === "baseSepolia" ? "https://sepolia.base.org" : "https://mainnet.base.org"}"

# Payment Settings
MIN_PAYMENT_AMOUNT="${coopConfig.minPaymentAmount}"
MAX_PAYMENT_AMOUNT="${coopConfig.maxPaymentAmount}"
CLAIM_EXPIRATION_DAYS="${coopConfig.claimExpirationDays}"
WITHDRAWAL_MIN_AMOUNT="${coopConfig.withdrawalMinAmount}"

# Fees
P2P_FEE_PERCENT="${coopConfig.p2pFeePercent}"
WITHDRAWAL_FEE_PERCENT="${coopConfig.withdrawalFeePercent}"
WITHDRAWAL_FEE_FLAT="${coopConfig.withdrawalFeeFlat}"

# Governance Parameters
QUORUM_PERCENT="${coopConfig.quorumPercent}"
APPROVAL_THRESHOLD_PERCENT="${coopConfig.approvalThresholdPercent}"
VOTING_WINDOW_DAYS="${coopConfig.votingWindowDays}"
SCREENING_PASS_THRESHOLD="${coopConfig.screeningPassThreshold}"
`;

    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `.env.${coopConfig.shortName || "coop"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const explorerUrl = network === "baseSepolia" 
    ? "https://sepolia.basescan.org" 
    : "https://basescan.org";

  const completedSteps = deploymentSteps.filter((s) => s.status === "completed").length;
  const progress = (completedSteps / deploymentSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Initialize Your Co-op
          </h1>
          <p className="text-lg text-muted-foreground">
            Deploy smart contracts and configure your cooperative in one seamless flow
          </p>
        </div>

        {/* Phase Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${currentPhase === "config" ? "text-blue-600 font-semibold" : currentPhase === "deploy" || currentPhase === "complete" ? "text-green-600" : "text-muted-foreground"}`}>
              {currentPhase === "deploy" || currentPhase === "complete" ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
              <span>1. Configure</span>
            </div>
            <div className="w-12 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${currentPhase === "deploy" ? "text-blue-600 font-semibold" : currentPhase === "complete" ? "text-green-600" : "text-muted-foreground"}`}>
              {currentPhase === "complete" ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
              <span>2. Deploy</span>
            </div>
            <div className="w-12 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${currentPhase === "complete" ? "text-green-600 font-semibold" : "text-muted-foreground"}`}>
              {currentPhase === "complete" ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-5 h-5 rounded-full border-2 border-current" />}
              <span>3. Complete</span>
            </div>
          </div>
        </div>

        {/* Configuration Phase */}
        {currentPhase === "config" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Wallet Connection</CardTitle>
                <CardDescription>Connect your wallet to deploy contracts</CardDescription>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <div className="text-center py-8">
                    <p className="mb-4 text-muted-foreground">Connect your wallet to get started</p>
                    <Button onClick={() => open()} size="lg">
                      Connect Wallet
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">Wallet Connected</p>
                        <p className="text-sm text-green-700 dark:text-green-300 font-mono">{address}</p>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    
                    <div>
                      <Label>Network</Label>
                      <Select value={network} onValueChange={(v) => setNetwork(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baseSepolia">Base Sepolia (Testnet)</SelectItem>
                          <SelectItem value="base">Base (Mainnet)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isConnected && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Co-op Identity</CardTitle>
                    <CardDescription>Basic information about your cooperative</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="Soulaan Co-operative"
                          value={coopConfig.name}
                          onChange={(e) => setCoopConfig({ ...coopConfig, name: e.target.value })}
                          className={!coopConfig.name.trim() ? "border-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Required - will appear in mobile app
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="shortName">Short Name *</Label>
                        <Input
                          id="shortName"
                          placeholder="Soulaan"
                          value={coopConfig.shortName}
                          onChange={(e) => setCoopConfig({ ...coopConfig, shortName: e.target.value })}
                          className={!coopConfig.shortName.trim() ? "border-red-500" : ""}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Required - used for URLs and IDs
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="tagline">Tagline *</Label>
                      <Input
                        id="tagline"
                        placeholder="Building Generational Wealth Together"
                        value={coopConfig.tagline}
                        onChange={(e) => setCoopConfig({ ...coopConfig, tagline: e.target.value })}
                        className={!coopConfig.tagline.trim() ? "border-red-500" : ""}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Required - appears in mobile app co-op list
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="A brief description of your co-op's mission and purpose..."
                        rows={4}
                        value={coopConfig.description}
                        onChange={(e) => setCoopConfig({ ...coopConfig, description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primaryColor">Primary Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="primaryColor"
                            type="color"
                            value={coopConfig.primaryColor}
                            onChange={(e) => setCoopConfig({ ...coopConfig, primaryColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={coopConfig.primaryColor}
                            onChange={(e) => setCoopConfig({ ...coopConfig, primaryColor: e.target.value })}
                            placeholder="#2563eb"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="accentColor">Accent Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="accentColor"
                            type="color"
                            value={coopConfig.accentColor}
                            onChange={(e) => setCoopConfig({ ...coopConfig, accentColor: e.target.value })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={coopConfig.accentColor}
                            onChange={(e) => setCoopConfig({ ...coopConfig, accentColor: e.target.value })}
                            placeholder="#16a34a"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Contract Selection</CardTitle>
                    <CardDescription>Choose which contracts to deploy</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>Cost Optimization</AlertTitle>
                      <AlertDescription>
                        <strong>UnityCoin</strong> and <strong>SoulaaniCoin</strong> are required (always deployed).
                        The other contracts are optional and can be deployed later if needed.
                        <div className="mt-2 text-sm">
                          <strong>Minimal setup:</strong> ~$50-75 (just UC + SC)<br />
                          <strong>Full setup:</strong> ~$150-300 (all 6 contracts)
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <Checkbox
                          id="redemptionVault"
                          checked={optionalContracts.redemptionVault}
                          onCheckedChange={(checked) =>
                            setOptionalContracts({ ...optionalContracts, redemptionVault: checked as boolean })
                          }
                        />
                        <div className="flex-1">
                          <Label htmlFor="redemptionVault" className="font-medium cursor-pointer">
                            RedemptionVault
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Allows members to convert UC back to USD. Skip if handling redemptions manually via backend.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <Checkbox
                          id="verifiedStoreRegistry"
                          checked={optionalContracts.verifiedStoreRegistry}
                          onCheckedChange={(checked) =>
                            setOptionalContracts({ ...optionalContracts, verifiedStoreRegistry: checked as boolean })
                          }
                        />
                        <div className="flex-1">
                          <Label htmlFor="verifiedStoreRegistry" className="font-medium cursor-pointer">
                            VerifiedStoreRegistry
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            On-chain store verification system. Skip if managing stores in your database.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <Checkbox
                          id="scRewardEngine"
                          checked={optionalContracts.scRewardEngine}
                          onCheckedChange={(checked) =>
                            setOptionalContracts({ ...optionalContracts, scRewardEngine: checked as boolean })
                          }
                          disabled={!optionalContracts.verifiedStoreRegistry}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="scRewardEngine"
                            className={`font-medium ${!optionalContracts.verifiedStoreRegistry ? "opacity-50" : "cursor-pointer"}`}
                          >
                            SCRewardEngine {!optionalContracts.verifiedStoreRegistry && "(requires registry)"}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Automatic on-chain SC reward calculation. Skip if awarding SC from your backend.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                        <Checkbox
                          id="storePaymentRouter"
                          checked={optionalContracts.storePaymentRouter}
                          onCheckedChange={(checked) =>
                            setOptionalContracts({ ...optionalContracts, storePaymentRouter: checked as boolean })
                          }
                          disabled={!optionalContracts.verifiedStoreRegistry || !optionalContracts.scRewardEngine}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor="storePaymentRouter"
                            className={`font-medium ${(!optionalContracts.verifiedStoreRegistry || !optionalContracts.scRewardEngine) ? "opacity-50" : "cursor-pointer"}`}
                          >
                            StorePaymentRouter {(!optionalContracts.verifiedStoreRegistry || !optionalContracts.scRewardEngine) && "(requires registry + engine)"}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Canonical payment routing system. Skip if routing payments in your backend.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Governance Settings</CardTitle>
                    <CardDescription>Configure voting and decision-making parameters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="treasuryAddress">Treasury Safe Address</Label>
                        <Input
                          id="treasuryAddress"
                          placeholder={address || "0x..."}
                          value={coopConfig.treasuryAddress}
                          onChange={(e) => setCoopConfig({ ...coopConfig, treasuryAddress: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty to use your wallet address
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="governanceBotAddress">Governance Bot Address</Label>
                        <Input
                          id="governanceBotAddress"
                          placeholder={address || "0x..."}
                          value={coopConfig.governanceBotAddress}
                          onChange={(e) => setCoopConfig({ ...coopConfig, governanceBotAddress: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty to use your wallet address
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quorumPercent">Quorum Percentage</Label>
                        <Input
                          id="quorumPercent"
                          type="number"
                          min="1"
                          max="100"
                          value={coopConfig.quorumPercent}
                          onChange={(e) => setCoopConfig({ ...coopConfig, quorumPercent: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          % of members needed to vote
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="approvalThreshold">Approval Threshold</Label>
                        <Input
                          id="approvalThreshold"
                          type="number"
                          min="1"
                          max="100"
                          value={coopConfig.approvalThresholdPercent}
                          onChange={(e) => setCoopConfig({ ...coopConfig, approvalThresholdPercent: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          % of votes needed to pass
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="votingWindowDays">Voting Window (Days)</Label>
                        <Input
                          id="votingWindowDays"
                          type="number"
                          min="1"
                          max="30"
                          value={coopConfig.votingWindowDays}
                          onChange={(e) => setCoopConfig({ ...coopConfig, votingWindowDays: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="screeningThreshold">AI Screening Threshold</Label>
                        <Input
                          id="screeningThreshold"
                          type="number"
                          min="0"
                          max="1"
                          step="0.1"
                          value={coopConfig.screeningPassThreshold}
                          onChange={(e) => setCoopConfig({ ...coopConfig, screeningPassThreshold: parseFloat(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Minimum score to pass (0-1)
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment & Fee Settings</CardTitle>
                    <CardDescription>Configure transaction limits and fees</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="minPayment">Min Payment Amount</Label>
                        <Input
                          id="minPayment"
                          type="number"
                          min="0"
                          step="0.01"
                          value={coopConfig.minPaymentAmount}
                          onChange={(e) => setCoopConfig({ ...coopConfig, minPaymentAmount: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxPayment">Max Payment Amount</Label>
                        <Input
                          id="maxPayment"
                          type="number"
                          min="0"
                          value={coopConfig.maxPaymentAmount}
                          onChange={(e) => setCoopConfig({ ...coopConfig, maxPaymentAmount: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="p2pFee">P2P Fee (%)</Label>
                        <Input
                          id="p2pFee"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={coopConfig.p2pFeePercent}
                          onChange={(e) => setCoopConfig({ ...coopConfig, p2pFeePercent: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="withdrawalFeePercent">Withdrawal Fee (%)</Label>
                        <Input
                          id="withdrawalFeePercent"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={coopConfig.withdrawalFeePercent}
                          onChange={(e) => setCoopConfig({ ...coopConfig, withdrawalFeePercent: parseFloat(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="withdrawalFeeFlat">Withdrawal Fee (Flat)</Label>
                        <Input
                          id="withdrawalFeeFlat"
                          type="number"
                          min="0"
                          step="0.01"
                          value={coopConfig.withdrawalFeeFlat}
                          onChange={(e) => setCoopConfig({ ...coopConfig, withdrawalFeeFlat: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="claimExpiration">Claim Expiration (Days)</Label>
                        <Input
                          id="claimExpiration"
                          type="number"
                          min="1"
                          value={coopConfig.claimExpirationDays}
                          onChange={(e) => setCoopConfig({ ...coopConfig, claimExpirationDays: parseInt(e.target.value) })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="withdrawalMin">Min Withdrawal Amount</Label>
                        <Input
                          id="withdrawalMin"
                          type="number"
                          min="0"
                          step="0.01"
                          value={coopConfig.withdrawalMinAmount}
                          onChange={(e) => setCoopConfig({ ...coopConfig, withdrawalMinAmount: parseFloat(e.target.value) })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <CoopConfigPreview config={coopConfig} />

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Ready to Deploy?</AlertTitle>
                  <AlertDescription>
                    {network === "base" && (
                      <div className="mb-2">
                        <strong>Estimated cost:</strong>{" "}
                        {!optionalContracts.redemptionVault && 
                         !optionalContracts.verifiedStoreRegistry && 
                         !optionalContracts.scRewardEngine && 
                         !optionalContracts.storePaymentRouter
                          ? "~$60-90 (minimal: SC + ALLY + UC)"
                          : optionalContracts.redemptionVault && 
                            !optionalContracts.verifiedStoreRegistry
                          ? "~$110-160 (with redemption vault)"
                          : "~$160-320 (full setup)"}
                      </div>
                    )}
                    Make sure you have enough ETH in your wallet for gas fees. Deployment will take 1-5 minutes.
                    {network === "baseSepolia" && (
                      <a
                        href="https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-blue-600 hover:underline"
                      >
                        Get test ETH from faucet →
                      </a>
                    )}
                  </AlertDescription>
                </Alert>

                {(!coopConfig.name.trim() || !coopConfig.shortName.trim() || !coopConfig.tagline.trim()) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Required Fields Missing</AlertTitle>
                    <AlertDescription>
                      Please fill in the <strong>Co-op Name</strong>, <strong>Short Name</strong>, and <strong>Tagline</strong> fields above. 
                      These are required for your co-op to appear in the mobile app.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={deployContracts}
                    disabled={!coopConfig.name.trim() || !coopConfig.shortName.trim() || !coopConfig.tagline.trim()}
                  >
                    Start Deployment
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Deployment Phase */}
        {currentPhase === "deploy" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deploying Contracts</CardTitle>
                <CardDescription>
                  Please wait while we deploy your contracts to {network === "baseSepolia" ? "Base Sepolia" : "Base Mainnet"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {completedSteps} / {deploymentSteps.length} steps
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="space-y-3">
                  {deploymentSteps.map((step) => (
                    <DeploymentStep
                      key={step.id}
                      stepId={step.id}
                      name={step.name}
                      description={step.description}
                      status={step.status}
                      txHash={step.txHash}
                      contractAddress={step.contractAddress}
                      error={step.error}
                      explorerUrl={explorerUrl}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completion Phase */}
        {currentPhase === "complete" && (
          <div className="space-y-6">
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <CardTitle className="text-green-900 dark:text-green-100">Deployment Successful!</CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-300">
                      Your co-op contracts are now live on {network === "baseSepolia" ? "Base Sepolia" : "Base Mainnet"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Deployed Contracts</h3>
                  <div className="space-y-3">
                    {[
                      { name: "SoulaaniCoin (SC)", address: deployedContracts.soulaaniCoin, description: "Governance token", required: true },
                      { name: "AllyCoin (ALLY)", address: deployedContracts.allyCoin, description: "Cross-coop membership", required: true },
                      { name: "UnityCoin (UC)", address: deployedContracts.unityCoin, description: "Main payment currency", required: true },
                      { name: "RedemptionVault", address: deployedContracts.redemptionVault, description: "Handles redemptions", required: false },
                      { name: "VerifiedStoreRegistry", address: deployedContracts.verifiedStoreRegistry, description: "Store verification", required: false },
                      { name: "SCRewardEngine", address: deployedContracts.scRewardEngine, description: "Reward calculation", required: false },
                      { name: "StorePaymentRouter", address: deployedContracts.storePaymentRouter, description: "Payment routing", required: false },
                    ]
                      .filter((contract) => contract.address)
                      .map((contract) => (
                        <ContractCard
                          key={contract.name}
                          name={contract.name}
                          address={contract.address!}
                          description={contract.description}
                          explorerUrl={explorerUrl}
                        />
                      ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Co-op Configuration</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Name</p>
                      <p className="font-medium">{coopConfig.name}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Short Name</p>
                      <p className="font-medium">{coopConfig.shortName}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Quorum</p>
                      <p className="font-medium">{coopConfig.quorumPercent}%</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Approval Threshold</p>
                      <p className="font-medium">{coopConfig.approvalThresholdPercent}%</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Voting Window</p>
                      <p className="font-medium">{coopConfig.votingWindowDays} days</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded">
                      <p className="text-muted-foreground">Network</p>
                      <p className="font-medium">{network === "baseSepolia" ? "Base Sepolia" : "Base Mainnet"}</p>
                    </div>
                  </div>
                </div>

                {deploymentSteps.find(s => s.id === "save-db")?.status === "completed" && (
                  <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900 dark:text-green-100">Co-op Registered!</AlertTitle>
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      Your co-op <strong>{coopConfig.name}</strong> is now visible in the mobile app. 
                      New members can discover and join your co-op through the onboarding flow.
                    </AlertDescription>
                  </Alert>
                )}

                {deploymentSteps.find(s => s.id === "save-db")?.status === "failed" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Database Save Failed</AlertTitle>
                    <AlertDescription>
                      Your contracts deployed successfully, but we couldn't save your co-op to the database. 
                      Your co-op won't appear in the mobile app until this is resolved. 
                      Contact support with your deployment details.
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Next Steps</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Download your configuration files below</li>
                      <li>Add the .env file to your backend server</li>
                      <li>Verify contracts on BaseScan (optional but recommended)</li>
                      <li>Set up event indexing for your backend</li>
                      <li>Configure reward policies via the admin panel</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button onClick={downloadConfig} variant="outline" className="flex-1">
                    Download JSON Config
                  </Button>
                  <Button onClick={downloadEnvFile} className="flex-1">
                    Download .env File
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Verification Commands (Optional)</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Run these commands to verify your contracts on BaseScan
                  </p>
                  <div className="space-y-2">
                    {deployedContracts.soulaaniCoin && (
                      <div className="p-3 bg-muted/50 rounded font-mono text-xs overflow-x-auto">
                        npx hardhat verify --network {network} {deployedContracts.soulaaniCoin} {coopConfig.governanceBotAddress || address}
                      </div>
                    )}
                    {deployedContracts.allyCoin && (
                      <div className="p-3 bg-muted/50 rounded font-mono text-xs overflow-x-auto">
                        npx hardhat verify --network {network} {deployedContracts.allyCoin} {coopConfig.governanceBotAddress || address} {deployedContracts.soulaaniCoin}
                      </div>
                    )}
                    {deployedContracts.unityCoin && (
                      <div className="p-3 bg-muted/50 rounded font-mono text-xs overflow-x-auto">
                        npx hardhat verify --network {network} {deployedContracts.unityCoin} {coopConfig.treasuryAddress || address} {deployedContracts.soulaaniCoin} {address}
                      </div>
                    )}
                    {deployedContracts.redemptionVault && (
                      <div className="p-3 bg-muted/50 rounded font-mono text-xs overflow-x-auto">
                        npx hardhat verify --network {network} {deployedContracts.redemptionVault} {deployedContracts.unityCoin} [USDC_ADDRESS] {coopConfig.treasuryAddress || address}
                      </div>
                    )}
                    {deployedContracts.verifiedStoreRegistry && (
                      <div className="p-3 bg-muted/50 rounded font-mono text-xs overflow-x-auto">
                        npx hardhat verify --network {network} {deployedContracts.verifiedStoreRegistry} {coopConfig.governanceBotAddress || address}
                      </div>
                    )}
                    {deployedContracts.scRewardEngine && (
                      <div className="p-3 bg-muted/50 rounded font-mono text-xs overflow-x-auto">
                        npx hardhat verify --network {network} {deployedContracts.scRewardEngine} {coopConfig.governanceBotAddress || address} {deployedContracts.soulaaniCoin} {deployedContracts.verifiedStoreRegistry}
                      </div>
                    )}
                    {deployedContracts.storePaymentRouter && (
                      <div className="p-3 bg-muted/50 rounded font-mono text-xs overflow-x-auto">
                        npx hardhat verify --network {network} {deployedContracts.storePaymentRouter} {coopConfig.governanceBotAddress || address} {deployedContracts.unityCoin} {deployedContracts.verifiedStoreRegistry} {deployedContracts.scRewardEngine}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
