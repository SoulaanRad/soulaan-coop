"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Home, ShoppingCart, Building, Hammer, DollarSign, Users, Store } from "lucide-react"

interface ConsumerInputs {
  monthlyRent: number
  monthlySpending: number
  workHours: number
}

interface BusinessInputs {
  businessTransactions: number
  rentalUnits: number
}

interface SCEarnings {
  consumer: {
    fromRent: number
    fromShopping: number
    fromWork: number
    total: number
  }
  business: {
    fromTransactions: number
    fromRental: number
    total: number
  }
  grandTotal: number
}

interface YieldProjections {
  year1: number
  year3: number
  year5: number
  year10: number
}

export function WealthCalculator() {
  const [consumerInputs, setConsumerInputs] = useState<ConsumerInputs>({
    monthlyRent: 1200,
    monthlySpending: 500,
    workHours: 0,
  })

  const [businessInputs, setBusinessInputs] = useState<BusinessInputs>({
    businessTransactions: 0,
    rentalUnits: 0,
  })

  const [scEarnings, setSCEarnings] = useState<SCEarnings>({
    consumer: {
      fromRent: 0,
      fromShopping: 0,
      fromWork: 0,
      total: 0,
    },
    business: {
      fromTransactions: 0,
      fromRental: 0,
      total: 0,
    },
    grandTotal: 0,
  })

  const [yieldProjections, setYieldProjections] = useState<YieldProjections>({
    year1: 0,
    year3: 0,
    year5: 0,
    year10: 0,
  })

  const calculateSCEarnings = () => {
    // Consumer SC earning rates
    const rentSC = consumerInputs.monthlyRent > 0 ? 10 : 0
    const shoppingSC = (consumerInputs.monthlySpending / 100) * 6
    const workSC = (consumerInputs.workHours / 40) * 15

    const consumerTotal = rentSC + shoppingSC + workSC

    // Business SC earning rates
    const businessSC = businessInputs.businessTransactions * 2
    const rentalSC = businessInputs.rentalUnits * 5

    const businessTotal = businessSC + rentalSC

    // Apply annual cap of 1000 SC (83.33/month)
    const grandTotal = Math.min(consumerTotal + businessTotal, 83.33)

    setSCEarnings({
      consumer: {
        fromRent: rentSC,
        fromShopping: shoppingSC,
        fromWork: workSC,
        total: consumerTotal,
      },
      business: {
        fromTransactions: businessSC,
        fromRental: rentalSC,
        total: businessTotal,
      },
      grandTotal,
    })

    // Calculate yield projections
    const annualSC = grandTotal * 12
    const yieldRate = 1.5

    setYieldProjections({
      year1: annualSC * yieldRate,
      year3: annualSC * 3 * yieldRate * 0.8,
      year5: annualSC * 5 * yieldRate * 0.7,
      year10: Math.min(1000 * 10, annualSC * 10) * yieldRate * 0.6,
    })
  }

  useEffect(() => {
    calculateSCEarnings()
  }, [consumerInputs, businessInputs])

  const updateConsumerInput = (key: keyof ConsumerInputs, value: number[]) => {
    setConsumerInputs((prev) => ({ ...prev, [key]: value[0] }))
  }

  const updateBusinessInput = (key: keyof BusinessInputs, value: number[]) => {
    setBusinessInputs((prev) => ({ ...prev, [key]: value[0] }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatSC = (amount: number) => {
    return Math.round(amount * 10) / 10
  }

  const getTotalCommunityContribution = () => {
    return consumerInputs.monthlyRent * 0.03 + consumerInputs.monthlySpending * 0.02
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl md:text-3xl text-white mb-2">Wealth Building Calculator</CardTitle>
          <p className="text-slate-300 text-sm md:text-base">See how your participation builds wealth over time</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="calculator" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="calculator" className="text-white data-[state=active]:bg-blue-600 text-sm">
                Calculator
              </TabsTrigger>
              <TabsTrigger value="projections" className="text-white data-[state=active]:bg-blue-600 text-sm">
                Projections
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calculator" className="space-y-6">
              {/* Participation Type Tabs */}
              <Tabs defaultValue="consumer" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                  <TabsTrigger value="consumer" className="text-white data-[state=active]:bg-green-600 text-sm">
                    <Users className="w-4 h-4 mr-2" />
                    Consumer
                  </TabsTrigger>
                  <TabsTrigger value="business" className="text-white data-[state=active]:bg-purple-600 text-sm">
                    <Store className="w-4 h-4 mr-2" />
                    Business
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="consumer" className="space-y-6 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-white mb-2">Consumer Participation</h3>
                    <p className="text-sm text-slate-400">Earn SC by participating as a consumer, renter, or worker</p>
                  </div>

                  <div className="space-y-6">
                    {/* Rent */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Home className="w-5 h-5 text-green-400" />
                          <Label className="text-white text-sm">Monthly Rent</Label>
                        </div>
                        <Badge className="bg-green-600">{formatCurrency(consumerInputs.monthlyRent)}</Badge>
                      </div>
                      <Slider
                        value={[consumerInputs.monthlyRent]}
                        onValueChange={(value) => updateConsumerInput("monthlyRent", value)}
                        max={3000}
                        min={0}
                        step={100}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-400">Pay rent in Unity Coin → Earn 10 SC/month</p>
                    </div>

                    {/* Shopping */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-5 h-5 text-blue-400" />
                          <Label className="text-white text-sm">Monthly Spending</Label>
                        </div>
                        <Badge className="bg-blue-600">{formatCurrency(consumerInputs.monthlySpending)}</Badge>
                      </div>
                      <Slider
                        value={[consumerInputs.monthlySpending]}
                        onValueChange={(value) => updateConsumerInput("monthlySpending", value)}
                        max={2000}
                        min={0}
                        step={50}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-400">Shop at community businesses → Earn 6 SC per 100 UC</p>
                    </div>

                    {/* Work Hours */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Hammer className="w-5 h-5 text-orange-400" />
                          <Label className="text-white text-sm">Work Hours/Month</Label>
                        </div>
                        <Badge className="bg-orange-600">{consumerInputs.workHours}h</Badge>
                      </div>
                      <Slider
                        value={[consumerInputs.workHours]}
                        onValueChange={(value) => updateConsumerInput("workHours", value)}
                        max={160}
                        min={0}
                        step={10}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-400">Work on DAO projects → Earn 15 SC per 40 hours</p>
                    </div>
                  </div>

                  {/* Consumer Results */}
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-400" />
                        Your Consumer Earnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {scEarnings.consumer.fromRent > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Rent Payments</span>
                          <Badge className="bg-green-600">{formatSC(scEarnings.consumer.fromRent)} SC</Badge>
                        </div>
                      )}
                      {scEarnings.consumer.fromShopping > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Shopping</span>
                          <Badge className="bg-blue-600">{formatSC(scEarnings.consumer.fromShopping)} SC</Badge>
                        </div>
                      )}
                      {scEarnings.consumer.fromWork > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Community Work</span>
                          <Badge className="bg-orange-600">{formatSC(scEarnings.consumer.fromWork)} SC</Badge>
                        </div>
                      )}
                      <div className="border-t border-slate-600 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">Monthly Total</span>
                          <Badge className="bg-gradient-to-r from-green-600 to-blue-600 text-lg px-3 py-1">
                            {formatSC(scEarnings.consumer.total)} SC
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="business" className="space-y-6 mt-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-white mb-2">Business Participation</h3>
                    <p className="text-sm text-slate-400">
                      Earn SC by providing services as a business owner or landlord
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Business Transactions */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="w-5 h-5 text-purple-400" />
                          <Label className="text-white text-sm">Transactions/Month</Label>
                        </div>
                        <Badge className="bg-purple-600">{businessInputs.businessTransactions}</Badge>
                      </div>
                      <Slider
                        value={[businessInputs.businessTransactions]}
                        onValueChange={(value) => updateBusinessInput("businessTransactions", value)}
                        max={500}
                        min={0}
                        step={10}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-400">Accept UC at your business → Earn 2 SC per transaction</p>
                    </div>

                    {/* Rental Units */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Home className="w-5 h-5 text-yellow-400" />
                          <Label className="text-white text-sm">Rental Units</Label>
                        </div>
                        <Badge className="bg-yellow-600">{businessInputs.rentalUnits}</Badge>
                      </div>
                      <Slider
                        value={[businessInputs.rentalUnits]}
                        onValueChange={(value) => updateBusinessInput("rentalUnits", value)}
                        max={10}
                        min={0}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-400">Collect rent in UC → Earn 5 SC per unit/month</p>
                    </div>
                  </div>

                  {/* Business Results */}
                  <Card className="bg-slate-700 border-slate-600">
                    <CardHeader>
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <Store className="w-5 h-5 text-purple-400" />
                        Your Business Earnings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {scEarnings.business.fromTransactions > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Business Sales</span>
                          <Badge className="bg-purple-600">{formatSC(scEarnings.business.fromTransactions)} SC</Badge>
                        </div>
                      )}
                      {scEarnings.business.fromRental > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 text-sm">Rental Income</span>
                          <Badge className="bg-yellow-600">{formatSC(scEarnings.business.fromRental)} SC</Badge>
                        </div>
                      )}
                      <div className="border-t border-slate-600 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">Monthly Total</span>
                          <Badge className="bg-gradient-to-r from-purple-600 to-yellow-600 text-lg px-3 py-1">
                            {formatSC(scEarnings.business.total)} SC
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Combined Results */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Total Impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-xl md:text-2xl font-bold text-green-400">
                        {formatSC(scEarnings.grandTotal)}
                      </div>
                      <div className="text-xs text-slate-300">SC/Month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl md:text-2xl font-bold text-blue-400">
                        {formatCurrency(yieldProjections.year1)}
                      </div>
                      <div className="text-xs text-slate-300">Annual Yield</div>
                    </div>
                  </div>
                  {scEarnings.grandTotal >= 83.33 && (
                    <div className="text-center">
                      <Badge className="bg-yellow-600 text-xs">Maximum SC Cap Reached (1,000/year)</Badge>
                    </div>
                  )}
                  <div className="text-center pt-2">
                    <div className="text-sm text-slate-300">Community Contribution</div>
                    <div className="text-green-400 font-semibold">
                      {formatCurrency(getTotalCommunityContribution() * 12)}/year
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projections" className="space-y-6">
              {/* Wealth Growth */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Wealth Growth Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-slate-600 rounded">
                      <span className="text-white text-sm">Year 1</span>
                      <span className="text-green-400 font-bold text-sm">{formatCurrency(yieldProjections.year1)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-600 rounded">
                      <span className="text-white text-sm">Year 3</span>
                      <span className="text-green-400 font-bold text-sm">{formatCurrency(yieldProjections.year3)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-600 rounded">
                      <span className="text-white text-sm">Year 5</span>
                      <span className="text-green-400 font-bold text-sm">{formatCurrency(yieldProjections.year5)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-600 to-green-600 rounded">
                      <span className="text-white font-bold text-sm">Year 10</span>
                      <span className="text-white font-bold text-sm">{formatCurrency(yieldProjections.year10)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Long-term Benefits */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-yellow-400" />
                    Long-term Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-slate-600 rounded">
                    <div className="font-semibold text-white text-sm">Years 3-5: Housing Access</div>
                    <div className="text-xs text-slate-300">Convert SC into housing equity or co-op shares</div>
                  </div>
                  <div className="p-3 bg-slate-600 rounded">
                    <div className="font-semibold text-white text-sm">Years 5+: Legacy Building</div>
                    <div className="text-xs text-slate-300">Children's trust accounts and educational grants</div>
                  </div>
                  <div className="p-3 bg-slate-600 rounded">
                    <div className="font-semibold text-white text-sm">Years 10+: Community Ownership</div>
                    <div className="text-xs text-slate-300">Governance shares in DAO infrastructure</div>
                  </div>
                </CardContent>
              </Card>

              {/* Example Scenarios */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Example Scenarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center p-3 bg-slate-600 rounded">
                      <h4 className="font-bold text-white mb-1 text-sm flex items-center justify-center gap-2">
                        <Users className="w-4 h-4 text-green-400" />
                        Consumer Focus
                      </h4>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>$800 rent + $300 shopping</div>
                        <div className="text-green-400 font-semibold">28 SC/month</div>
                        <div className="text-blue-400">$504/year yield</div>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-slate-600 rounded">
                      <h4 className="font-bold text-white mb-1 text-sm flex items-center justify-center gap-2">
                        <Store className="w-4 h-4 text-purple-400" />
                        Business Focus
                      </h4>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>100 transactions + 2 rental units</div>
                        <div className="text-purple-400 font-semibold">210 SC/month</div>
                        <div className="text-blue-400">$1,000/year yield (capped)</div>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-slate-600 rounded">
                      <h4 className="font-bold text-white mb-1 text-sm">Mixed Participation</h4>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>Rent + shopping + small business</div>
                        <div className="text-yellow-400 font-semibold">83 SC/month</div>
                        <div className="text-blue-400">$1,494/year yield</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
