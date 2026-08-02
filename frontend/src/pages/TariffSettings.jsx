import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gauge, Zap, DollarSign, Save, RefreshCw,
  CheckCircle2, AlertTriangle, Info, TrendingUp, Lock
} from 'lucide-react';
import api from '../api';

export default function TariffSettings() {
  const role = localStorage.getItem('role');
  const isSuperAdmin = role === 'ROLE_ADMIN';
  const block = localStorage.getItem('block') || localStorage.getItem('apartmentBlock') || '';
  const username = localStorage.getItem('username') || '';

  const [tariff, setTariff] = useState({
    baseRatePerLiter: '',
    monthlyLimitLiters: '',
    excessRatePerLiter: '',
    lateFeePerMonth: '',
    gracePeriodDays: '',
  });
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Example preview values
  const [previewUsage, setPreviewUsage] = useState(8000);
  const [previewMonthsLate, setPreviewMonthsLate] = useState(0);

  useEffect(() => {
    fetchTariff();
  }, []);

  const fetchTariff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tariff', {
        params: { callerUsername: username, callerBlock: block }
      });
      setTariff({
        baseRatePerLiter: res.data.baseRatePerLiter || '',
        monthlyLimitLiters: res.data.monthlyLimitLiters || '',
        excessRatePerLiter: res.data.excessRatePerLiter || '',
        lateFeePerMonth: res.data.lateFeePerMonth || '',
        gracePeriodDays: res.data.gracePeriodDays || 20,
      });
      setSaved(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        monthlyLimitLiters: parseFloat(tariff.monthlyLimitLiters) || 0,
        excessRatePerLiter: parseFloat(tariff.excessRatePerLiter) || 0,
        lateFeePerMonth: parseFloat(tariff.lateFeePerMonth) || 0,
        gracePeriodDays: parseInt(tariff.gracePeriodDays, 10) || 20,
      };
      // Only Super Admin can send baseRatePerLiter
      if (isSuperAdmin) {
        payload.baseRatePerLiter = parseFloat(tariff.baseRatePerLiter) || 0;
      }
      await api.put('/tariff', payload, {
        params: { callerUsername: username, callerRole: role, callerBlock: block }
      });
      setMsg({ type: 'success', text: 'Tariff settings saved and propagated to all residents!' });
      await fetchTariff();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data || 'Failed to save tariff settings.' });
    } finally {
      setSaving(false);
    }
  };

  // Live preview calculation
  const base = parseFloat(tariff.baseRatePerLiter) || 0;
  const limit = parseFloat(tariff.monthlyLimitLiters) || 0;
  const excess = parseFloat(tariff.excessRatePerLiter) || 0;
  const lateFeeRate = parseFloat(tariff.lateFeePerMonth) || 0;

  const withinLimit = limit > 0 ? Math.min(previewUsage, limit) : previewUsage;
  const excessLiters = limit > 0 && previewUsage > limit ? previewUsage - limit : 0;
  const baseCharge = withinLimit * base;
  const excessCharge = excessLiters * excess;
  const waterSubtotal = baseCharge + excessCharge;
  const simLateFee = previewMonthsLate * lateFeeRate;
  const totalBill = waterSubtotal + simLateFee;

  const inputCls = "w-full bg-surface-lighter border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-text flex items-center gap-2">
          <Gauge className="w-6 h-6 text-primary" />
          Tariff Settings
        </h2>
        <p className="text-text-muted text-sm mt-1">
          Set monthly water usage limits, pricing tiers, and late payment fees for your block. Rates auto-propagate to all residents.
        </p>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-bold border shadow-xl ${
              msg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500 dark:text-emerald-400 backdrop-blur-md'
                : 'bg-red-500/15 border-red-500/35 text-red-500 dark:text-red-400 backdrop-blur-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
              }`}>
                {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-black text-base block">{msg.type === 'success' ? 'Tariff Updated Successfully!' : 'Update Error'}</span>
                <p className="text-xs font-semibold opacity-90">{msg.text}</p>
              </div>
            </div>
            <button 
              onClick={() => setMsg(null)}
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Currently Active Tariff & Rules Card (Moved to Top) */}
      {saved && (
        <div className="glass-card p-5 border border-emerald-500/20 shadow-md">
          <h4 className="text-sm font-bold text-emerald-500 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Currently Active Tariff & Rules
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-surface-lighter rounded-2xl p-3.5 border border-border/50">
              <p className="text-xs text-text-muted font-medium mb-1">Base Rate</p>
              <p className="text-lg font-black text-primary">₹{(saved.baseRatePerLiter || 0).toFixed(4)}</p>
              <p className="text-[10px] text-text-muted mt-0.5">per liter</p>
            </div>
            <div className="bg-surface-lighter rounded-2xl p-3.5 border border-border/50">
              <p className="text-xs text-text-muted font-medium mb-1">Monthly Limit</p>
              <p className="text-lg font-black text-amber-500 dark:text-amber-400">{(saved.monthlyLimitLiters || 0).toLocaleString()}</p>
              <p className="text-[10px] text-text-muted mt-0.5">liters/flat</p>
            </div>
            <div className="bg-surface-lighter rounded-2xl p-3.5 border border-border/50">
              <p className="text-xs text-text-muted font-medium mb-1">Excess Rate</p>
              <p className="text-lg font-black text-red-500 dark:text-red-400">₹{(saved.excessRatePerLiter || 0).toFixed(4)}</p>
              <p className="text-[10px] text-text-muted mt-0.5">per liter</p>
            </div>
            <div className="bg-surface-lighter rounded-2xl p-3.5 border border-border/50">
              <p className="text-xs text-text-muted font-medium mb-1">Late Fee</p>
              <p className="text-lg font-black text-rose-500 dark:text-rose-400">₹{(saved.lateFeePerMonth || 0).toFixed(2)}</p>
              <p className="text-[10px] text-text-muted mt-0.5">per month</p>
            </div>
            <div className="bg-surface-lighter rounded-2xl p-3.5 border border-border/50">
              <p className="text-xs text-text-muted font-medium mb-1">Grace Period</p>
              <p className="text-lg font-black text-cyan-500 dark:text-cyan-400">{saved.gracePeriodDays || 20} Days</p>
              <p className="text-[10px] text-text-muted mt-0.5">due window</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-3 space-y-5">
          <div className="glass-card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-text">Rate Configuration</h3>
            </div>

            {/* Base Rate — locked for Community Admins */}
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5 flex items-center gap-2">
                Base Water Rate (₹/Liter)
                {!isSuperAdmin && (
                  <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 border border-amber-500/25 text-amber-400 rounded-full px-2 py-0.5 font-bold">
                    <Lock className="w-2.5 h-2.5" /> Set by Super Admin
                  </span>
                )}
                {isSuperAdmin && (
                  <span className="text-xs font-normal text-blue-400">Charged on all usage within monthly limit</span>
                )}
              </label>
              {isSuperAdmin ? (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={tariff.baseRatePerLiter}
                    onChange={e => setTariff(p => ({ ...p, baseRatePerLiter: e.target.value }))}
                    className={inputCls + ' pl-8'}
                    placeholder="e.g. 0.0050"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-surface-lighter/50 border border-border/50 rounded-xl px-4 py-3">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex-1">
                    <span className="text-text font-semibold text-sm">
                      ₹{parseFloat(tariff.baseRatePerLiter || 0).toFixed(4)} / Liter
                    </span>
                    <p className="text-[11px] text-text-muted mt-0.5">Only the Super Admin can modify the base water rate.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Monthly Limit */}
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">
                Monthly Usage Limit per Flat (Liters)
                <span className="ml-2 text-xs font-normal text-amber-400">Usage above this triggers excess rate</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">L</span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={tariff.monthlyLimitLiters}
                  onChange={e => setTariff(p => ({ ...p, monthlyLimitLiters: e.target.value }))}
                  className={inputCls + ' pl-8'}
                  placeholder="e.g. 6000"
                />
              </div>
            </div>

            {/* Excess Rate */}
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">
                Excess Rate (₹/Liter above limit)
                <span className="ml-2 text-xs font-normal text-red-400">Higher rate charged on excess consumption</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-sm">₹</span>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={tariff.excessRatePerLiter}
                  onChange={e => setTariff(p => ({ ...p, excessRatePerLiter: e.target.value }))}
                  className={inputCls + ' pl-8'}
                  placeholder="e.g. 0.0120"
                />
              </div>
            </div>

            {/* Late Fee per Overdue Month */}
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">
                Late Fee per Overdue Month (₹/Month)
                <span className="ml-2 text-xs font-normal text-rose-400">Accrued monthly for bills past due date</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-sm">₹</span>
                <input
                  type="number"
                  step="5"
                  min="0"
                  value={tariff.lateFeePerMonth}
                  onChange={e => setTariff(p => ({ ...p, lateFeePerMonth: e.target.value }))}
                  className={inputCls + ' pl-8'}
                  placeholder="e.g. 50"
                />
              </div>
            </div>

            {/* Grace Period (Days) */}
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">
                Grace Period Duration (Days)
                <span className="ml-2 text-xs font-normal text-cyan-400">Days allowed after bill generation before due date & late fee accrual</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="90"
                  value={tariff.gracePeriodDays}
                  onChange={e => setTariff(p => ({ ...p, gracePeriodDays: e.target.value }))}
                  className={inputCls}
                  placeholder="Default: 20 days"
                />
              </div>
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl text-xs text-blue-800 dark:text-blue-300 shadow-sm transition-colors">
              <Info className="w-4.5 h-4.5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <strong className="text-blue-900 dark:text-blue-200 font-bold">Auto-Propagation:</strong> Saving these settings will instantly update
                rates, grace period duration, and late fee policies for all residents in your block.
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving & Propagating...' : 'Save Tariff Settings'}
            </button>
          </div>
        </div>

        {/* Live Bill Preview */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-text">Live Bill Preview</h3>
            </div>
            <p className="text-xs text-text-muted mb-3">Simulate how a bill & late fee accrue with current settings.</p>

            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Simulate Usage (Liters)</label>
                <input
                  type="range"
                  min="0"
                  max={Math.max(20000, (limit || 6000) * 2)}
                  step="100"
                  value={previewUsage}
                  onChange={e => setPreviewUsage(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <div className="flex justify-between text-xs text-text-muted mt-0.5">
                  <span>0 L</span>
                  <span className="font-bold text-primary">{previewUsage.toLocaleString()} L</span>
                  <span>{Math.max(20000, (limit || 6000) * 2).toLocaleString()} L</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">Simulate Months Overdue</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 1, 2, 3].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPreviewMonthsLate(m)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        previewMonthsLate === m
                          ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                          : 'bg-surface-lighter text-text-muted border-border hover:bg-surface'
                      }`}
                    >
                      {m === 0 ? 'On Time' : `${m} Mo Late`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculation Table */}
            <div className="bg-surface-lighter rounded-xl overflow-hidden border border-border/50 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary/10 border-b border-border/50">
                    <th className="text-left px-3 py-2.5 text-primary font-bold uppercase tracking-wider text-[10px]">Component</th>
                    <th className="text-right px-3 py-2.5 text-primary font-bold uppercase tracking-wider text-[10px]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="px-3 py-2.5 text-text-muted">
                      <div className="font-medium text-text">Within-Limit Usage</div>
                      <div className="text-[10px] text-text-muted">{withinLimit.toLocaleString()} L × ₹{base.toFixed(4)}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-400">
                      ₹{baseCharge.toFixed(2)}
                    </td>
                  </tr>
                  {excessLiters > 0 ? (
                    <tr className="bg-red-50/30 dark:bg-red-500/5">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-red-700 dark:text-red-400 font-bold">Excess Consumption ⚠️</div>
                        <div className="text-[10px] text-red-600/80 dark:text-red-400/70">{excessLiters.toLocaleString()} L × ₹{excess.toFixed(4)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-red-700 dark:text-red-400">
                        +₹{excessCharge.toFixed(2)}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td className="px-3 py-2.5 text-text-muted">
                        <div>Excess Consumption</div>
                        <div className="text-[10px] text-emerald-400 font-semibold">Within limit ✓</div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-text-muted">₹0.00</td>
                    </tr>
                  )}

                  {previewMonthsLate > 0 && (
                    <tr className="bg-rose-50/40 dark:bg-rose-500/10">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-rose-600 dark:text-rose-400">Late Fee Accrual ⏰</div>
                        <div className="text-[10px] text-rose-500/80">{previewMonthsLate} Month(s) Overdue × ₹{lateFeeRate.toFixed(2)}/mo</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">
                        +₹{simLateFee.toFixed(2)}
                      </td>
                    </tr>
                  )}

                  <tr className="bg-primary/5 border-t-2 border-primary/20">
                    <td className="px-3 py-3 font-bold text-text">Total Bill Payable</td>
                    <td className="px-3 py-3 text-right font-bold text-primary text-base">₹{totalBill.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {previewMonthsLate > 0 && (
              <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs text-rose-800 dark:text-rose-400 flex items-start gap-2 shadow-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                Overdue by {previewMonthsLate} month(s). Accrued late fee penalty of ₹{simLateFee.toFixed(2)} added.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
