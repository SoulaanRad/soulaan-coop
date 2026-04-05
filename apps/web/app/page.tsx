import type { Metadata } from "next";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Store,
  Users,
  Zap,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BusinessSignupForm } from "@/components/business-signup-form";
import { WaitlistSignupForm } from "@/components/waitlist-signup-form";
import { env } from "@/env";

interface CoopOption {
  coopId: string;
  name: string;
  tagline: string | null;
  description: string | null;
  isLive: boolean;
}

async function getActiveCoops(): Promise<CoopOption[]> {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const response = await fetch(`${apiUrl}/trpc/coopConfig.listActiveCoops`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Failed to fetch coops:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.result.data as CoopOption[];
  } catch (error) {
    console.error('Error fetching coops:', error);
    return [];
  }
}

const CARD_GRADIENTS = [
  "from-[#f59e0b]/20 to-[#ea580c]/10",
  "from-purple-500/20 to-violet-500/10",
  "from-green-500/20 to-emerald-500/10",
  "from-blue-500/20 to-cyan-500/10",
  "from-pink-500/20 to-rose-500/10",
];

export const metadata: Metadata = {
  title: "Cahootz | Shop Local. Earn Tokens. Fund Your Community.",
  description:
    "A cooperative business network where every purchase earns you tokens. Small fees fund community projects decided by AI governance.",
  alternates: {
    canonical: "https://soulaan.coop",
  },
};

const steps = [
  {
    number: "01",
    title: "Shop at local spots",
    description: "Bars, restaurants, shops—anywhere in the network. Pay like normal.",
  },
  {
    number: "02",
    title: "Stack tokens automatically",
    description: "Every dollar you spend earns tokens. No apps to scan, no codes to enter.",
  },
  {
    number: "03",
    title: "Small cut funds the pot",
    description: "2.5% from you, 2.5% from the business. Every cent goes to a shared treasury.",
  },
  {
    number: "04",
    title: "AI follows your rules",
    description: "Community-agreed rules decide where the money goes. No politics. No BS.",
  },
];

const memberBenefits = [
  "Earn tokens on every purchase",
  "Redeem for drinks, discounts, merch",
  "Vote on how treasury gets spent",
  "Share in the upside",
];

const businessBenefits = [
  "Loyal customers who actually come back",
  "Lower than credit card fees",
  "Access to treasury funding",
  "Community has your back",
];

const faqs = [
  {
    q: "Why would I pay 2.5% extra?",
    a: "Because it doesn't disappear into some corporate pocket. It goes into a community fund that supports local businesses, funds projects you vote on, and eventually pays you back. You're investing in your neighborhood, not Visa.",
  },
  {
    q: "An AI decides where money goes?",
    a: "The AI doesn't decide anything. It follows a rulebook the community writes. Rules like 'prioritize local impact' or 'keep 20% in reserve.' You create the rules, you change the rules. The AI just applies them without favoritism.",
  },
  {
    q: "What if I disagree with a decision?",
    a: "Propose a rule change. Get enough token holders to vote for it, and the rules update. Simple as that.",
  },
  {
    q: "How's this different from credit card rewards?",
    a: "Credit card rewards come from merchant fees that go to banks. Here, the fees stay local. The treasury belongs to the community—the people who actually live and work here.",
  },
];

export default async function HomePage() {
  const coops = await getActiveCoops();
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#1a1a1a]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f59e0b] text-white font-black text-lg">
              C
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight leading-tight">Cahootz</span>
              <span className="text-xs text-slate-400 leading-tight">Digital coop network</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            <Link href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">
              How it works
            </Link>
            <Link href="#governance" className="text-slate-400 hover:text-white transition-colors">
              Governance
            </Link>
            <Link href="#businesses" className="text-slate-400 hover:text-white transition-colors">
              For Businesses
            </Link>
          </nav>

          <Link
            href="#join"
            className="rounded-lg bg-[#f59e0b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#ea580c] transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-1.5 text-sm font-medium text-[#f59e0b]">
                <Zap className="h-4 w-4" />
                Coops built for real-world stability
              </div>
              <h1 className="mt-6 text-5xl font-semibold leading-tight md:text-7xl">
                Build Stability Together
              </h1>
              <p className="mt-6 text-xl text-slate-300 leading-relaxed max-w-2xl">
                Join a cooperative that helps members support businesses, fund
                projects, and vote on solutions to real economic problems.
              </p>
              <p className="mt-5 text-lg text-slate-400 leading-relaxed max-w-2xl">
                Instead of waiting for institutions to fix things,
                cooperatives let communities organize resources and build
                systems that create stability, ownership, and opportunity.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="#join"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#f59e0b] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#ea580c] transition-colors"
                >
                  Join as a member
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="#businesses"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3.5 text-base font-semibold hover:bg-white/5 transition-colors"
                >
                  Add your business
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-white/10 bg-[#252525] px-6 py-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 text-center md:grid-cols-3">
              <div>
                <p className="text-5xl font-black">2.5%</p>
                <p className="mt-2 text-slate-400">You chip in</p>
              </div>
              <div>
                <p className="text-5xl font-black">2.5%</p>
                <p className="mt-2 text-slate-400">Business chips in</p>
              </div>
              <div>
                <p className="text-5xl font-black text-[#f59e0b]">100%</p>
                <p className="mt-2 text-slate-400">Stays in the community</p>
              </div>
            </div>
            <p className="mt-8 text-center text-sm text-slate-400">
              No corporate extraction. No middlemen. Just neighbors looking out for neighbors.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">How it works</h2>
            <p className="mt-3 text-lg text-slate-400">
              Dead simple. No hoops, no hassle.
            </p>

            <div className="mt-16 grid gap-12 md:grid-cols-2">
              {steps.map(({ number, title, description }) => (
                <div key={number} className="flex gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#252525] text-sm font-bold text-[#f59e0b]">
                    {number}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{title}</h3>
                    <p className="mt-2 text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Example */}
            <div className="mt-16 rounded-xl border border-white/10 bg-[#252525] p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Real example</p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <span className="text-lg font-bold">$100 tab</span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
                <span className="text-lg">You pay <span className="font-bold">$102.50</span></span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
                <span className="text-lg">Bar gets <span className="font-bold">$97.50</span></span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
                <span className="text-lg font-bold text-[#f59e0b]">$5 to the pot</span>
              </div>
            </div>
          </div>
        </section>

        {/* AI Governance */}
        <section id="governance" className="border-t border-white/10 bg-[#252525] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-1.5 text-sm font-medium text-[#f59e0b]">
                AI Governance
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
                You write the rules.<br />
                The AI follows them.
              </h2>
              <p className="mt-5 text-lg text-slate-400 leading-relaxed">
                No board of directors. No committee meetings that drag on forever. 
                An AI evaluates proposals and allocates funds—but it only does 
                what the community tells it to. Fair, fast, no favoritism.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-8">
                <h3 className="text-lg font-bold">Rules the AI follows right now:</h3>
                <ul className="mt-6 space-y-4">
                  <li className="flex items-start gap-4">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-[#f59e0b]" />
                    <span><strong>Local first</strong> — Funds must benefit the immediate community</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-[#f59e0b]" />
                    <span><strong>Small business priority</strong> — Preference for spots under $1M revenue</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-[#f59e0b]" />
                    <span><strong>Emergency fund</strong> — Always keep 20% on hand for rainy days</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-[#f59e0b]" />
                    <span><strong>Show your work</strong> — Every decision gets a public explanation</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#1a1a1a] p-8">
                <h3 className="text-lg font-bold">How to change the rules:</h3>
                <div className="mt-6 space-y-6">
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-sm font-bold text-white">1</div>
                    <p className="text-slate-400">Any token holder proposes a new rule or change</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-sm font-bold text-white">2</div>
                    <p className="text-slate-400">Community votes with tokens (more tokens = more weight)</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f59e0b] text-sm font-bold text-white">3</div>
                    <p className="text-slate-400">Pass the vote, update the rules. AI adapts immediately.</p>
                  </div>
                </div>
                <p className="mt-8 text-sm text-slate-400 border-t border-white/10 pt-6">
                  The AI is a tool. You&apos;re the boss.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* For Members & Businesses */}
        <section id="businesses" className="border-t border-white/10 px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-16 md:grid-cols-2">
              {/* Members */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#252525] px-4 py-2 text-sm font-semibold">
                  <Users className="h-4 w-4 text-[#f59e0b]" />
                  For Members
                </div>
                <h3 className="mt-5 text-2xl font-black">What you get for 2.5%</h3>
                <ul className="mt-8 space-y-4">
                  {memberBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-4">
                      <Check className="h-5 w-5 text-slate-400" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="#join"
                  className="mt-10 inline-flex items-center gap-3 rounded-xl border border-white/10 bg-[#252525] px-6 py-4 font-semibold hover:bg-[#2a2a2a] transition-colors"
                >
                  <Smartphone className="h-5 w-5 text-[#f59e0b]" />
                  Download the app
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>

              {/* Businesses */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#252525] px-4 py-2 text-sm font-semibold">
                  <Store className="h-4 w-4 text-[#f59e0b]" />
                  For Businesses
                </div>
                <h3 className="mt-5 text-2xl font-black">Why 2.5% is worth it</h3>
                <p className="mt-3 text-slate-400">
                  Less than credit cards. Money stays local. And your regulars become actual stakeholders.
                </p>
                <ul className="mt-8 space-y-4">
                  {businessBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-4">
                      <Check className="h-5 w-5 text-slate-400" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="#business-form"
                  className="mt-10 inline-flex items-center gap-2 font-semibold text-[#f59e0b] hover:underline"
                >
                  Apply to join the network
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Active Networks — pulled from CoopConfig */}
        {coops.length > 0 && (
          <section className="border-t border-white/10 bg-[#252525] px-6 py-24">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Active networks</h2>
              <p className="mt-3 text-lg text-slate-400">
                Cahootz powers co-ops across the Bay Area.
              </p>

              <div className="mt-12 grid gap-6 md:grid-cols-3">
                {coops.map((coop, i) => (
                  <div key={coop.coopId} className="overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] flex flex-col">
                    <div className={`relative h-48 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]}`}>
                      {coop.isLive ? (
                        <span className="absolute top-3 right-3 rounded-full bg-[#f59e0b] px-3 py-1 text-xs font-bold text-white">LIVE</span>
                      ) : (
                        <span className="absolute top-3 right-3 rounded-full bg-[#252525] px-3 py-1 text-xs font-bold text-slate-400">SOON</span>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-lg font-bold">{coop.name}</h3>
                      {coop.tagline && (
                        <p className="mt-1 text-sm text-slate-400">{coop.tagline}</p>
                      )}
                      {coop.description && (
                        <p className="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-6">{coop.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ */}
        <section className="border-t border-white/10 px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">Real talk</h2>

            <div className="mt-12 space-y-10">
              {faqs.map(({ q, a }) => (
                <div key={q}>
                  <h3 className="text-lg font-bold">{q}</h3>
                  <p className="mt-3 text-slate-400 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Join Section */}
        <section id="join" className="border-t border-white/10 bg-[#f59e0b] px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-16 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white md:text-4xl">
                  Join the waitlist
                </h2>
                <p className="mt-5 text-lg text-white/80 leading-relaxed">
                  Be the first to know when we launch in your area. 
                  Get early access to the network that keeps money in the neighborhood.
                </p>
                <div className="mt-10">
                  <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white/10" />}>
                    <WaitlistSignupForm coops={coops} />
                  </Suspense>
                </div>
              </div>

              <div id="business-form">
                <h3 className="text-2xl font-bold text-white">Add your business</h3>
                <p className="mt-3 text-white/70">
                  Join the network. Get discovered by locals who want to support you.
                </p>
                <div className="mt-8">
                  <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-white/10" />}>
                    <BusinessSignupForm coops={coops} />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#252525] px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f59e0b] text-white font-black">
                C
              </div>
              <span className="font-bold">Cahootz</span>
            </div>
            <p className="text-sm text-slate-400">
              Keeping money where it belongs—in the neighborhood.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
