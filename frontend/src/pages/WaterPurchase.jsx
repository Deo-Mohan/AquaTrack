import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Droplets,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  Building2,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Info,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Truck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../api';

const SOURCE_OPTIONS = [
  { id: 'TANKER', label: 'Tanker Delivery', color: '#f59e0b', icon: Truck },
  { id: 'MUNICIPAL', label: 'Municipal Billing', color: '#3b82f6', icon: Building2 },
  { id: 'BOREWELL', label: 'Borewell / Ground', color: '#10b981', icon: Droplets },
  { id: 'OTHER', label: 'Other Sources', color: '#8b5cf6', icon: ShoppingCart },
];

const SOURCE_COLORS = {
  TANKER: '#f59e0b',
  MUNICIPAL: '#3b82f6',
  BOREWELL: '#10b981',
  OTHER: '#8b5cf6'
};

export default function WaterPurchase() {
  const username = localStorage.getItem('username') || '';
  const [apartmentBlock, setApartmentBlock] = useState(localStorage.getItem('apartmentBlock') || 'Block A');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    sourceType: 'TANKER',
    volumeLiters: '',
    totalCost: '',
    unitCostPerLiter: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    vendorName: '',
    notes: '',
    billingMonth: selectedMonth
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchPurchasesAndSummary = async () => {
    setLoading(true);
    try {
      const [purchasesRes, summaryRes] = await Promise.allSettled([
        api.get(`/bulk-purchases?callerUsername=${username}&billingMonth=${encodeURIComponent(selectedMonth)}`),
        api.get(`/bulk-purchases/summary?callerUsername=${username}&billingMonth=${encodeURIComponent(selectedMonth)}`)
      ]);

      if (purchasesRes.status === 'fulfilled' && Array.isArray(purchasesRes.value?.data)) {
        setPurchases(purchasesRes.value.data);
      } else {
        setPurchases([]);
      }

      if (summaryRes.status === 'fulfilled' && summaryRes.value?.data && typeof summaryRes.value.data === 'object') {
        setSummary(summaryRes.value.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.error("Error fetching water purchase data:", err);
      setPurchases([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchasesAndSummary();
  }, [selectedMonth]);

  // Handle Liters / Cost real-time calculations in form
  const handleVolumeChange = (v) => {
    const liters = parseFloat(v);
    const unitRate = parseFloat(formData.unitCostPerLiter);
    let total = formData.totalCost;
    if (!isNaN(liters) && !isNaN(unitRate) && unitRate > 0) {
      total = (liters * unitRate).toFixed(2);
    }
    setFormData(prev => ({ ...prev, volumeLiters: v, totalCost: total }));
  };

  const handleUnitRateChange = (r) => {
    const unitRate = parseFloat(r);
    const liters = parseFloat(formData.volumeLiters);
    let total = formData.totalCost;
    if (!isNaN(liters) && !isNaN(unitRate)) {
      total = (liters * unitRate).toFixed(2);
    }
    setFormData(prev => ({ ...prev, unitCostPerLiter: r, totalCost: total }));
  };

  const handleTotalCostChange = (c) => {
    const total = parseFloat(c);
    const liters = parseFloat(formData.volumeLiters);
    let unitRate = formData.unitCostPerLiter;
    if (!isNaN(liters) && liters > 0 && !isNaN(total)) {
      unitRate = (total / liters).toFixed(4);
    }
    setFormData(prev => ({ ...prev, totalCost: c, unitCostPerLiter: unitRate }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.volumeLiters || parseFloat(formData.volumeLiters) <= 0) {
      setErrorMsg('Please enter a valid volume in liters.');
      return;
    }
    if (!formData.totalCost || parseFloat(formData.totalCost) < 0) {
      setErrorMsg('Please enter a valid total cost.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/bulk-purchases?callerUsername=${username}`, {
        sourceType: formData.sourceType,
        volumeLiters: parseFloat(formData.volumeLiters),
        totalCost: parseFloat(formData.totalCost),
        unitCostPerLiter: parseFloat(formData.unitCostPerLiter || 0),
        purchaseDate: formData.purchaseDate,
        vendorName: formData.vendorName,
        notes: formData.notes,
        billingMonth: formData.billingMonth || selectedMonth
      });

      setSuccessMsg('Water purchase logged successfully!');
      setModalOpen(false);
      setFormData({
        sourceType: 'TANKER',
        volumeLiters: '',
        totalCost: '',
        unitCostPerLiter: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        vendorName: '',
        notes: '',
        billingMonth: selectedMonth
      });
      fetchPurchasesAndSummary();
    } catch (err) {
      const msg = typeof err.response?.data === 'string'
        ? err.response.data
        : err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to log water purchase.';
      setErrorMsg(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase log?")) return;
    setDeletingId(id);
    try {
      await api.delete(`/bulk-purchases/${id}`);
      fetchPurchasesAndSummary();
    } catch (err) {
      alert("Failed to delete purchase record.");
    } finally {
      setDeletingId(null);
    }
  };

  // Prepare multi-month chart data for Profit & Loss comparison
  const pnlChartData = useMemo(() => {
    if (summary?.monthlyTrends && summary.monthlyTrends.length > 0) {
      return summary.monthlyTrends.map(t => ({
        name: t.month,
        fullMonth: t.fullMonth,
        'Water Purchase Cost (₹)': t.waterPurchaseCost || 0,
        'Resident Revenue Billed (₹)': t.residentRevenueBilled || 0,
        netProfitLoss: t.netProfitLoss || 0
      }));
    }
    return [
      {
        name: selectedMonth,
        fullMonth: selectedMonth,
        'Water Purchase Cost (₹)': summary?.totalPurchaseCost || 0,
        'Resident Revenue Billed (₹)': summary?.totalResidentBilledRevenue || 0,
        netProfitLoss: (summary?.totalResidentBilledRevenue || 0) - (summary?.totalPurchaseCost || 0)
      }
    ];
  }, [summary, selectedMonth]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text">Water Purchase & P&L</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked Resident Billing
            </span>
          </div>
          <p className="text-text-muted mt-1 text-sm">
            Track tanker deliveries, municipal water costs, and real-time monthly profit & loss metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Billing Month Selector */}
          <div className="flex items-center gap-2 bg-surface-lighter px-3 py-2 rounded-xl border border-border">
            <Calendar className="w-4 h-4 text-primary" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-text focus:outline-none cursor-pointer"
            >
              {(() => {
                const currentYr = new Date().getFullYear();
                const defaultMonths = [
                  'January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'
                ].map(m => `${m} ${currentYr}`);

                const monthSet = new Set(defaultMonths);
                if (selectedMonth) monthSet.add(selectedMonth);

                return Array.from(monthSet).map(m => (
                  <option
                    key={m}
                    value={m}
                    className="bg-slate-900 text-slate-100 font-semibold"
                    style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
                  >
                    {m}
                  </option>
                ));
              })()}
            </select>
          </div>

          {/* Log Purchase Button */}
          <button
            onClick={() => setModalOpen(true)}
            className="btn-next flex items-center gap-2 text-xs py-2.5 px-4 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Log Water Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Water Purchased */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6 relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Water Purchased</p>
              <h3 className="text-2xl font-extrabold text-text mt-1">
                {summary?.totalWaterPurchasedLiters?.toLocaleString() || 0} <span className="text-xs text-text-muted font-normal">L</span>
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <Truck className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-3 mt-2">
            <span className="text-text-muted">Total Cost:</span>
            <strong className="text-amber-400 font-bold">₹{summary?.totalPurchaseCost?.toFixed(2) || '0.00'}</strong>
          </div>
        </motion.div>

        {/* Card 2: Resident Usage & Billed Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="glass-card p-6 relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Resident Consumption</p>
              <h3 className="text-2xl font-extrabold text-text mt-1">
                {summary?.totalResidentConsumptionLiters?.toLocaleString() || 0} <span className="text-xs text-text-muted font-normal">L</span>
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-3 mt-2">
            <span className="text-text-muted">Billed Revenue:</span>
            <strong className="text-blue-400 font-bold">₹{summary?.totalResidentBilledRevenue?.toFixed(2) || '0.00'}</strong>
          </div>
        </motion.div>

        {/* Card 3: Net Profit / Loss */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`glass-card p-6 relative overflow-hidden border-l-4 ${
            (summary?.isProfit ?? true) ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Net P&L Result</p>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                  (summary?.isProfit ?? true) ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/20 text-red-700 dark:text-red-300'
                }`}>
                  {(summary?.isProfit ?? true) ? 'PROFIT 📈' : 'LOSS 📉'}
                </span>
              </div>
              <h3 className={`text-2xl font-black mt-1 ${
                (summary?.isProfit ?? true) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {(summary?.netProfitLoss ?? 0) >= 0 ? '+' : ''}₹{summary?.netProfitLoss?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${
              (summary?.isProfit ?? true) ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
            }`}>
              {(summary?.isProfit ?? true) ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-3 mt-2">
            <span className="text-text-muted">Profit Margin:</span>
            <strong className={`font-extrabold ${(summary?.isProfit ?? true) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {summary?.profitMarginPercent || 0}%
            </strong>
          </div>
        </motion.div>

        {/* Card 4: Supply Volume Efficiency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="glass-card p-6 relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">Volume Efficiency</p>
              <h3 className="text-2xl font-extrabold text-text mt-1">
                {summary?.volumeEfficiencyPercent || 0}%
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-border/40 pt-3 mt-2">
            <span className="text-text-muted">Purchased vs Billed:</span>
            <strong className="text-purple-400 font-bold">{summary?.residentBillsCount || 0} Bills Settled</strong>
          </div>
        </motion.div>
      </div>

      {/* Visual Analytics & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Comparison Chart */}
        <div className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-text text-base">Monthly Financial Balance Sheet</h3>
              <p className="text-xs text-text-muted mt-0.5">Water Purchase Outflow vs Billed Revenue Inflow for {selectedMonth}</p>
            </div>
            <span className="px-3 py-1 bg-surface-lighter rounded-lg border border-border text-xs font-bold text-primary">
              {apartmentBlock}
            </span>
          </div>

          <div className="h-[290px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlChartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="outflowCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.65} />
                  </linearGradient>
                  <linearGradient id="inflowRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.65} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ strokeOpacity: 0.3 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ strokeOpacity: 0.3 }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const outflow = payload.find(p => p.dataKey === 'Water Purchase Cost (₹)')?.value || 0;
                      const inflow = payload.find(p => p.dataKey === 'Resident Revenue Billed (₹)')?.value || 0;
                      const diff = inflow - outflow;
                      const isProf = diff >= 0;

                      return (
                        <div className="bg-slate-900/95 border border-slate-700/80 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[210px]">
                          <div className="font-extrabold text-slate-100 text-xs border-b border-slate-800 pb-1.5 flex items-center justify-between">
                            <span>{payload[0]?.payload?.fullMonth || label}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isProf ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                              {isProf ? 'PROFIT 📈' : 'DEFICIT 📉'}
                            </span>
                          </div>
                          <div className="space-y-1 pt-0.5">
                            <div className="flex justify-between items-center text-emerald-400 font-bold">
                              <span>Resident Inflow:</span>
                              <span>+₹{inflow.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-rose-400 font-bold">
                              <span>Water Outflow:</span>
                              <span>-₹{outflow.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-800 pt-1.5 mt-1 flex justify-between items-center font-black">
                              <span className="text-slate-300">Net Balance:</span>
                              <span className={isProf ? 'text-emerald-400' : 'text-rose-400'}>
                                {isProf ? '+' : ''}₹{diff.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                />
                <Bar
                  dataKey="Water Purchase Cost (₹)"
                  name="Water Outflow (Purchased)"
                  fill="url(#outflowCostGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="Resident Revenue Billed (₹)"
                  name="Resident Inflow (Finalized Bills)"
                  fill="url(#inflowRevenueGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: P&L Summary Statement */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-text text-base mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <span>Financial Audit Statement</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-surface-lighter border border-border/60">
                <span className="text-text-muted">Total Water Outflow (Purchased):</span>
                <strong className="text-red-400 font-bold">-₹{summary?.totalPurchaseCost?.toFixed(2) || '0.00'}</strong>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-surface-lighter border border-border/60">
                <span className="text-text-muted font-medium">Resident Inflow (Finalized Bills):</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-extrabold">+₹{summary?.totalResidentBilledRevenue?.toFixed(2) || '0.00'}</strong>
              </div>

              {summary?.totalLateFeesBilled > 0 && (
                <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <span>Included Late Fee Penalties:</span>
                  <strong className="font-bold">+₹{summary?.totalLateFeesBilled?.toFixed(2)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-xl mt-6 border ${
            (summary?.isProfit ?? true)
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-700 dark:text-red-300'
          }`}>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Community Admin P&L Margin</p>
            <p className="text-2xl font-black mt-1 text-emerald-700 dark:text-emerald-300">
              {(summary?.isProfit ?? true) ? 'Net Profit of ' : 'Net Deficit of '}
              ₹{Math.abs(summary?.netProfitLoss || 0).toFixed(2)}
            </p>
            <p className="text-[12px] font-medium text-emerald-800/90 dark:text-emerald-200/80 mt-1">
              {(summary?.isProfit ?? true)
                ? 'Your tariff configuration covers water acquisition costs with a healthy margin.'
                : 'Consider adjusting base rates or penalty limits in Tariff Settings to balance expenses.'}
            </p>
          </div>
        </div>
      </div>

      {/* Water Purchase Logs Table */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-bold text-text text-base">Water Purchase Log History</h3>
            <p className="text-xs text-text-muted mt-0.5">Itemized record of tanker and municipal purchases for {selectedMonth}</p>
          </div>
          <span className="text-xs text-text-muted bg-surface-lighter px-3 py-1.5 rounded-lg border border-border font-semibold">
            {purchases.length} Logged Entries
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-xs font-semibold">Loading purchase logs...</p>
          </div>
        ) : purchases.length === 0 ? (
          <div className="py-12 text-center text-text-muted">
            <Truck className="w-12 h-12 mx-auto mb-3 text-text-muted/40" />
            <p className="text-sm font-semibold text-text">No water purchases logged for {selectedMonth}</p>
            <p className="text-xs text-text-muted mt-1">Click "Log Water Purchase" above to add your first entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/80 text-text-muted uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Source Type</th>
                  <th className="py-3 px-4">Vendor / Provider</th>
                  <th className="py-3 px-4 text-right">Volume (Liters)</th>
                  <th className="py-3 px-4 text-right">Rate / Lit (₹)</th>
                  <th className="py-3 px-4 text-right">Total Cost (₹)</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-text font-medium">
                {purchases.map(item => {
                  const srcObj = SOURCE_OPTIONS.find(s => s.id === item.sourceType) || SOURCE_OPTIONS[3];
                  return (
                    <tr key={item.id} className="hover:bg-surface-lighter/50 transition-colors">
                      <td className="py-3.5 px-4 text-text-muted">
                        {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ backgroundColor: `${srcObj.color}15`, color: srcObj.color }}>
                          <srcObj.icon className="w-3.5 h-3.5" />
                          {srcObj.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-text">
                        {item.vendorName || '—'}
                        {item.notes && <p className="text-[10px] text-text-muted font-normal">{item.notes}</p>}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-text">
                        {Number(item.volumeLiters || 0).toLocaleString()} L
                      </td>
                      <td className="py-3.5 px-4 text-right text-text-muted font-mono">
                        ₹{Number(item.unitCostPerLiter || 0).toFixed(4)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-red-400">
                        ₹{Number(item.totalCost || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 hover:bg-red-500/10 text-text-muted hover:text-red-400 rounded-lg transition-all cursor-pointer focus:outline-none disabled:opacity-50"
                          title="Delete purchase log"
                        >
                          {deletingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Purchase Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card p-6 max-w-lg w-full shadow-2xl border border-border relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text text-base">Log Bulk Water Purchase</h3>
                    <p className="text-xs text-text-muted">Enter tanker or municipal water invoice details</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-lighter cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Source Selection */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Water Source Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOURCE_OPTIONS.map(opt => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setFormData({ ...formData, sourceType: opt.id })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          formData.sourceType === opt.id
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-surface-lighter/50 border-border text-text-muted hover:text-text'
                        }`}
                      >
                        <opt.icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume & Cost Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Volume (Liters) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 50000"
                      value={formData.volumeLiters}
                      onChange={(e) => handleVolumeChange(e.target.value)}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Total Cost (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 1500.00"
                      value={formData.totalCost}
                      onChange={(e) => handleTotalCostChange(e.target.value)}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3.5 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 font-bold text-amber-400"
                      required
                    />
                  </div>
                </div>

                {/* Unit Cost & Billing Month */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Rate / Liter (₹/L)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Auto computed"
                      value={formData.unitCostPerLiter}
                      onChange={(e) => handleUnitRateChange(e.target.value)}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary/50 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Billing Month</label>
                    <select
                      value={formData.billingMonth}
                      onChange={(e) => setFormData({ ...formData, billingMonth: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-semibold"
                    >
                      {(() => {
                        const currentYr = new Date().getFullYear();
                        const all12Months = [
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ].map(m => `${m} ${currentYr}`);

                        const monthSet = new Set(all12Months);
                        if (formData.billingMonth) monthSet.add(formData.billingMonth);

                        return Array.from(monthSet).map(m => (
                          <option
                            key={m}
                            value={m}
                            className="bg-slate-900 text-slate-100 font-semibold"
                            style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
                          >
                            {m}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* Date & Vendor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1.5">Vendor / Supplier Name</label>
                    <input
                      type="text"
                      placeholder="e.g. DJB Tanker Service"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Additional Notes / Invoice Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. Tanker #4 delivery receipt"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary/50"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-lighter transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 btn-next text-xs py-2.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Purchase Log'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
