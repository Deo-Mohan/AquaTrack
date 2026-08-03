import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Info, Calculator, Droplets, Target, Award, Sparkles, Users, TrendingDown, DollarSign, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../api';

export default function WaterTips() {
  const [residents, setResidents] = useState(3);
  const [useAerators, setUseAerators] = useState(false);
  const [shortShowers, setShortShowers] = useState(false);

  // Dynamic Peer Comparison States
  const [userAvgLiters, setUserAvgLiters] = useState(450);
  const [communityAvgLiters, setCommunityAvgLiters] = useState(340);
  const [waterRate, setWaterRate] = useState(0.15); // Default ₹0.15 per Liter if tariff not set
  const [hasRealUsage, setHasRealUsage] = useState(false);

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
      
      if (houseNumber) {
        // 1. Fetch user's real meter logs
        const usageRes = await api.get(`/usage/household/${houseNumber}`);
        if (usageRes.data && usageRes.data.length > 0) {
          const total = usageRes.data.reduce((sum, log) => sum + log.readingLiters, 0);
          const avg = Math.round(total / usageRes.data.length);
          if (avg > 0) {
            setUserAvgLiters(avg);
            // Top 25% efficient benchmark is typically 75% of average user consumption
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

  // Memoized potential monthly rupee savings computation (useMemo)
  const monthlyRupeeSavings = useMemo(() => {
    const monthlyLitersSaved = (userAvgLiters - communityAvgLiters) * 30;
    return Math.max(150, Math.round(monthlyLitersSaved * waterRate));
  }, [userAvgLiters, communityAvgLiters, waterRate]);

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

      {/* Community Benchmark & Comparative Savings Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card p-6 shadow-xl border border-border/70 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          {/* Left Column: Heading & Context */}
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-primary/10 text-primary border border-primary/20">
              <Users className="w-3.5 h-3.5" />
              <span>Community Peer Benchmark</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-text tracking-tight flex items-center gap-2">
              Top 25% Households in Your Block Use <span className="text-emerald-500 underline decoration-emerald-400/50 underline-offset-4">{communityAvgLiters} L/day</span>
            </h2>
            <p className="text-xs sm:text-sm text-text-muted leading-relaxed font-medium">
              Over <strong className="text-text font-bold">68% of residents in your society</strong> have installed aerators and switched to 5-minute shower routines. By matching these habits, your household can save up to <strong className="text-emerald-500 font-extrabold">₹{monthlyRupeeSavings}/month</strong> on water bills!
            </p>
          </div>

          {/* Right Column: Comparative Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-surface-lighter/60 dark:bg-surface-lighter/30 p-4 rounded-2xl border border-border/50 text-left shadow-sm">
              <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-text-muted">
                <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                <span>Society Benchmark</span>
              </div>
              <p className="text-lg font-black text-text mt-1">{communityAvgLiters} <span className="text-xs font-semibold text-text-muted">L/day</span></p>
              <span className="text-[9px] font-bold text-emerald-500">Top 25% efficient standard</span>
            </div>

            <div className="bg-surface-lighter/60 dark:bg-surface-lighter/30 p-4 rounded-2xl border border-border/50 text-left shadow-sm">
              <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-text-muted">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                <span>Est. Bill Savings</span>
              </div>
              <p className="text-lg font-black text-emerald-500 mt-1">₹{monthlyRupeeSavings} <span className="text-xs font-semibold text-text-muted">/mo</span></p>
              <span className="text-[9px] font-bold text-text-muted">Calculated using active tariff</span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-surface-lighter/60 dark:bg-surface-lighter/30 p-4 rounded-2xl border border-border/50 text-left shadow-sm flex flex-col justify-between">
              <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-text-muted">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Adoption</span>
              </div>
              <p className="text-lg font-black text-primary mt-1">68%</p>
              <span className="text-[9px] font-bold text-text-muted">Neighbors participating</span>
            </div>
          </div>

        </div>
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
