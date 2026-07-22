import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplet, Activity, ArrowUpRight, ArrowDownRight, Download, Calendar, TrendingUp, Coins, AlertTriangle, Lightbulb } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Cell
} from 'recharts';
import api from '../api';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#06b6d4', '#6366f1', '#f97316'];

const UsageTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-[11px] text-slate-300">
        <p className="font-bold text-xs text-white mb-1">{data.name}</p>
        <p className="text-slate-400 font-medium">Logged: <strong className="text-primary font-bold">{data.usage.toLocaleString()} L</strong></p>
        {data.weekday && <p className="text-slate-500 text-[10px]">{data.weekday} ({data.dateStr})</p>}
      </div>
    );
  }
  return null;
};

export default function MyUsage() {
  const [rawLogs, setRawLogs] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1 to 12
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('area'); // area, bar, line

  // Tariff States
  const [safeWaterLimit, setSafeWaterLimit] = useState(0);
  const [baseRatePerLiter, setBaseRatePerLiter] = useState(0);
  const [excessRatePerLiter, setExcessRatePerLiter] = useState(0);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const houseNumber = localStorage.getItem('houseNumber');
          const username = localStorage.getItem('username');
          
          if (!houseNumber) { 
            setRawLogs([]); 
            setLoading(false); 
            return; 
          }

          // 1. Fetch usage logs
          const res = await api.get(`/usage/household/${houseNumber}`);
          if (res.data && res.data.length > 0) {
            const sortedData = res.data.sort((a, b) => new Date(a.readingDate) - new Date(b.readingDate));
            setRawLogs(sortedData);
          } else {
            setRawLogs([]);
          }

          // 2. Fetch Tariff limits configuration
          if (username) {
            try {
              const profileRes = await api.get(`/users/profile/${username}`);
              if (profileRes.data) {
                let limit = profileRes.data.monthlyLimitLiters || 0;
                let baseRate = profileRes.data.waterRatePerLiter || 0;
                let excessRate = profileRes.data.excessRatePerLiter || 0;

                // Fallback to block tariff configured by CA
                if (limit === 0 || baseRate === 0 || excessRate === 0) {
                  try {
                    const tariffRes = await api.get(`/tariff?callerUsername=${username}`);
                    if (tariffRes.data) {
                      if (limit === 0) limit = tariffRes.data.monthlyLimitLiters || 0;
                      if (baseRate === 0) baseRate = tariffRes.data.baseRatePerLiter || 0;
                      if (excessRate === 0) excessRate = tariffRes.data.excessRatePerLiter || 0;
                    }
                  } catch (tariffErr) {
                    console.error("Error fetching CA tariff fallback inside MyUsage:", tariffErr);
                  }
                }

                setSafeWaterLimit(limit);
                setBaseRatePerLiter(baseRate);
                setExcessRatePerLiter(excessRate);
              }
            } catch (profileErr) {
              console.error("Error fetching user profile inside MyUsage:", profileErr);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setRawLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  // Filter logs for selected month
  const filteredLogs = rawLogs.filter(log => {
    const d = new Date(log.readingDate);
    return d.getFullYear() === new Date().getFullYear() && (d.getMonth() + 1) === selectedMonth;
  });

  const usageData = filteredLogs.map(log => ({
    name: new Date(log.readingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    usage: log.readingLiters,
    weekday: new Date(log.readingDate).toLocaleDateString('en-US', { weekday: 'long' }),
    dateStr: log.readingDate
  }));

  // Statistics Calculations
  const totalUsage = filteredLogs.reduce((sum, log) => sum + log.readingLiters, 0);
  const activeLimit = safeWaterLimit > 0 ? safeWaterLimit : 3000;
  
  const dailyAverage = filteredLogs.length > 0 ? Math.round(totalUsage / filteredLogs.length) : 0;

  let peakDayLiters = 0;
  let peakDayDateStr = 'N/A';
  let peakDayWeekday = '';
  filteredLogs.forEach(log => {
    if (log.readingLiters > peakDayLiters) {
      peakDayLiters = log.readingLiters;
      const d = new Date(log.readingDate);
      peakDayDateStr = log.readingDate;
      peakDayWeekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    }
  });

  const withinLimitLiters = Math.min(totalUsage, activeLimit);
  const excessLitersVal = Math.max(0, totalUsage - activeLimit);
  const estimatedCost = (withinLimitLiters * baseRatePerLiter) + (excessLitersVal * excessRatePerLiter);

  // Month-over-month comparison
  const getPercentChange = () => {
    const prevMonthNum = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? new Date().getFullYear() - 1 : new Date().getFullYear();

    const prevLogs = rawLogs.filter(log => {
      const d = new Date(log.readingDate);
      return d.getFullYear() === prevYear && (d.getMonth() + 1) === prevMonthNum;
    });
    const prevTotal = prevLogs.reduce((sum, log) => sum + log.readingLiters, 0);

    if (prevTotal > 0) {
      const diff = ((totalUsage - prevTotal) / prevTotal) * 100;
      return Math.round(diff * 10) / 10;
    }
    return 0;
  };

  const percentChange = getPercentChange();

  // Smart Conservation Insights Logic
  let weekendUsage = 0;
  let weekendCount = 0;
  let weekdayUsage = 0;
  let weekdayCount = 0;
  filteredLogs.forEach(log => {
    const day = new Date(log.readingDate).getDay();
    const isWeekend = (day === 0 || day === 6);
    if (isWeekend) {
      weekendUsage += log.readingLiters;
      weekendCount++;
    } else {
      weekdayUsage += log.readingLiters;
      weekdayCount++;
    }
  });
  const avgWeekend = weekendCount > 0 ? weekendUsage / weekendCount : 0;
  const avgWeekday = weekdayCount > 0 ? weekdayUsage / weekdayCount : 0;
  let weekendDiffPercent = 0;
  if (avgWeekday > 0 && avgWeekend > 0) {
    weekendDiffPercent = Math.round(((avgWeekend - avgWeekday) / avgWeekday) * 100);
  }

  let warningText = "";
  let warningSeverity = "info"; // info, warning, danger
  if (totalUsage > activeLimit) {
    warningText = `Limit Exceeded! You are over the safe threshold by ${(totalUsage - activeLimit).toLocaleString()} Liters. Penalty rates (₹${excessRatePerLiter}/L) are currently active.`;
    warningSeverity = "danger";
  } else if (totalUsage > activeLimit * 0.8) {
    warningText = `Approaching Limit: You have consumed ${Math.round((totalUsage * 100)/activeLimit)}% of your safe water limit. Conserve water to avoid penalty rates.`;
    warningSeverity = "warning";
  } else if (weekendDiffPercent > 12) {
    warningText = `High Weekend Usage Detected! Your average weekend usage is ${weekendDiffPercent}% higher than weekdays. Consider optimizing laundry scheduling.`;
    warningSeverity = "warning";
  } else if (totalUsage > 0) {
    warningText = `Excellent! Your consumption pattern is within healthy bounds. Keep logging readings to maintain conservation goals.`;
    warningSeverity = "success";
  } else {
    warningText = `No water usage logs detected for the selected month. Please contact your Community Admin to log readings.`;
    warningSeverity = "info";
  }

  // Calendar Heatmap Calculator
  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };
  const currentYearVal = new Date().getFullYear();
  const daysCount = getDaysInMonth(selectedMonth, currentYearVal);
  const firstDayIndex = new Date(currentYearVal, selectedMonth - 1, 1).getDay();
  
  const calendarDays = [];
  // 1. Add padding slots for weekday offset
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push({
      isPadding: true,
      dayNum: null,
      liters: 0,
      hasLog: false
    });
  }
  // 2. Add actual days
  for (let d = 1; d <= daysCount; d++) {
    const logForDay = filteredLogs.find(log => new Date(log.readingDate).getDate() === d);
    calendarDays.push({
      dayNum: d,
      liters: logForDay ? logForDay.readingLiters : 0,
      hasLog: !!logForDay,
      dateStr: logForDay ? logForDay.readingDate : `${currentYearVal}-${String(selectedMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    });
  }

  // CSV Exporter
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No logs to export for the selected month.");
      return;
    }
    const csvRows = [
      ["Date", "Weekday", "Usage (Liters)", "Limit Status"],
      ...filteredLogs.map(log => {
        const d = new Date(log.readingDate);
        const dailyLimitThreshold = activeLimit / 30;
        const status = log.readingLiters > dailyLimitThreshold ? "Above Daily Avg Limit" : "Normal";
        return [
          log.readingDate,
          d.toLocaleDateString('en-US', { weekday: 'long' }),
          log.readingLiters,
          status
        ];
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const mName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1];
    link.setAttribute("download", `WaterUsage_${mName}_${currentYearVal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Radial Progress Ring calculations
  const progressPercentage = Math.min(100, Math.round((totalUsage * 100) / activeLimit));
  const strokeDashoffset = 339.3 - (339.3 * progressPercentage) / 100;

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">My Usage Analysis</h1>
          <p className="text-text-muted mt-1">Deep dive into your water consumption trends.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-border">
            <span className="text-xs font-semibold text-text-muted pl-2">Select Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-surface-lighter border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold"
            >
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((mName, idx) => (
                <option key={mName} value={idx + 1}>{mName}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
            title="Download CSV Report"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top Row KPI Micro-Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Daily Average */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 border border-primary/10 flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Daily Average</span>
            <h4 className="text-xl font-black text-text mt-1">
              {dailyAverage.toLocaleString()} <span className="text-xs text-text-muted font-bold">Liters / day</span>
            </h4>
            <p className="text-[10px] text-text-muted mt-0.5">Based on logged days this month</p>
          </div>
        </motion.div>

        {/* KPI 2: Peak Usage Day */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-5 border border-amber-500/10 flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Peak Consumption Day</span>
            <h4 className="text-xl font-black text-text mt-1">
              {peakDayLiters > 0 ? `${peakDayLiters.toLocaleString()} L` : 'N/A'}
            </h4>
            <p className="text-[10px] text-text-muted mt-0.5">
              {peakDayLiters > 0 ? `${peakDayWeekday}, ${peakDayDateStr}` : 'No logs recorded'}
            </p>
          </div>
        </motion.div>

        {/* KPI 3: Estimated Cost */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5 border border-emerald-500/10 flex items-center gap-4 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted">Estimated Cost</span>
            <h4 className="text-xl font-black text-emerald-400 mt-1">
              ₹{estimatedCost.toFixed(2)}
            </h4>
            <p className="text-[10px] text-text-muted mt-0.5">Calculated using active block rates</p>
          </div>
        </motion.div>
      </div>

      {/* Main Grid: ring, heatmap, charts, insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Ring, usage details, distribution, and smart insights */}
        <div className="space-y-6 flex flex-col">
          {/* Ring Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-400 animate-pulse" />
                  <h3 className="text-text-muted font-medium text-sm">Monthly safe limit goal</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">Limit: {activeLimit.toLocaleString()} L</span>
              </div>

              {/* Radial Progress Ring */}
              <div className="flex flex-col items-center justify-center py-6 relative">
                <svg className="w-44 h-44 transform -rotate-90">
                  {/* Background Circle */}
                  <circle
                    cx="88"
                    cy="88"
                    r="54"
                    className="stroke-surface-lighter"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  {/* Active Progress Circle */}
                  <motion.circle
                    cx="88"
                    cy="88"
                    r="54"
                    className={totalUsage > activeLimit ? "stroke-red-500" : "stroke-primary"}
                    strokeWidth="11"
                    fill="transparent"
                    strokeDasharray="339.3"
                    initial={{ strokeDashoffset: 339.3 }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-text">{progressPercentage}%</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted mt-0.5">Consumed</span>
                </div>
              </div>

              <div className="text-center mb-6">
                <h2 className="text-3xl font-black text-text">{totalUsage.toLocaleString()} <span className="text-sm text-text-muted font-semibold">Liters used</span></h2>
                
                {percentChange !== 0 ? (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-xs">
                    <span className={`flex items-center px-2 py-0.5 rounded-full font-bold ${
                      percentChange < 0 
                        ? 'text-emerald-400 bg-emerald-500/10' 
                        : 'text-red-400 bg-red-500/10'
                    }`}>
                      {percentChange < 0 ? (
                        <ArrowDownRight className="w-3 h-3 mr-0.5" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 mr-0.5" />
                      )}
                      {Math.abs(percentChange)}%
                    </span>
                    <span className="text-text-muted font-medium">vs previous month</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-text-muted font-medium">
                    <span>0% vs previous month</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-6 border-t border-border/40">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-3">Usage Distribution Estimate</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted font-medium">Bathroom</span>
                    <span className="text-text font-bold">{totalUsage > 0 ? '45%' : '0%'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: totalUsage > 0 ? '45%' : '0%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted font-medium">Kitchen</span>
                    <span className="text-text font-bold">{totalUsage > 0 ? '30%' : '0%'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: totalUsage > 0 ? '30%' : '0%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-text-muted font-medium">Laundry</span>
                    <span className="text-text font-bold">{totalUsage > 0 ? '25%' : '0%'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-400 transition-all duration-300" style={{ width: totalUsage > 0 ? '25%' : '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Smart Insights Warnings Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
              warningSeverity === "danger"
                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-400"
                : warningSeverity === "warning"
                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-400"
                : warningSeverity === "success"
                ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400"
                : "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-300"
            }`}
          >
            {warningSeverity === "danger" || warningSeverity === "warning" ? (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider mb-1">
                {warningSeverity === "danger" ? "Critical Alert" : warningSeverity === "warning" ? "Usage Warning" : "Conservation Insight"}
              </h4>
              <p className="text-xs font-medium leading-relaxed">{warningText}</p>
            </div>
          </motion.div>
        </div>

        {/* Right column (span-2): daily consumption chart, smart insights, and Calendar view heatmap */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">
          {/* Trend Chart Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 flex flex-col"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <h3 className="font-semibold text-text flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                Daily Consumption Trend
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]}
                </span>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="bg-surface-lighter border border-border rounded-lg px-2.5 py-1 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold"
                >
                  <option value="area">Area Chart</option>
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                </select>
              </div>
            </div>

            <div className="h-[250px] w-full">
              {loading ? (
                <div className="w-full h-full flex flex-col gap-4 p-2">
                  <div className="flex-1 w-full flex items-end gap-3 animate-pulse">
                    <div className="w-full h-1/3 rounded-t-lg bg-surface-lighter" />
                    <div className="w-full h-2/3 rounded-t-lg bg-surface-lighter" />
                    <div className="w-full h-1/2 rounded-t-lg bg-surface-lighter" />
                  </div>
                </div>
              ) : usageData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <Droplet className="w-10 h-10 text-text-muted/40 mx-auto animate-pulse" />
                  <p className="text-text text-sm font-medium">No usage logs for this month</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    if (chartType === 'bar') {
                      return (
                        <BarChart data={usageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip content={<UsageTooltip />} />
                          <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                            {usageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      );
                    }
                    if (chartType === 'line') {
                      return (
                        <LineChart data={weeklyUsage || usageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip content={<UsageTooltip />} />
                          <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      );
                    }
                    return (
                      <AreaChart data={usageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorUsageBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip content={<UsageTooltip />} />
                        <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsageBlue)" />
                      </AreaChart>
                    );
                  })()}
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Calendar Heatmap Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Consumption Heatmap Grid
              </h3>
              <span className="text-[10px] text-text-muted font-bold">Hover blocks to view details</span>
            </div>

            <div className="grid grid-cols-7 gap-2.5">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-text-muted py-1">{day}</div>
              ))}
              
              {/* Calendar Grid cells */}
              {calendarDays.map((day, idx) => {
                if (day.isPadding) {
                  return (
                    <div 
                      key={`pad-${idx}`}
                      className="h-10 rounded-lg bg-surface-lighter/5 border border-border/5 opacity-20 pointer-events-none"
                    />
                  );
                }

                const dailyThreshold = activeLimit / 30;
                const percentageOfLimit = Math.round((day.liters * 100) / dailyThreshold);
                let bgCls = "bg-surface-lighter/30 border border-border/20 text-text-muted/30";
                
                if (day.hasLog) {
                  if (day.liters === 0) {
                    bgCls = "bg-surface-light border border-border text-text-muted hover:scale-105";
                  } else if (day.liters < dailyThreshold * 0.8) {
                    bgCls = "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 font-bold hover:scale-[1.12]";
                  } else if (day.liters <= dailyThreshold * 1.2) {
                    bgCls = "bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 font-bold hover:scale-[1.12]";
                  } else {
                    bgCls = "bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 font-bold hover:scale-[1.12] shadow-[0_0_12px_rgba(239,68,68,0.1)]";
                  }
                }

                return (
                  <div 
                    key={idx}
                    className={`h-10 flex flex-col items-center justify-center rounded-lg text-xs transition-all duration-200 cursor-pointer shadow-sm relative group ${bgCls}`}
                  >
                    <span className="text-[10px] font-semibold">{day.dayNum}</span>
                    {day.hasLog && (
                      <span className="text-[8px] opacity-90 truncate max-w-full px-0.5">{day.liters}L</span>
                    )}
                    
                    {/* Inline custom Tooltip */}
                    <div className="absolute bottom-11 scale-0 group-hover:scale-100 transition-all origin-bottom bg-slate-950 border border-slate-700/80 p-2.5 rounded-lg shadow-2xl z-50 text-[10px] text-slate-300 w-32 text-center pointer-events-none">
                      <p className="font-bold text-white mb-0.5">Day {day.dayNum}</p>
                      <p className="text-slate-400 font-semibold">{day.hasLog ? `${day.liters.toLocaleString()} Liters` : "No Log"}</p>
                      {day.hasLog && (
                        <>
                          <p className="text-[9px] text-amber-400 font-bold mt-0.5">{percentageOfLimit}% of Daily Limit</p>
                          <p className="text-[8px] text-slate-500 mt-0.5">{day.dateStr}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Heatmap Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-border/20 text-[10px] text-text-muted font-bold justify-center">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-surface-light border border-border" /> No Log</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-600" /> Low Usage (&lt;80%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 border border-blue-600" /> Moderate (80-120%)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500 border border-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]" /> High Usage (&gt;120%)</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
