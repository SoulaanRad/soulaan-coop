import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Building2,
  Coins,
  Handshake,
  House,
  Landmark,
  Paintbrush,
  PiggyBank,
  ShoppingBasket,
  Sparkles,
  Store,
  Users2,
  Vote,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BusinessSignupForm } from "@/components/business-signup-form";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata: Metadata = {
  title: "Soulaan Co-op | Build Stability Together",
  description:
    "Join a network of digital cooperatives that helps communities support businesses, grow shared treasuries, and vote on solutions to real economic problems.",
  alternates: {
    canonical: "https://soulaan.coop",
  },
};

interface ProblemCard {
  title: string;
  description: string;
  icon: LucideIcon;
}

interface CoopCard {
  name: string;
  description: string;
  focus: string;
  buttonLabel: string;
  accent: string;
  status: "Live Coop" | "Coming Soon";
}

interface StepCard {
  step: string;
  title: string;
  description: string;
}

const problemCards: ProblemCard[] = [
  {
    title: "Affordable Housing",
    description:
      "Support projects that create stable housing options for members and communities.",
    icon: House,
  },
  {
    title: "Cheaper Groceries",
    description:
      "Fund cooperative grocery initiatives or supply chains that reduce food costs.",
    icon: ShoppingBasket,
  },
  {
    title: "Stable Jobs",
    description:
      "Invest in businesses and programs that create long-term employment opportunities.",
    icon: Wallet,
  },
  {
    title: "Small Business Support",
    description: "Provide capital and customers to community businesses.",
    icon: Store,
  },
  {
    title: "Creative Work",
    description:
      "Support artists and cultural projects through shared funding.",
    icon: Paintbrush,
  },
  {
    title: "Community Infrastructure",
    description:
      "Fund tools, spaces, and services that benefit members.",
    icon: Building2,
  },
];

const activeCoops: CoopCard[] = [
  {
    name: "Soulaan Coop",
    description:
      "A cooperative focused on building shared wealth through community businesses, investments, and collective action.",
    focus:
      "Members help grow a shared treasury and vote on projects that improve economic opportunity and stability.",
    buttonLabel: "Join Soulaan Coop",
    accent: "from-emerald-400/30 to-cyan-400/10",
    status: "Live Coop",
  },
  {
    name: "SF Artist Coop",
    description:
      "A cooperative supporting artists in San Francisco by creating shared economic opportunities and funding creative work.",
    focus:
      "Members collaborate to strengthen the local arts community and help artists build sustainable careers.",
    buttonLabel: "Join SF Artist Coop",
    accent: "from-fuchsia-400/30 to-violet-400/10",
    status: "Coming Soon",
  },
  {
    name: "East Bay Food Coop",
    description:
      "A cooperative focused on lowering grocery costs through local food partnerships, shared purchasing, and neighborhood distribution.",
    focus:
      "Members support trusted food businesses, build buying power together, and vote on projects that make essentials more affordable.",
    buttonLabel: "Join East Bay Food Coop",
    accent: "from-amber-400/30 to-orange-400/10",
    status: "Coming Soon",
  },
];

const steps: StepCard[] = [
  {
    step: "Step 1",
    title: "Join a Coop",
    description:
      "Become a member of a cooperative aligned with your community or interests.",
  },
  {
    step: "Step 2",
    title: "Support Businesses",
    description:
      "Members support businesses and services that are part of the coop network.",
  },
  {
    step: "Step 3",
    title: "Grow the Treasury",
    description:
      "A portion of economic activity contributes to a shared treasury.",
  },
  {
    step: "Step 4",
    title: "Vote On Projects",
    description:
      "Members vote on how the treasury is used to fund initiatives that improve the community.",
  },
];

const futureCoops = [
  "Local food cooperatives",
  "Housing cooperatives",
  "Worker cooperatives",
  "Creative cooperatives",
];

const heroLoop = [
  {
    title: "Support Businesses",
    description: "Direct spending toward businesses inside the coop network.",
    icon: Store,
  },
  {
    title: "Grow Shared Funds",
    description: "Turn community economic activity into a treasury with purpose.",
    icon: PiggyBank,
  },
  {
    title: "Vote On Solutions",
    description: "Fund practical projects that make life more affordable and stable.",
    icon: Vote,
  },
];

export default function SoulaanLanding() {
  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_45%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.18),_transparent_30%)]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-sm flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L4 7v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z"
                  fill="url(#logo-gradient)"
                  opacity="0.9"
                />
                <circle cx="12" cy="12" r="3" fill="currentColor" className="text-orange-300" />
                <circle cx="8" cy="10" r="1.5" fill="currentColor" className="text-orange-400" />
                <circle cx="16" cy="10" r="1.5" fill="currentColor" className="text-orange-400" />
                <circle cx="12" cy="16" r="1.5" fill="currentColor" className="text-amber-400" />
                <defs>
                  <linearGradient id="logo-gradient" x1="4" y1="2" x2="20" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgb(251, 146, 60)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-orange-300/80">
                Cahootz
              </p>
              <p className="text-sm text-slate-300">Digital coop network</p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-6 text-sm text-slate-300 md:flex"
            role="navigation"
            aria-label="Main navigation"
          >
            <Link href="#problems" className="transition hover:text-white">
              Problems We Solve
            </Link>
            <Link href="#coops" className="transition hover:text-white">
              Active Coops
            </Link>
            <Link href="#how-it-works" className="transition hover:text-white">
              How It Works
            </Link>
            <Link href="#member-signup" className="transition hover:text-white">
              Join
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200">
                <Sparkles className="h-4 w-4" />
                Coops built for real-world stability
              </div>

              <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-tight text-white md:text-7xl">
                Build Stability Together
              </h1>

              <p className="mt-6 max-w-3xl text-xl leading-8 text-slate-300">
                Join a cooperative that helps members support businesses, fund
                projects, and vote on solutions to real economic problems.
              </p>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-400">
                Instead of waiting for institutions to fix things,
                cooperatives let communities organize resources and build
                systems that create stability, ownership, and opportunity.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="#member-signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-base font-medium text-slate-950 transition hover:bg-slate-200"
                >
                  Join as a Member
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="#business-signup"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-base font-medium text-white transition hover:border-white/25 hover:bg-white/10"
                >
                  Bring a Business
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    label: "Member-owned",
                    copy: "Communities decide what gets built.",
                  },
                  {
                    label: "Treasury-backed",
                    copy: "Economic activity grows shared resources.",
                  },
                  {
                    label: "Problem-focused",
                    copy: "Housing, food, jobs, and cultural work.",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
                  >
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-indigo-500/20 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-cyan-950/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/70">
                      Impact loop
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      Everyday activity becomes shared power
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                    Network mode
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {heroLoop.map(({ title, description, icon: Icon }, index) => (
                    <div
                      key={title}
                      className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300/20 to-cyan-400/20 text-emerald-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-medium text-white">{title}</h3>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                              0{index + 1}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-400">
                            {description}
                          </p>
                          <div className="mt-4 h-2 rounded-full bg-white/10">
                            <div
                              className={`h-2 rounded-full ${
                                index === 0
                                  ? "w-3/4 bg-gradient-to-r from-emerald-300 to-cyan-300"
                                  : index === 1
                                    ? "w-2/3 bg-gradient-to-r from-cyan-300 to-blue-300"
                                    : "w-4/5 bg-gradient-to-r from-violet-300 to-fuchsia-300"
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3 text-emerald-200">
                      <Coins className="h-5 w-5" />
                      <p className="font-medium">Shared treasury</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Funds can be directed toward projects that lower costs and
                      create stability.
                    </p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-3 text-cyan-200">
                      <Users2 className="h-5 w-5" />
                      <p className="font-medium">Member governance</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Members choose priorities instead of platforms extracting
                      value from them.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="problems" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <Landmark className="h-4 w-4" />
                What Problems Coops Can Solve
              </div>
              <h2 className="mt-6 text-4xl font-semibold md:text-5xl">
                Vote On What Matters
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">
                Members of each coop can vote on proposals that address real
                challenges in the economy. The cooperative treasury can be used
                to support solutions that improve everyday life.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {problemCards.map(({ title, description, icon: Icon }) => (
                <div
                  key={title}
                  className="group rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-emerald-300/20 hover:bg-white/[0.05]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/5 text-emerald-200">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="coops" className="border-y border-white/5 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  <Handshake className="h-4 w-4" />
                  Active Coops
                </div>
                <h2 className="mt-6 text-4xl font-semibold md:text-5xl">
                  Pick a coop that matches the future you want to build
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-slate-400">
                Each coop has its own focus, its own members, and its own
                proposals. Join an existing coop now, or use the signup flow to
                tell us what kind of cooperative should launch next.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {activeCoops.map((coop) => (
                <div
                  key={coop.name}
                  className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80"
                >
                  <div className={`h-2 bg-gradient-to-r ${coop.accent}`} />
                  <div className="p-6">
                    <div
                      className={`inline-flex rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                        coop.status === "Live Coop"
                          ? "border border-white/10 bg-white/5 text-slate-300"
                          : "border border-amber-300/20 bg-amber-300/10 text-amber-200"
                      }`}
                    >
                      {coop.status}
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold text-white">
                      {coop.name}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-slate-400">
                      {coop.description}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-slate-300">
                      {coop.focus}
                    </p>
                    <Link
                      href={`/?coop=${encodeURIComponent(coop.name)}#member-signup`}
                      className="mt-8 inline-flex items-center rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
                    >
                      {coop.buttonLabel}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <Vote className="h-4 w-4" />
                How It Works
              </div>
              <h2 className="mt-6 text-4xl font-semibold md:text-5xl">
                A simple loop that turns participation into collective leverage
              </h2>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6"
                >
                  <div className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
                    {step.step}
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <Coins className="h-4 w-4" />
                Why Cooperatives
              </div>
              <h2 className="mt-6 text-4xl font-semibold md:text-5xl">
                Keep Value In The Community
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-400">
                Many modern platforms extract value from the communities that
                use them.
              </p>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Cooperatives work differently. Members share ownership, grow
                collective resources, and decide together how those resources
                are used.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 text-rose-200">
                  <ArrowRight className="h-5 w-5 rotate-45" />
                  <h3 className="font-semibold text-white">Extractive model</h3>
                </div>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-400">
                  <li>Users create value and someone else captures it.</li>
                  <li>Communities generate data, demand, and revenue without control.</li>
                  <li>Decisions happen far away from the people affected.</li>
                </ul>
              </div>

              <div className="rounded-[1.75rem] border border-emerald-300/15 bg-emerald-300/[0.06] p-6">
                <div className="flex items-center gap-3 text-emerald-200">
                  <Users2 className="h-5 w-5" />
                  <h3 className="font-semibold text-white">Cooperative model</h3>
                </div>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                  <li>Members support businesses that feed back into shared goals.</li>
                  <li>Treasuries can fund housing, jobs, groceries, and infrastructure.</li>
                  <li>Voting power stays with the people building the network.</li>
                </ul>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6 sm:col-span-2">
                <div className="flex items-center gap-3 text-cyan-200">
                  <PiggyBank className="h-5 w-5" />
                  <h3 className="font-semibold text-white">
                    Coops are practical tools, not abstract ideals
                  </h3>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                  The point is not to make the economy sound better. The point
                  is to help people handle rent, food, work, and opportunity
                  with systems they can actually influence.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-transparent p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                  <Sparkles className="h-4 w-4" />
                  Future Coops
                </div>
                <h2 className="mt-6 text-4xl font-semibold md:text-5xl">
                  More Coops Coming Soon
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                  Communities across different industries and cities will be
                  able to create cooperatives focused on their own economic
                  goals.
                </p>
                <Link
                  href="#member-signup"
                  className="mt-8 inline-flex items-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3 text-base font-medium text-white transition hover:border-white/25 hover:bg-white/10"
                >
                  Start a Coop
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {futureCoops.map((coopType) => (
                  <div
                    key={coopType}
                    className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 text-sm font-medium text-slate-200"
                  >
                    {coopType}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="member-signup" className="border-y border-white/5 bg-white/[0.02] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <Users2 className="h-4 w-4" />
                Join the network
              </div>
              <h2 className="mt-6 text-4xl font-semibold md:text-5xl">
                Choose your path into the coop economy
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">
                Sign up as a member, bring a business into the network, or tell
                us which cooperative you want to join next. The forms stay on
                this page so people can move from interest to action in one
                step.
              </p>

              <div className="mt-8 grid gap-4">
                <Link
                  href="#member-form"
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-300/20 hover:bg-white/[0.05]"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">
                    Member signup
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">
                    Join a coop and tell us which one you want.
                  </p>
                </Link>

                <Link
                  href="#business-signup"
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-300/20 hover:bg-white/[0.05]"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-cyan-200">
                    Business signup
                  </p>
                  <p className="mt-2 text-lg font-medium text-white">
                    Bring customers, capacity, and long-term local value.
                  </p>
                </Link>
              </div>
            </div>

            <div id="member-form" className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-emerald-200/80">
                    Member waitlist
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    Get updates and choose your coop
                  </h3>
                </div>
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                  User path
                </div>
              </div>
              <WaitlistForm source="contact" variant="card" />
            </div>
          </div>
        </section>

        <section id="business-signup" className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
                <Store className="h-4 w-4" />
                Business signup
              </div>
              <h2 className="mt-6 text-4xl font-semibold md:text-5xl">
                Add a business to the coop network
              </h2>
              <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-400">
                Businesses help the network grow, members gain more places to
                circulate value, and the treasury gains more capacity to fund
                useful projects.
              </p>
            </div>
            <BusinessSignupForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-10 text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-sm flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L4 7v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5z"
                  fill="url(#footer-logo-gradient)"
                  opacity="0.9"
                />
                <circle cx="12" cy="12" r="3" fill="currentColor" className="text-orange-300" />
                <circle cx="8" cy="10" r="1.5" fill="currentColor" className="text-orange-400" />
                <circle cx="16" cy="10" r="1.5" fill="currentColor" className="text-orange-400" />
                <circle cx="12" cy="16" r="1.5" fill="currentColor" className="text-amber-400" />
                <defs>
                  <linearGradient id="footer-logo-gradient" x1="4" y1="2" x2="20" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgb(251, 146, 60)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="rgb(245, 158, 11)" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Cahootz is building digital cooperatives that keep value,
              ownership, and decision-making closer to the people creating it.
            </p>
          </div>

          <Link
            href="https://github.com/soulaan-coop"
            target="_blank"
            className="inline-flex items-center text-sm text-slate-300 transition hover:text-white"
          >
            View on GitHub
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
