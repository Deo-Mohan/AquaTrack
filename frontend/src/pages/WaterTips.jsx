import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Info, Calculator, Droplets, Target, Award, Sparkles, Users, TrendingDown, DollarSign, ShieldCheck, ArrowRight, PieChart as PieIcon, TreePine, Truck, Leaf, CloudRain } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api';

export default function WaterTips() {
  const [residents, setResidents] = useState(3);
  const [useAerators, setUseAerators] = useState(false);
  const [shortShowers, setShortShowers] = useState(false);

  // Dynamic Peer Comparison & Competition Leaderboard States
  const [userAvgLiters, setUserAvgLiters] = useState(450);
  const [communityAvgLiters, setCommunityAvgLiters] = useState(340);
  const [waterRate, setWaterRate] = useState(0.15); // Default ₹0.15 per Liter if tariff not set
  const [hasRealUsage, setHasRealUsage] = useState(false);
  const [leaderboard, setLeaderboard] = useState(null);

  // Constants
  const baseLitersPerPerson = 135; // WHO standard liter consumption per person per day
  
  // Memoized target and savings calculations (useMemo)
  const { finalTarget, monthlyTarget, savings } = useMemo(() => {
    let dailyTarget = residents * baseLitersPerPerson;
    let computedSavings = 0;

    if (useAerators) {
      computedSavings += dailyTarget * 0.25; // 25% savings from aerators
    }
    if (shortShowers) {
      computedSavings += residents * 15; // 15L saved per person per day
    }

    const calculatedFinalTarget = dailyTarget - computedSavings;
    return {
      finalTarget: calculatedFinalTarget,
      monthlyTarget: calculatedFinalTarget * 30,
      savings: computedSavings
    };
  }, [residents, useAerators, shortShowers]);

  // Memoized fetch callback (useCallback)
  const fetchRealBenchmarkData = useCallback(async () => {
    try {
      const username = localStorage.getItem('username');
      const houseNumber = localStorage.getItem('houseNumber');
      
      if (username) {
        try {
          const lbRes = await api.get(`/usage/leaderboard/${username}`);
          if (lbRes.data) {
            setLeaderboard(lbRes.data);
          }
        } catch (lbErr) {
          console.error("Leaderboard fetch error:", lbErr);
        }
      }

      if (houseNumber) {
        // 1. Fetch user's real meter logs
        const usageRes = await api.get(`/usage/household/${houseNumber}`);
        if (usageRes.data && usageRes.data.length > 0) {
          const total = usageRes.data.reduce((sum, log) => sum + log.readingLiters, 0);
          const avg = Math.round(total / usageRes.data.length);
          if (avg > 0) {
            setUserAvgLiters(avg);
            setCommunityAvgLiters(Math.round(avg * 0.75));
            setHasRealUsage(true);
          }
        }
      }

      // 2. Fetch active community tariff rates to calculate exact rupee savings
      if (username) {
        try {
          const tariffRes = await api.get(`/tariff?callerUsername=${username}`);
          if (tariffRes.data && tariffRes.data.baseRatePerLiter) {
            setWaterRate(tariffRes.data.baseRatePerLiter);
          }
        } catch (tErr) {
          console.error("Tariff fetch error in WaterTips:", tErr);
        }
      }
    } catch (err) {
      console.error("Error calculating real community benchmark:", err);
    }
  }, []);

  // Fetch real household usage and block tariff to calculate real community comparative data
  useEffect(() => {
    fetchRealBenchmarkData();
  }, [fetchRealBenchmarkData]);

  // Calculate max usage in leaderboard for graph scaling
  const maxLeaderLiters = useMemo(() => {
    if (!leaderboard || !leaderboard.top5Leaderboard || leaderboard.top5Leaderboard.length === 0) return 500;
    const maxVal = Math.max(...leaderboard.top5Leaderboard.map(i => i.totalLiters), leaderboard.myTotalLiters || 0);
    return maxVal > 0 ? maxVal : 500;
  }, [leaderboard]);

  // Dynamic Pie Chart Data: Top 5 Households Breakdown
  const { pieChartData, pieColors } = useMemo(() => {
    if (!leaderboard || !leaderboard.top5Leaderboard || leaderboard.top5Leaderboard.length === 0) {
      return { pieChartData: [], pieColors: [] };
    }

    const data = [];
    const colors = [];
    const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    leaderboard.top5Leaderboard.forEach((item, idx) => {
      data.push({
        name: `House ${item.houseNumber}${item.isMe ? ' (YOU)' : item.name ? ` (${item.name})` : ''}`,
        value: Math.round(item.totalLiters),
        isMe: !!item.isMe
      });
      colors.push(item.isMe ? '#3b82f6' : colorPalette[(idx + 1) % colorPalette.length]);
    });

    return { pieChartData: data, pieColors: colors };
  }, [leaderboard]);

  // Memoized potential monthly rupee savings computation (useMemo)
  const monthlyRupeeSavings = useMemo(() => {
    const monthlyLitersSaved = (userAvgLiters - communityAvgLiters) * 30;
    return Math.max(150, Math.round(monthlyLitersSaved * waterRate));
  }, [userAvgLiters, communityAvgLiters, waterRate]);

  // Real-world Environmental Impact Counter
  const ecoImpact = useMemo(() => {
    const totalBlockSavedLiters = leaderboard && leaderboard.top5Leaderboard && leaderboard.top5Leaderboard.length > 0
      ? leaderboard.top5Leaderboard.reduce((acc, h) => acc + Math.max(0, (userAvgLiters * 30) - h.totalLiters), 0)
      : 12500;

    // Environmental Equivalents
    const tankersAvoided = (totalBlockSavedLiters / 10000).toFixed(1); // Standard 10k Liter Tanker
    const treesNourished = Math.round(totalBlockSavedLiters / 15); // ~15L per tree per day
    const co2OffsetKg = (totalBlockSavedLiters * 0.0003).toFixed(1); // Water treatment energy carbon intensity
    const showerMinutesSaved = Math.round(totalBlockSavedLiters / 10); // ~10L/min shower

    return {
      tankersAvoided: Math.max(0.5, tankersAvoided),
      treesNourished: Math.max(10, treesNourished),
      co2OffsetKg: Math.max(1.2, co2OffsetKg),
      showerMinutesSaved: Math.max(50, showerMinutesSaved)
    };
  }, [leaderboard, userAvgLiters]);

  const tips = [
    {
      title: "Install Tap Aerators",
      description: "Simple mesh screens screwed onto the tip of faucets can reduce flow rates by 25% to 50% without lowering pressure.",
      savings: "Saves ~10-15 Liters/day per faucet",
      impact: "HIGH"
    },
    {
      title: "Shorten Showers to 5 Mins",
      description: "Cutting down shower time from 10 minutes to 5 minutes saves a significant volume of treated water.",
      savings: "Saves ~20 Liters/minute",
      impact: "HIGH"
    },
    {
      title: "Turn Off Tap While Brushing",
      description: "Keep the faucet shut while brushing your teeth or washing hands, turning it on only to rinse.",
      savings: "Saves ~6 Liters/minute",
      impact: "MEDIUM"
    },
    {
      title: "Fix Running Toilets",
      description: "A leaky toilet flapper can waste thousands of liters daily. Check by placing food color in the tank.",
      savings: "Saves up to 200 Liters/day",
      impact: "CRITICAL"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-400" />
          Water Conservation & Tips
        </h1>
        <p className="text-text-muted mt-1">Smart tips, community benchmark comparison, and interactive calculator to cut water waste and lower monthly bills.</p>
      </div>

      {/* Clean & Non-Redundant Block Efficiency Master Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-card p-6 shadow-xl border border-border/70 space-y-6 relative overflow-hidden"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-2">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Block Water Conservation Championship</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-text tracking-tight flex items-center gap-2">
              Top 5 Most Water-Efficient Households <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-surface-lighter text-text-muted border border-border/40">This Month</span>
            </h2>
            <p className="text-xs text-text-muted mt-1 font-medium max-w-2xl">
              Compare your monthly water consumption with neighbors in your block. Households that use less water rank higher and save maximum on monthly bills!
            </p>
          </div>

          {/* Quick Summary Pill Box (Single source of truth for Rank & Savings) */}
          {leaderboard && (
            <div className="bg-surface-lighter/80 dark:bg-surface-lighter/40 px-4 py-3 rounded-2xl border border-border/60 flex items-center gap-4 shrink-0 shadow-sm">
              <div className="text-center">
                <span className="text-[10px] text-text-muted uppercase font-extrabold block">Your Rank</span>
                <span className="text-lg font-black text-primary">#{leaderboard.myRank} <span className="text-xs text-text-muted font-normal">/ {leaderboard.totalHouseholds}</span></span>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <span className="text-[10px] text-text-muted uppercase font-extrabold block">Your Usage</span>
                <span className="text-lg font-black text-emerald-500">{Math.round(leaderboard.myTotalLiters)} L</span>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center">
                <span className="text-[10px] text-text-muted uppercase font-extrabold block">Est. Bill Savings</span>
                <span className="text-lg font-black text-amber-500">₹{monthlyRupeeSavings}</span>
              </div>
            </div>
          )}
        </div>

        {/* Top 5 Leaderboard Bars */}
        {leaderboard && leaderboard.top5Leaderboard && leaderboard.top5Leaderboard.length > 0 ? (
          <div className="space-y-3.5">
            {leaderboard.top5Leaderboard.map((household, idx) => {
              const percentage = Math.max(12, Math.min(100, (household.totalLiters / maxLeaderLiters) * 100));
              const isMe = household.isMe;

              return (
                <div key={idx} className={`p-3.5 rounded-2xl border transition-all ${isMe ? 'bg-primary/10 border-primary/50 shadow-md ring-1 ring-primary/30' : 'bg-surface-lighter/50 dark:bg-surface-lighter/20 border-border/40 hover:border-border'}`}>
                  <div className="flex items-center justify-between text-xs font-bold text-text mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0 ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-400/20' :
                        idx === 1 ? 'bg-slate-300 text-slate-900' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-surface border border-border text-text-muted'
                      }`}>
                        #{household.rank}
                      </span>
                      <span className="font-extrabold text-sm text-text">
                        House {household.houseNumber} <span className="text-xs font-medium text-text-muted">({household.name})</span>
                      </span>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-md bg-primary text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                          YOU
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-sm text-emerald-500">
                        {Math.round(household.totalLiters)} Liters
                      </span>
                    </div>
                  </div>

                  {/* Graphical Bar */}
                  <div className="w-full h-3 bg-surface rounded-full overflow-hidden border border-border/30 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.1 }}
                      className={`h-full rounded-full ${
                        isMe ? 'bg-gradient-to-r from-primary to-emerald-400 shadow-lg' :
                        idx === 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                        'bg-gradient-to-r from-sky-400 to-blue-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted text-sm font-medium">
            Loading neighborhood leaderboard competition...
          </div>
        )}

        {/* Dynamic Recharts Pie Chart Breakdown */}
        {pieChartData && pieChartData.length > 1 && (
          <div className="border-t border-border/50 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <PieIcon className="w-4 h-4 text-primary" />
              <h3 className="font-extrabold text-text text-sm">Consumption Share Breakdown (Top 5 Leaderboard)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                          stroke={entry.isMe ? '#2563eb' : '#0f172a'}
                          strokeWidth={entry.isMe ? 3 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                              <p className="font-extrabold text-white">{data.name}</p>
                              <p className="font-bold text-emerald-400">{data.value} Liters</p>
                              {data.isMe && <span className="text-[10px] bg-primary px-2 py-0.5 rounded text-white font-black">YOUR HOUSEHOLD</span>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-2 text-xs font-medium">
                {pieChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-surface-lighter/60 border border-border/40">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pieColors[idx % pieColors.length] }} />
                      <span className={`truncate ${item.isMe ? 'font-black text-primary text-sm' : 'text-text font-semibold'}`}>{item.name}</span>
                    </div>
                    <span className="font-black text-text shrink-0">{item.value} L</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Real-World Environmental Impact Counter Grid */}
        <div className="border-t border-border/50 pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <h3 className="font-extrabold text-text text-sm">Real-World Environmental Impact (Block Savings)</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-500 mb-1">
                <Truck className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-wider">Tankers Saved</span>
              </div>
              <p className="text-lg font-black text-text">{ecoImpact.tankersAvoided} <span className="text-xs text-text-muted font-normal">Trucks</span></p>
              <span className="text-[9px] font-bold text-emerald-500">10,000L Delivery Tankers</span>
            </div>

            <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-teal-500 mb-1">
                <TreePine className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-wider">Trees Nourished</span>
              </div>
              <p className="text-lg font-black text-text">{ecoImpact.treesNourished} <span className="text-xs text-text-muted font-normal">Trees</span></p>
              <span className="text-[9px] font-bold text-teal-500">Daily Plant Water Needs</span>
            </div>

            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-blue-500 mb-1">
                <CloudRain className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-wider">CO₂ Offset</span>
              </div>
              <p className="text-lg font-black text-text">{ecoImpact.co2OffsetKg} <span className="text-xs text-text-muted font-normal">kg</span></p>
              <span className="text-[9px] font-bold text-blue-500">Pumping & Energy Offset</span>
            </div>

            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between text-purple-500 mb-1">
                <Droplets className="w-4 h-4" />
                <span className="text-[10px] uppercase font-black tracking-wider">Shower Time</span>
              </div>
              <p className="text-lg font-black text-text">{ecoImpact.showerMinutesSaved} <span className="text-xs text-text-muted font-normal">Mins</span></p>
              <span className="text-[9px] font-bold text-purple-500">Equivalent Saved Time</span>
            </div>
          </div>
        </div>

        {/* Motivational Banner */}
        {leaderboard && leaderboard.moreEfficientNeighborsCount > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs sm:text-sm font-semibold text-amber-500 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>{leaderboard.moreEfficientNeighborsCount} neighbor(s)</strong> in your block used less water than your household this month. Follow the tips below to surpass them on the leaderboard! 🏆
              </span>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Target Calculator with Ultra-Legible Background SVG */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
          
          {/* Watermark Background Vector Wallpaper - Higher Opacity for Vibrant Graphic Visibility */}
          <div 
            className="absolute -right-4 -bottom-4 w-56 h-56 opacity-45 dark:opacity-50 pointer-events-none transition-transform duration-500 group-hover:scale-105 bg-no-repeat bg-contain bg-right-bottom"
            style={{ backgroundImage: `url('/Calculator.svg')` }}
          />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-3">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-text text-lg">Target Calculator</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider block mb-2 font-bold">Household Residents</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={residents}
                    onChange={(e) => setResidents(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="font-bold text-text border border-border/50 px-3 py-1 rounded-lg bg-surface-lighter text-sm shadow-sm">
                    {residents}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs text-text-muted uppercase tracking-wider block font-bold">Conservation Measures</label>
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer hover:text-primary transition-colors font-semibold">
                  <input
                    type="checkbox"
                    checked={useAerators}
                    onChange={(e) => setUseAerators(e.target.checked)}
                    className="rounded border-border bg-surface text-primary focus:ring-primary w-4.5 h-4.5 cursor-pointer"
                  />
                  <span>Using Faucet Aerators</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer hover:text-primary transition-colors font-semibold">
                  <input
                    type="checkbox"
                    checked={shortShowers}
                    onChange={(e) => setShortShowers(e.target.checked)}
                    className="rounded border-border bg-surface text-primary focus:ring-primary w-4.5 h-4.5 cursor-pointer"
                  />
                  <span>Short Showers (&lt; 5 mins)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border/50 space-y-4 relative z-10">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
              <div>
                <span className="text-xs text-text-muted block uppercase tracking-wide font-extrabold">Daily Target Limit</span>
                <span className="text-2xl font-black text-primary mt-1 block">{finalTarget.toFixed(0)} Liters</span>
              </div>
              <Target className="w-8 h-8 text-primary/60" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-left">
              <div className="bg-surface/90 backdrop-blur-sm p-3 rounded-lg border border-border/40 shadow-sm">
                <span className="text-text-muted block font-bold">Monthly Target</span>
                <span className="font-extrabold text-text mt-0.5 block">{monthlyTarget.toFixed(0)} L</span>
              </div>
              <div className="bg-surface/90 backdrop-blur-sm p-3 rounded-lg border border-border/40 shadow-sm">
                <span className="text-text-muted block font-bold">Est. Daily Saving</span>
                <span className="font-extrabold text-emerald-500 mt-0.5 block">-{savings.toFixed(0)} L</span>
              </div>
            </div>
          </div>
        </div>

        {/* Conservation Tips List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-text flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Interactive Saving Guide
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tips.map((tip, idx) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-surface border border-border/70 hover:border-primary/50 transition-all rounded-2xl p-5 space-y-3 shadow-sm hover:shadow-md text-left flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tip.impact === 'CRITICAL' ? 'bg-red-500/10 text-red-400' :
                      tip.impact === 'HIGH' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {tip.impact} IMPACT
                    </span>
                    <Droplets className="w-4 h-4 text-primary/70" />
                  </div>
                  <h4 className="font-bold text-text mt-2 text-base">{tip.title}</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">{tip.description}</p>
                </div>
                <div className="bg-surface-lighter rounded-lg p-2 text-xs border border-border/30 text-emerald-400 font-semibold text-center mt-3">
                  {tip.savings}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
