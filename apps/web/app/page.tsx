import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BusinessSignupForm } from "@/components/business-signup-form";
import { CommunityIcon } from "@/components/icons/community-icon";
import { CommunityInvestmentIcon } from "@/components/icons/community-investment-icon";
import { GovernanceIcon } from "@/components/icons/governance-icon";
import { PaymentIcon } from "@/components/icons/payment-icon";
import { SCIcon } from "@/components/icons/sc-icon";
import { UCIcon } from "@/components/icons/uc-icon";
import { UnityIcon } from "@/components/icons/unity-icon";
import { VoiceIcon } from "@/components/icons/voice-icon";
import { WaitlistForm } from "@/components/waitlist-form";

// Page-specific metadata
export const metadata: Metadata = {
  title:
    "Soulaan Co-op | Building Generational Wealth Through Economic Cooperation",
  description:
    "Join the Soulaan Co-op and transform everyday spending into community wealth. Use Unity Coin (UC) and SoulaaniCoin (SC) to keep money circulating in Black communities while earning rewards and voting power.",
  alternates: {
    canonical: "https://soulaan.coop",
  },
};

export default function SoulaanLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center space-x-2">
            <div className="relative h-8 w-10">
              <Image
                src="/images/soulaan-flag.jpg"
                alt="Soulaan Co-op Flag - Building Community Wealth"
                fill
                className="rounded-md object-cover"
                priority
              />
            </div>
            <span className="text-xl font-bold text-white">Soulaan Co-op</span>
          </div>
          <nav
            className="hidden items-center space-x-6 md:flex"
            role="navigation"
            aria-label="Main navigation"
          >
            <Link
              href="#about"
              className="text-slate-300 transition-colors hover:text-blue-400"
            >
              About Us
            </Link>
            <Link
              href="#how-it-works"
              className="text-slate-300 transition-colors hover:text-blue-400"
            >
              How It Works
            </Link>
            <Link
              href="#status"
              className="text-slate-300 transition-colors hover:text-blue-400"
            >
              Our Progress
            </Link>
            <Link
              href="#contact"
              className="text-slate-300 transition-colors hover:text-blue-400"
            >
              Get Involved
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-4 py-20">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-6xl">
              Building Generational Wealth for Our Community
              <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                {" "}
                Through Economic Cooperation
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl leading-relaxed text-slate-300">
              Welcome to the Soulaan Co-op—where every rent payment, every
              shopping trip, and every dollar you spend in the neighborhood
              creates investment in your community. We're making our community
              money work harder for us, not just for somebody else.
            </p>
            <div className="space-y-6">
              <WaitlistForm source="hero" variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-slate-800 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              About Soulaan Co-op
            </h2>
            <p className="mx-auto max-w-4xl text-xl leading-relaxed text-slate-300">
              Soulaan Co-op is all about making your money do double-duty:
              support your people, and build real wealth for the culture. Every
              time you spend at a participating Black business, you get
              rewards—and those rewards give you a say in what we build next.
              The more you use it, the more the community wins.
            </p>
          </div>

          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h3 className="mb-6 text-2xl font-bold text-white">
                We use two digital dollars:
              </h3>

              <div className="space-y-6">
                <div className="flex items-start space-x-4 rounded-lg bg-slate-700 p-4">
                  <UCIcon className="mt-1 h-8 w-8 flex-shrink-0" />
                  <div>
                    <h4 className="mb-2 text-lg font-semibold text-white">
                      Unity Coin (UC)
                    </h4>
                    <p className="text-slate-300">
                      Our stable, digital money for shopping, paying rent, or
                      getting paid at work. Use it just like cash, Venmo, or
                      Cash App.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 rounded-lg bg-slate-700 p-4">
                  <SCIcon className="mt-1 h-8 w-8 flex-shrink-0 text-blue-400" />
                  <div>
                    <h4 className="mb-2 text-lg font-semibold text-white">
                      SoulaaniCoin (SC)
                    </h4>
                    <p className="text-slate-300">
                      Your "receipt" for spending, earning, or paying rent with
                      UC. Gives you a say (and a stake) in what the community
                      does next.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-blue-500">
                <CommunityIcon className="mx-auto mb-3 h-8 w-8 text-blue-400" />
                <h4 className="font-bold text-white">Keep Money</h4>
                <p className="text-sm text-slate-300">
                  In the Community's Hands
                </p>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-green-500">
                <CommunityInvestmentIcon className="mx-auto mb-3 h-8 w-8 text-green-400" />
                <h4 className="font-bold text-white">Invest in Your</h4>
                <p className="text-sm text-slate-300">Community Easily</p>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-blue-500">
                <GovernanceIcon className="mx-auto mb-3 h-8 w-8 text-blue-400" />
                <h4 className="font-bold text-white">Get Your</h4>
                <p className="text-sm text-slate-300">Voice Heard</p>
              </div>
              <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-green-500">
                <UnityIcon className="mx-auto mb-3 h-8 w-8 text-green-400" />
                <h4 className="font-bold text-white">Build</h4>
                <p className="text-sm text-slate-300">Together</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-slate-800 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              How It Works: For Businesses & Everyday People
            </h2>
          </div>

          <div className="mb-16 grid gap-12 lg:grid-cols-2">
            {/* For Businesses */}
            <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-700 p-8">
              <div className="pb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-green-500">
                  <PaymentIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  For Businesses
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 h-5 w-5 flex-shrink-0 text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Accept Unity Coin just like cash, Venmo, or Cash App
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 h-5 w-5 flex-shrink-0 text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Every sale earns you bonus rewards and puts you in the room
                    when big decisions are made
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 h-5 w-5 flex-shrink-0 text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Attract loyal customers who want to keep their dollars
                    circulating in the culture
                  </p>
                </div>
              </div>
            </div>

            {/* For Everyday People */}
            <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-700 p-8">
              <div className="pb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-blue-500">
                  <CommunityIcon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white">
                  For Everyday People
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 h-5 w-5 flex-shrink-0 text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Shop at Black-owned stores or pay your rent with Unity Coin
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 h-5 w-5 flex-shrink-0 text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Earn SoulaaniCoin every time you spend or pay your
                    bills—like racking up points, but with voting power
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-1 h-5 w-5 flex-shrink-0 text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Use your coins to vote on what gets built or funded next:
                    new businesses, housing, community projects
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Partnership Section */}
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                Ready to Partner With Us?
              </h3>
              <p className="text-lg text-slate-300">
                Get listed, get new customers, and earn extra rewards every time
                folks pay with Unity Coin. Plus, you get a seat at the table to
                help shape the future of the Black economy.
              </p>
            </div>
            <BusinessSignupForm />
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              Why Join?
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-300">
              No banks shutting you out, no red tape, no empty promises. Just a
              new way to build, spend, and win together.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-blue-500">
              <CommunityInvestmentIcon className="mx-auto mb-4 h-12 w-12 text-green-400" />
              <h4 className="mb-2 font-bold text-white">Keep More Money</h4>
              <p className="text-sm text-slate-300">in the community's hands</p>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-green-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-4 h-12 w-12 text-blue-400"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <h4 className="mb-2 font-bold text-white">Earn Extra Rewards</h4>
              <p className="text-sm text-slate-300">for supporting your own</p>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-blue-500">
              <VoiceIcon className="mx-auto mb-4 h-12 w-12 text-blue-400" />
              <h4 className="mb-2 font-bold text-white">Get a Say</h4>
              <p className="text-sm text-slate-300">
                in how community money gets used
              </p>
            </div>
            <div className="rounded-lg border border-slate-600 bg-slate-700 p-6 text-center transition-colors hover:border-green-500">
              <UnityIcon className="mx-auto mb-4 h-12 w-12 text-green-400" />
              <h4 className="mb-2 font-bold text-white">
                Build Real Ownership
              </h4>
              <p className="text-sm text-slate-300">
                and legacy for your family
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Status Table */}
      <section id="status" className="bg-slate-800 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
              What We're Building
            </h2>
            <p className="mx-auto max-w-3xl text-xl text-slate-300">
              Check out our progress—we're building this step by step, and
              everything is open source so you can see exactly how we're doing
              it.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-600 bg-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-600">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">
                      Service Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">
                      What it Does
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">
                      Open Source?
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  <tr className="transition-colors hover:bg-slate-600">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-white">
                      UC Wallet
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                      Hold and spend Unity Coin
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-600 px-2 text-xs font-semibold leading-5 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 h-3 w-3"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Planned
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-green-600 px-2 text-xs font-semibold leading-5 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 h-3 w-3"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Yes
                      </span>
                    </td>
                  </tr>
                  <tr className="transition-colors hover:bg-slate-600">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-white">
                      SC Governance Portal
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                      Vote, earn, and get rewards with SoulaaniCoin
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-600 px-2 text-xs font-semibold leading-5 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 h-3 w-3"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Planned
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-green-600 px-2 text-xs font-semibold leading-5 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 h-3 w-3"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Yes
                      </span>
                    </td>
                  </tr>
                  <tr className="transition-colors hover:bg-slate-600">
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-white">
                      Merchant POS
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                      Accept Unity Coin at your business
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-blue-600 px-2 text-xs font-semibold leading-5 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 h-3 w-3"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Planned
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex rounded-full bg-green-600 px-2 text-xs font-semibold leading-5 text-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1 h-3 w-3"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Yes
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Get Involved Section */}
      <section
        id="contact"
        className="bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-20"
      >
        <div className="container mx-auto max-w-4xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Email Signup */}
            <div>
              <h2 className="mb-4 text-3xl font-bold text-white">
                Get Involved
              </h2>
              <p className="mb-6 leading-relaxed text-slate-300">
                Drop your email below to stay in the loop—be the first to know
                about launch dates, community events, and new features.
              </p>
              <WaitlistForm source="contact" variant="card" />
            </div>

            {/* GitHub Link */}
            <div className="text-center md:text-left">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Check Out Our Progress
              </h2>
              <p className="mb-6 leading-relaxed text-slate-300">
                Curious or want to help build? Check the code, pitch ideas, or
                follow along on GitHub.
              </p>
              <Link
                href="https://github.com/soulaan-coop"
                target="_blank"
                className="inline-flex items-center"
              >
                <button className="flex items-center rounded-md border border-slate-600 bg-slate-700 px-6 py-3 font-medium text-white hover:border-slate-500 hover:bg-slate-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2 h-5 w-5"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  View on GitHub
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-2 h-4 w-4"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black px-4 py-12 text-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="mb-4 flex items-center space-x-2">
                <div className="relative h-8 w-10">
                  <Image
                    src="/images/soulaan-flag.jpg"
                    alt="Soulaan Co-op Flag"
                    fill
                    className="rounded-md object-cover"
                  />
                </div>
                <span className="text-xl font-bold">Soulaan Co-op</span>
              </div>
              <p className="leading-relaxed text-slate-400">
                Building generational wealth for our community through economic
                cooperation. Keeping money moving between us—turning everyday
                business into ownership, voting power, and real community
                wealth.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link
                    href="#about"
                    className="transition-colors hover:text-white"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="transition-colors hover:text-white"
                  >
                    How It Works
                  </Link>
                </li>

                <li>
                  <Link
                    href="#status"
                    className="transition-colors hover:text-white"
                  >
                    Our Progress
                  </Link>
                </li>
                <li>
                  <Link
                    href="#contact"
                    className="transition-colors hover:text-white"
                  >
                    Get Involved
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-semibold">Connect With Us</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    Discord
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="transition-colors hover:text-white">
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/soulaan-coop"
                    className="transition-colors hover:text-white"
                  >
                    GitHub
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-8 text-center text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} Soulaan Co-op. Building wealth,
              building power, building our future.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
