"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, FileText, BarChart3, Settings, LogOut, Landmark, Store, Coins, ChevronDown } from "lucide-react";
import { useWeb3Auth } from "@/hooks/use-web3-auth";
import { useState } from "react";
import BackendWalletStatus from "./backend-wallet-status";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string; // Single item groups can have direct href
  items?: NavItem[]; // Multi-item groups have dropdown
  adminOnly?: boolean;
}

const navGroups: NavGroup[] = [
  {
    title: "Dashboard",
    icon: BarChart3,
    href: "/portal",
  },
  {
    title: "People",
    icon: Users,
    items: [
      { title: "Members", href: "/portal/members", icon: Users },
      { title: "Applications", href: "/portal/applications", icon: FileText },
    ],
  },
  {
    title: "Commerce",
    icon: Store,
    adminOnly: true,
    items: [
      { title: "Stores", href: "/portal/stores", icon: Store },
      { title: "SC Rewards", href: "/portal/sc-rewards", icon: Coins },
    ],
  },
  {
    title: "Treasury",
    icon: Landmark,
    href: "/portal/treasury",
    adminOnly: true,
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/portal/settings",
  },
];

export function PortalNav() {
  const pathname = usePathname();
  const { logout, isLoading, isAdmin, adminRole } = useWeb3Auth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Check if any item in a group is active
  const isGroupActive = (group: NavGroup) => {
    if (group.href) {
      return pathname === group.href;
    }
    if (group.items) {
      return group.items.some(item => pathname === item.href);
    }
    return false;
  };

  return (
    <div className="border-b border-slate-700 bg-slate-900">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/portal" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SC</span>
              </div>
              <span className="font-semibold text-lg text-white">Admin Portal</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navGroups.map((group) => {
                // Skip admin-only groups for non-admins
                if (group.adminOnly && !isAdmin) {
                  return null;
                }

                const Icon = group.icon;
                const isActive = isGroupActive(group);

                // Single item - render as link
                if (group.href) {
                  return (
                    <Link
                      key={group.href}
                      href={group.href}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-slate-800 text-white"
                          : "text-gray-400 hover:text-white hover:bg-slate-800/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {group.title}
                    </Link>
                  );
                }

                // Group with items - render as dropdown
                return (
                  <DropdownMenu key={group.title}>
                    <DropdownMenuTrigger
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors outline-none",
                        isActive
                          ? "bg-slate-800 text-white"
                          : "text-gray-400 hover:text-white hover:bg-slate-800/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {group.title}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="bg-slate-900 border-slate-700"
                    >
                      {group.items?.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = pathname === item.href;
                        
                        return (
                          <DropdownMenuItem
                            key={item.href}
                            asChild
                            className={cn(
                              "cursor-pointer text-gray-300 hover:text-white hover:bg-slate-800 focus:bg-slate-800 focus:text-white",
                              isItemActive && "bg-slate-800 text-white"
                            )}
                          >
                            <Link
                              href={item.href}
                              className="flex items-center gap-2 px-2 py-2"
                            >
                              <ItemIcon className="h-4 w-4" />
                              {item.title}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {/* Gas Wallet Status */}
            {isAdmin && <BackendWalletStatus />}

            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <p className="text-sm font-medium text-white">Deon Robinson</p>
                {isAdmin && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-md">
                    ADMIN
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                admin@soulaan.coop
                {isAdmin && adminRole && (
                  <span className="ml-2 text-amber-400">• {adminRole}</span>
                )}
              </p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Logout"
            >
              <LogOut className={cn("h-5 w-5", isLoggingOut && "animate-pulse")} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
