import Link from "next/link"
import Image from "next/image"
import { CommunityIcon } from "@/components/icons/community-icon"
import { GovernanceIcon } from "@/components/icons/governance-icon"
import { UnityIcon } from "@/components/icons/unity-icon"
import { PaymentIcon } from "@/components/icons/payment-icon"
import { UCIcon } from "@/components/icons/uc-icon"
import { SCIcon } from "@/components/icons/sc-icon"
import { CommunityInvestmentIcon } from "@/components/icons/community-investment-icon"
import { VoiceIcon } from "@/components/icons/voice-icon"
import { WaitlistForm } from "@/components/waitlist-form"
import { BusinessSignupForm } from "@/components/business-signup-form"
import type { Metadata } from "next"

// Page-specific metadata
export const metadata: Metadata = {
  title: "Soulaan Co-op | Building Generational Wealth Through Economic Cooperation",
  description:
    "Join the Soulaan Co-op and transform everyday spending into community wealth. Use Unity Coin (UC) and SoulaaniCoin (SC) to keep money circulating in Black communities while earning rewards and voting power.",
  alternates: {
    canonical: "https://soulaan.coop",
  },
}

export default function SoulaanLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-8 relative">
              <Image
                src="/images/soulaan-flag.jpg"
                alt="Soulaan Co-op Flag - Building Community Wealth"
                fill
                className="object-cover rounded-md"
                priority
              />
            </div>
            <span className="text-xl font-bold text-white">Soulaan Co-op</span>
          </div>
          <nav className="hidden md:flex items-center space-x-6" role="navigation" aria-label="Main navigation">
            <Link href="#about" className="text-slate-300 hover:text-blue-400 transition-colors">
              About Us
            </Link>
            <Link href="#how-it-works" className="text-slate-300 hover:text-blue-400 transition-colors">
              How It Works
            </Link>
            <Link href="#status" className="text-slate-300 hover:text-blue-400 transition-colors">
              Our Progress
            </Link>
            <Link href="#contact" className="text-slate-300 hover:text-blue-400 transition-colors">
              Get Involved
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Building Generational Wealth for Our Community
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
                {" "}
                Through Economic Cooperation
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Welcome to the Soulaan Co-op—where every rent payment, every shopping trip, and every dollar you spend in
              the neighborhood creates investment in your community. We're making our community money work harder for
              us, not just for somebody else.
            </p>
            <div className="space-y-6">
              <WaitlistForm source="hero" variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 bg-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">About Soulaan Co-op</h2>
            <p className="text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Soulaan Co-op is all about making your money do double-duty: support your people, and build real wealth
              for the culture. Every time you spend at a participating Black business, you get rewards—and those rewards
              give you a say in what we build next. The more you use it, the more the community wins.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">We use two digital dollars:</h3>

              <div className="space-y-6">
                <div className="flex items-start space-x-4 p-4 bg-slate-700 rounded-lg">
                  <UCIcon className="w-8 h-8 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white text-lg mb-2">Unity Coin (UC)</h4>
                    <p className="text-slate-300">
                      Our stable, digital money for shopping, paying rent, or getting paid at work. Use it just like
                      cash, Venmo, or Cash App.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4 p-4 bg-slate-700 rounded-lg">
                  <SCIcon className="w-8 h-8 text-blue-400 mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-white text-lg mb-2">SoulaaniCoin (SC)</h4>
                    <p className="text-slate-300">
                      Your "receipt" for spending, earning, or paying rent with UC. Gives you a say (and a stake) in
                      what the community does next.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-blue-500 transition-colors rounded-lg">
                <CommunityIcon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h4 className="font-bold text-white">Keep Money</h4>
                <p className="text-sm text-slate-300">In the Community's Hands</p>
              </div>
              <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-green-500 transition-colors rounded-lg">
                <CommunityInvestmentIcon className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h4 className="font-bold text-white">Invest in Your</h4>
                <p className="text-sm text-slate-300">Community Easily</p>
              </div>
              <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-blue-500 transition-colors rounded-lg">
                <GovernanceIcon className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <h4 className="font-bold text-white">Get Your</h4>
                <p className="text-sm text-slate-300">Voice Heard</p>
              </div>
              <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-green-500 transition-colors rounded-lg">
                <UnityIcon className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h4 className="font-bold text-white">Build</h4>
                <p className="text-sm text-slate-300">Together</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works: For Businesses & Everyday People
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 mb-16">
            {/* For Businesses */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden p-8">
              <div className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <PaymentIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white text-2xl font-semibold">For Businesses</h3>
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
                    className="w-5 h-5 text-green-400 mt-1 flex-shrink-0"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">Accept Unity Coin just like cash, Venmo, or Cash App</p>
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
                    className="w-5 h-5 text-green-400 mt-1 flex-shrink-0"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Every sale earns you bonus rewards and puts you in the room when big decisions are made
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
                    className="w-5 h-5 text-green-400 mt-1 flex-shrink-0"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Attract loyal customers who want to keep their dollars circulating in the culture
                  </p>
                </div>
              </div>
            </div>

            {/* For Everyday People */}
            <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden p-8">
              <div className="text-center pb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CommunityIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-white text-2xl font-semibold">For Everyday People</h3>
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
                    className="w-5 h-5 text-green-400 mt-1 flex-shrink-0"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">Shop at Black-owned stores or pay your rent with Unity Coin</p>
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
                    className="w-5 h-5 text-green-400 mt-1 flex-shrink-0"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Earn SoulaaniCoin every time you spend or pay your bills—like racking up points, but with voting
                    power
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
                    className="w-5 h-5 text-green-400 mt-1 flex-shrink-0"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p className="text-slate-300">
                    Use your coins to vote on what gets built or funded next: new businesses, housing, community
                    projects
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Partnership Section */}
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Partner With Us?</h3>
              <p className="text-lg text-slate-300">
                Get listed, get new customers, and earn extra rewards every time folks pay with Unity Coin. Plus, you
                get a seat at the table to help shape the future of the Black economy.
              </p>
            </div>
            <BusinessSignupForm />
          </div>
        </div>
      </section>

      {/* Why Join Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Why Join?</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              No banks shutting you out, no red tape, no empty promises. Just a new way to build, spend, and win
              together.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-blue-500 transition-colors rounded-lg">
              <CommunityInvestmentIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h4 className="font-bold text-white mb-2">Keep More Money</h4>
              <p className="text-sm text-slate-300">in the community's hands</p>
            </div>
            <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-green-500 transition-colors rounded-lg">
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
                className="w-12 h-12 text-blue-400 mx-auto mb-4"
              >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <h4 className="font-bold text-white mb-2">Earn Extra Rewards</h4>
              <p className="text-sm text-slate-300">for supporting your own</p>
            </div>
            <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-blue-500 transition-colors rounded-lg">
              <VoiceIcon className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h4 className="font-bold text-white mb-2">Get a Say</h4>
              <p className="text-sm text-slate-300">in how community money gets used</p>
            </div>
            <div className="text-center p-6 bg-slate-700 border border-slate-600 hover:border-green-500 transition-colors rounded-lg">
              <UnityIcon className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h4 className="font-bold text-white mb-2">Build Real Ownership</h4>
              <p className="text-sm text-slate-300">and legacy for your family</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Status Table */}
      <section id="status" className="py-20 px-4 bg-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What We're Building</h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Check out our progress—we're building this step by step, and everything is open source so you can see
              exactly how we're doing it.
            </p>
          </div>

          <div className="overflow-hidden bg-slate-700 border border-slate-600 rounded-lg">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-600">
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Service Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      What it Does
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                      Open Source?
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-600">
                  <tr className="hover:bg-slate-600 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">UC Wallet</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">Hold and spend Unity Coin</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-600 text-white">
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
                          className="w-3 h-3 mr-1"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Planned
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-600 text-white">
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
                          className="w-3 h-3 mr-1"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Yes
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-600 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">SC Governance Portal</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      Vote, earn, and get rewards with SoulaaniCoin
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-600 text-white">
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
                          className="w-3 h-3 mr-1"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Planned
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-600 text-white">
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
                          className="w-3 h-3 mr-1"
                        >
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        Yes
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-600 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-white">Merchant POS</td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">Accept Unity Coin at your business</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-600 text-white">
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
                          className="w-3 h-3 mr-1"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Planned
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-600 text-white">
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
                          className="w-3 h-3 mr-1"
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
      <section id="contact" className="py-20 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Email Signup */}
            <div>
              <h2 className="text-3xl font-bold mb-4 text-white">Get Involved</h2>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Drop your email below to stay in the loop—be the first to know about launch dates, community events, and
                new features.
              </p>
              <WaitlistForm source="contact" variant="card" />
            </div>

            {/* GitHub Link */}
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold mb-4 text-white">Check Out Our Progress</h2>
              <p className="text-slate-300 mb-6 leading-relaxed">
                Curious or want to help build? Check the code, pitch ideas, or follow along on GitHub.
              </p>
              <Link href="https://github.com/soulaan-coop" target="_blank" className="inline-flex items-center">
                <button className="px-6 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 text-white font-medium rounded-md flex items-center">
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
                    className="w-5 h-5 mr-2"
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
                    className="w-4 h-4 ml-2"
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
      <footer className="bg-black text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-10 h-8 relative">
                  <Image
                    src="/images/soulaan-flag.jpg"
                    alt="Soulaan Co-op Flag"
                    fill
                    className="object-cover rounded-md"
                  />
                </div>
                <span className="text-xl font-bold">Soulaan Co-op</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                Building generational wealth for our community through economic cooperation. Keeping money moving
                between us—turning everyday business into ownership, voting power, and real community wealth.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="#about" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </Link>
                </li>

                <li>
                  <Link href="#status" className="hover:text-white transition-colors">
                    Our Progress
                  </Link>
                </li>
                <li>
                  <Link href="#contact" className="hover:text-white transition-colors">
                    Get Involved
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Connect With Us</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Discord
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Twitter
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    LinkedIn
                  </Link>
                </li>
                <li>
                  <Link href="https://github.com/soulaan-coop" className="hover:text-white transition-colors">
                    GitHub
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} Soulaan Co-op. Building wealth, building power, building our future.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
