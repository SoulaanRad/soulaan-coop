"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function MockAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (isLoggedIn) {
    return (
      <div className="flex items-center space-x-4">
        <p className="text-sm text-slate-300">Welcome, Admin</p>
        <Button variant="outline" size="sm" onClick={() => setIsLoggedIn(false)}>
          Log Out
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Button size="sm" onClick={() => setIsLoggedIn(true)}>
        Log In
      </Button>
      <Button variant="secondary" size="sm">
        Sign Up
      </Button>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/admin" className="text-xl font-bold text-white">
            Soulaan Co-op Admin
          </Link>
          <MockAuth />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
