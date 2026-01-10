"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Users, FileText, BarChart3, Settings, LogOut } from "lucide-react";

const navItems = [
  {
    title: "Dashboard",
    href: "/portal",
    icon: BarChart3,
  },
  {
    title: "Members",
    href: "/portal/members",
    icon: Users,
  },
  {
    title: "Applications",
    href: "/portal/applications",
    icon: FileText,
  },
  {
    title: "Settings",
    href: "/portal/settings",
    icon: Settings,
  },
];

export function PortalNav() {
  const pathname = usePathname();

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
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-gray-400 hover:text-white hover:bg-slate-800/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-gray-400">admin@soulaan.coop</p>
            </div>
            <button className="p-2 text-gray-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
