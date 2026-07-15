import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Info, Calculator, Droplets, Target, Award, Sparkles } from 'lucide-react';

export default function WaterTips() {
  const [residents, setResidents] = useState(3);
  const [useAerators, setUseAerators] = useState(false);
  const [shortShowers, setShortShowers] = useState(false);

  // Constants
  const baseLitersPerPerson = 135; // WHO standard liter consumption per person per day
  
  // Calculate potential savings
  let dailyTarget = residents * baseLitersPerPerson;
  let savings = 0;

  if (useAerators) {
    savings += dailyTarget * 0.25; // 25% savings from aerators
  }
  if (shortShowers) {
    savings += residents * 15; // 15L saved per person per day
  }

  const finalTarget = dailyTarget - savings;
  const monthlyTarget = finalTarget * 30;

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
    },
    {
      title: "Use Dual-Flush Toilets",
      description: "Dual flush buttons let you choose between a half flush for liquid waste and a full flush for solids.",
      savings: "Saves ~4-6 Liters per flush",
      impact: "MEDIUM"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-amber-400" />
          Water Conservation & Tips
        </h1>
        <p className="text-text-muted mt-1">Smart tips, calculator and strategies to reduce water waste and bills.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Target Calculator */}
        <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-2">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-text">Target Calculator</h3>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wider block mb-2">Household Residents</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={residents}
                    onChange={(e) => setResidents(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-lighter rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="font-bold text-text border border-border/50 px-3 py-1 rounded-lg bg-surface-lighter text-sm">
                    {residents}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs text-text-muted uppercase tracking-wider block">Conservation Measures</label>
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer hover:text-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={useAerators}
                    onChange={(e) => setUseAerators(e.target.checked)}
                    className="rounded border-border bg-surface text-primary focus:ring-primary w-4.5 h-4.5 cursor-pointer"
                  />
                  <span>Using Faucet Aerators</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer hover:text-primary transition-colors">
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

          <div className="mt-8 pt-4 border-t border-border/50 space-y-4">
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-text-muted block uppercase tracking-wide">Daily Target Limit</span>
                <span className="text-2xl font-black text-primary mt-1 block">{finalTarget.toFixed(0)} Liters</span>
              </div>
              <Target className="w-8 h-8 text-primary/40" />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-left">
              <div className="bg-surface-lighter p-3 rounded-lg border border-border/20">
                <span className="text-text-muted block">Monthly Target</span>
                <span className="font-bold text-text mt-0.5 block">{monthlyTarget.toFixed(0)} L</span>
              </div>
              <div className="bg-surface-lighter p-3 rounded-lg border border-border/20">
                <span className="text-text-muted block">Est. Daily Saving</span>
                <span className="font-bold text-emerald-400 mt-0.5 block">-{savings.toFixed(0)} L</span>
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
