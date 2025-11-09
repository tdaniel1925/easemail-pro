'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Calculator,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostMetrics {
  totalCosts: number;
  aiCosts: number;
  smsCosts: number;
  storageCosts: number;
  nylasCosts: number;
  totalUsers: number;
  activeAccounts: number;
  costPerUser: number;
}

interface PricingPlan {
  name: string;
  currentPrice: number;
  recommendedPrice: number;
  features: string[];
  estimatedUsers: number;
}

export default function PricingIntelligenceContent() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CostMetrics | null>(null);

  // Calculator state
  const [calcPrice, setCalcPrice] = useState<number>(45);
  const [calcTargetMargin, setCalcTargetMargin] = useState<number>(75);
  const [calcUsers, setCalcUsers] = useState<number>(100);

  useEffect(() => {
    fetchCostMetrics();
  }, []);

  const fetchCostMetrics = async () => {
    try {
      const response = await fetch('/api/admin/cost-center');
      if (!response.ok) throw new Error('Failed to fetch cost metrics');

      const data = await response.json();

      // Calculate cost per user
      const totalCosts =
        (data.aiCosts?.current || 0) +
        (data.smsCosts?.current || 0) +
        (data.storageCosts?.current || 0) +
        (data.nylasCosts?.current || 0);

      const totalUsers = data.totalUsers || 1;
      const costPerUser = totalCosts / totalUsers;

      setMetrics({
        totalCosts,
        aiCosts: data.aiCosts?.current || 0,
        smsCosts: data.smsCosts?.current || 0,
        storageCosts: data.storageCosts?.current || 0,
        nylasCosts: data.nylasCosts?.current || 0,
        totalUsers,
        activeAccounts: data.activeAccounts || 0,
        costPerUser,
      });
    } catch (error) {
      console.error('Failed to load cost metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Pricing plans configuration
  const plans: PricingPlan[] = [
    {
      name: 'Individual',
      currentPrice: 45,
      recommendedPrice: 49,
      features: ['Unlimited emails', 'AI assistant', 'SMS notifications', '10GB storage'],
      estimatedUsers: 60,
    },
    {
      name: 'Team',
      currentPrice: 40.50,
      recommendedPrice: 45,
      features: ['Everything in Individual', 'Team collaboration', 'Shared inbox', '50GB storage'],
      estimatedUsers: 40,
    },
  ];

  // Calculate markup and margins
  const calculateMetrics = (price: number, costPerUser: number) => {
    const markup = costPerUser > 0 ? (price / costPerUser) : 0;
    const margin = price > 0 ? ((price - costPerUser) / price) * 100 : 0;
    const profit = price - costPerUser;
    return { markup, margin, profit };
  };

  // Calculator functions
  const calculateRevenueAtPrice = (price: number, users: number) => {
    const revenue = price * users;
    const costs = (metrics?.costPerUser || 0) * users;
    const profit = revenue - costs;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, costs, profit, margin };
  };

  const calculatePriceForMargin = (targetMargin: number, costPerUser: number) => {
    // margin = (price - cost) / price
    // margin * price = price - cost
    // cost = price - (margin * price)
    // cost = price * (1 - margin)
    // price = cost / (1 - margin)
    const marginDecimal = targetMargin / 100;
    return costPerUser / (1 - marginDecimal);
  };

  const calculateBreakEven = (fixedCosts: number, pricePerUser: number, costPerUser: number) => {
    const profitPerUser = pricePerUser - costPerUser;
    return profitPerUser > 0 ? Math.ceil(fixedCosts / profitPerUser) : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading pricing intelligence...</p>
        </div>
      </div>
    );
  }

  const costPerUser = metrics?.costPerUser || 0;
  const industryStandardMarkup = 4; // 4x markup is healthy for SaaS
  const recommendedMinPrice = costPerUser * industryStandardMarkup;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pricing Intelligence</h1>
          <p className="text-muted-foreground mt-2">
            Optimize your pricing strategy with real cost data and industry insights
          </p>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cost Per User
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-3xl font-bold">${costPerUser.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly average per user
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recommended Min Price
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-3xl font-bold">${recommendedMinPrice.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {industryStandardMarkup}x markup (industry standard)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-3xl font-bold">{metrics?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.activeAccounts || 0} active accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 pt-6 px-6">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Monthly Costs
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-3xl font-bold">${(metrics?.totalCosts || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all services
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList>
            <TabsTrigger value="plans">Plan Analysis</TabsTrigger>
            <TabsTrigger value="calculator">Pricing Calculator</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Plan Analysis Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {plans.map((plan) => {
                const current = calculateMetrics(plan.currentPrice, costPerUser);
                const recommended = calculateMetrics(plan.recommendedPrice, costPerUser);
                const isHealthy = current.markup >= 3; // 3x minimum for healthy SaaS

                return (
                  <Card key={plan.name}>
                    <CardHeader className="pb-3 pt-6 px-6">
                      <div className="flex items-center justify-between">
                        <CardTitle>{plan.name} Plan</CardTitle>
                        {isHealthy ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <CardDescription>
                        {isHealthy ? 'Healthy markup' : 'Consider price increase'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 space-y-4">
                      {/* Current Pricing */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Current Price</span>
                          <span className="text-2xl font-bold">${plan.currentPrice}/mo</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Markup</p>
                            <p className="font-semibold">{current.markup.toFixed(1)}x</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Margin</p>
                            <p className="font-semibold">{current.margin.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Profit</p>
                            <p className="font-semibold">${current.profit.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Recommended Pricing */}
                      {plan.recommendedPrice !== plan.currentPrice && (
                        <>
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-600">Recommended Price</span>
                              <span className="text-2xl font-bold text-green-600">${plan.recommendedPrice}/mo</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Markup</p>
                                <p className="font-semibold text-green-600">{recommended.markup.toFixed(1)}x</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Margin</p>
                                <p className="font-semibold text-green-600">{recommended.margin.toFixed(1)}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Profit</p>
                                <p className="font-semibold text-green-600">${recommended.profit.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Impact Analysis */}
                          <div className="bg-muted/50 p-4 rounded-lg">
                            <p className="text-sm font-medium mb-2">Impact if changed:</p>
                            <div className="flex items-center gap-2 text-sm">
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                              <span>
                                +${((plan.recommendedPrice - plan.currentPrice) * plan.estimatedUsers).toFixed(0)}/mo
                              </span>
                              <span className="text-muted-foreground">
                                ({plan.estimatedUsers} users)
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader className="pb-3 pt-6 px-6">
                <CardTitle>Cost Breakdown Per User</CardTitle>
                <CardDescription>Understanding where your costs come from</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">AI Costs</p>
                    <p className="text-2xl font-bold">${((metrics?.aiCosts || 0) / (metrics?.totalUsers || 1)).toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">SMS Costs</p>
                    <p className="text-2xl font-bold">${((metrics?.smsCosts || 0) / (metrics?.totalUsers || 1)).toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Storage</p>
                    <p className="text-2xl font-bold">${((metrics?.storageCosts || 0) / (metrics?.totalUsers || 1)).toFixed(2)}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Email Sync</p>
                    <p className="text-2xl font-bold">${((metrics?.nylasCosts || 0) / (metrics?.totalUsers || 1)).toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scenario 1: Revenue at Price Point */}
              <Card>
                <CardHeader className="pb-3 pt-6 px-6">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    <CardTitle>Revenue Scenario</CardTitle>
                  </div>
                  <CardDescription>What if I charge $X per month?</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calc-price">Price per user</Label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="calc-price"
                          type="number"
                          value={calcPrice}
                          onChange={(e) => setCalcPrice(Number(e.target.value))}
                          className="pl-7"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="calc-users">Number of users</Label>
                      <Input
                        id="calc-users"
                        type="number"
                        value={calcUsers}
                        onChange={(e) => setCalcUsers(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    {(() => {
                      const scenario = calculateRevenueAtPrice(calcPrice, calcUsers);
                      const markup = costPerUser > 0 ? calcPrice / costPerUser : 0;
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Monthly Revenue</span>
                            <span className="text-xl font-bold text-green-600">
                              ${scenario.revenue.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Total Costs</span>
                            <span className="text-xl font-bold text-red-600">
                              -${scenario.costs.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t">
                            <span className="font-semibold">Net Profit</span>
                            <span className={cn(
                              "text-2xl font-bold",
                              scenario.profit > 0 ? "text-green-600" : "text-red-600"
                            )}>
                              ${scenario.profit.toFixed(2)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t text-sm">
                            <div>
                              <p className="text-muted-foreground">Profit Margin</p>
                              <p className="text-lg font-semibold">{scenario.margin.toFixed(1)}%</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Markup</p>
                              <p className="text-lg font-semibold">{markup.toFixed(1)}x</p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Scenario 2: Price for Target Margin */}
              <Card>
                <CardHeader className="pb-3 pt-6 px-6">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle>Target Margin</CardTitle>
                  </div>
                  <CardDescription>What price gives me X% margin?</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6 space-y-4">
                  <div>
                    <Label htmlFor="calc-margin">Target profit margin (%)</Label>
                    <Input
                      id="calc-margin"
                      type="number"
                      value={calcTargetMargin}
                      onChange={(e) => setCalcTargetMargin(Number(e.target.value))}
                      className="mt-1"
                      min="0"
                      max="95"
                    />
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    {(() => {
                      const requiredPrice = calculatePriceForMargin(calcTargetMargin, costPerUser);
                      const markup = costPerUser > 0 ? requiredPrice / costPerUser : 0;
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Cost per user</span>
                            <span className="font-semibold">${costPerUser.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Target margin</span>
                            <span className="font-semibold">{calcTargetMargin}%</span>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t">
                            <span className="font-semibold">Required Price</span>
                            <span className="text-2xl font-bold text-primary">
                              ${requiredPrice.toFixed(2)}/mo
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t text-sm">
                            <div>
                              <p className="text-muted-foreground">Markup</p>
                              <p className="text-lg font-semibold">{markup.toFixed(1)}x</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Profit per user</p>
                              <p className="text-lg font-semibold">${(requiredPrice - costPerUser).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded-lg text-sm">
                            <p className="text-muted-foreground">
                              To achieve a {calcTargetMargin}% profit margin, you need to charge at least{' '}
                              <span className="font-semibold">${requiredPrice.toFixed(2)}/mo</span> per user.
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Scenario 3: Break-even Analysis */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3 pt-6 px-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle>Break-even Analysis</CardTitle>
                  </div>
                  <CardDescription>How many users do I need to cover fixed costs?</CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { price: 45, label: 'Individual Plan ($45/mo)' },
                      { price: 40.50, label: 'Team Plan ($40.50/mo)' },
                      { price: recommendedMinPrice, label: `Recommended (${industryStandardMarkup}x markup)` },
                    ].map((scenario) => {
                      const fixedCosts = 1000; // Estimate: server, domain, etc.
                      const breakeven = calculateBreakEven(fixedCosts, scenario.price, costPerUser);
                      const profitPerUser = scenario.price - costPerUser;

                      return (
                        <div key={scenario.label} className="bg-muted/50 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-3">{scenario.label}</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Profit per user</span>
                              <span className="font-semibold">${profitPerUser.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Fixed costs</span>
                              <span className="font-semibold">${fixedCosts}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="font-semibold">Break-even users</span>
                              <span className="text-lg font-bold text-primary">{breakeven}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader className="pb-3 pt-6 px-6">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Pricing Recommendations</CardTitle>
                </div>
                <CardDescription>Data-driven suggestions to optimize your pricing</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                {/* Recommendation 1: Individual Plan */}
                {plans[0].currentPrice < plans[0].recommendedPrice && (
                  <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                          Increase Individual Plan to ${plans[0].recommendedPrice}/mo
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                          Your current ${plans[0].currentPrice} pricing gives only a{' '}
                          {calculateMetrics(plans[0].currentPrice, costPerUser).markup.toFixed(1)}x markup.
                          Industry standard for healthy SaaS is {industryStandardMarkup}x.
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              +${((plans[0].recommendedPrice - plans[0].currentPrice) * plans[0].estimatedUsers).toFixed(0)}/mo additional revenue
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {calculateMetrics(plans[0].recommendedPrice, costPerUser).margin.toFixed(1)}% margin
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendation 2: Team Plan */}
                {plans[1].currentPrice < plans[1].recommendedPrice && (
                  <div className="p-4 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                          Increase Team Plan to ${plans[1].recommendedPrice}/mo
                        </p>
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                          Team plans should provide premium value. At ${plans[1].currentPrice}, your markup is only{' '}
                          {calculateMetrics(plans[1].currentPrice, costPerUser).markup.toFixed(1)}x.
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span className="font-medium">
                              +${((plans[1].recommendedPrice - plans[1].currentPrice) * plans[1].estimatedUsers).toFixed(0)}/mo additional revenue
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {calculateMetrics(plans[1].recommendedPrice, costPerUser).margin.toFixed(1)}% margin
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendation 3: Cost Optimization */}
                <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <TrendingDown className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Optimize AI Usage Costs
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                        AI costs are ${((metrics?.aiCosts || 0) / (metrics?.totalUsers || 1)).toFixed(2)} per user.
                        Consider implementing rate limiting or caching to reduce costs.
                      </p>
                      <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                        <li>Cache email summaries (already implemented)</li>
                        <li>Limit AI assistant queries per user per day</li>
                        <li>Use GPT-3.5 instead of GPT-4 where possible</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Recommendation 4: Value-based Pricing */}
                <div className="p-4 border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                        Consider Value-Based Features
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                        Add premium features to justify higher pricing:
                      </p>
                      <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
                        <li>Advanced AI features (sentiment analysis, priority detection)</li>
                        <li>Custom email templates and automation rules</li>
                        <li>Priority support and onboarding</li>
                        <li>Advanced analytics and reporting</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Industry Benchmarks */}
                <div className="p-4 border rounded-lg">
                  <p className="font-semibold mb-3">Industry Benchmarks for SaaS Pricing</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Healthy Markup</p>
                      <p className="text-lg font-bold">3-5x</p>
                      <p className="text-xs text-muted-foreground">On variable costs</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Target Margin</p>
                      <p className="text-lg font-bold">70-80%</p>
                      <p className="text-xs text-muted-foreground">Gross profit margin</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Competitive Range</p>
                      <p className="text-lg font-bold">$40-60/mo</p>
                      <p className="text-xs text-muted-foreground">For email + AI tools</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
