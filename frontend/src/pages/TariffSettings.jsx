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
  });
  const [saved, setSaved] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Example preview values
  const [previewUsage, setPreviewUsage] = useState(8000);

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

  const withinLimit = limit > 0 ? Math.min(previewUsage, limit) : previewUsage;
  const excessLiters = limit > 0 && previewUsage > limit ? previewUsage - limit : 0;
  const baseCharge = withinLimit * base;
  const excessCharge = excessLiters * excess;
  const totalBill = baseCharge + excessCharge;

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
          Set monthly water usage limits and pricing tiers for your block. Rates auto-propagate to all residents.
        </p>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
              msg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

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

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl text-xs text-blue-800 dark:text-blue-300 shadow-sm transition-colors">
              <Info className="w-4.5 h-4.5 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <strong className="text-blue-900 dark:text-blue-200 font-bold">Auto-Propagation:</strong> Saving these settings will instantly update
                rates for all residents in your block. Existing bills are not affected — only future bills will use the new tariff.
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

          {/* Current Saved Settings */}
          {saved && (
            <div className="glass-card p-5 border border-emerald-500/20">
              <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Currently Active Tariff
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-surface-lighter rounded-xl p-3">
                  <p className="text-xs text-text-muted">Base Rate</p>
                  <p className="text-lg font-bold text-primary">₹{(saved.baseRatePerLiter || 0).toFixed(4)}</p>
                  <p className="text-[10px] text-text-muted">per liter</p>
                </div>
                <div className="bg-surface-lighter rounded-xl p-3">
                  <p className="text-xs text-text-muted">Monthly Limit</p>
                  <p className="text-lg font-bold text-amber-400">{(saved.monthlyLimitLiters || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-text-muted">liters/flat</p>
                </div>
                <div className="bg-surface-lighter rounded-xl p-3">
                  <p className="text-xs text-text-muted">Excess Rate</p>
                  <p className="text-lg font-bold text-red-400">₹{(saved.excessRatePerLiter || 0).toFixed(4)}</p>
                  <p className="text-[10px] text-text-muted">per liter</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Bill Preview */}
        <div className="lg:col-span-2">
          <div className="glass-card p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-text">Live Bill Preview</h3>
            </div>
            <p className="text-xs text-text-muted mb-3">Simulate how a bill is calculated with current settings.</p>

            <div className="mb-4">
              <label className="block text-xs text-text-muted mb-1.5 font-medium">Simulate Usage (Liters)</label>
              <input
                type="range"
                min="0"
                max={Math.max(20000, (limit || 6000) * 2)}
                step="100"
                value={previewUsage}
                onChange={e => setPreviewUsage(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-text-muted mt-1">
                <span>0 L</span>
                <span className="font-bold text-primary">{previewUsage.toLocaleString()} L</span>
                <span>{Math.max(20000, (limit || 6000) * 2).toLocaleString()} L</span>
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
                  <tr className="bg-primary/5 border-t-2 border-primary/20">
                    <td className="px-3 py-3 font-bold text-text">Total Bill</td>
                    <td className="px-3 py-3 text-right font-bold text-primary text-base">₹{totalBill.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {excessLiters > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-xs text-red-800 dark:text-red-400 flex items-start gap-2 shadow-sm transition-colors animate-pulse">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
                Usage exceeds monthly limit by {excessLiters.toLocaleString()} L. Excess charges apply.
              </div>
            )}

            {limit > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>Usage vs Limit</span>
                  <span>{Math.min(100, Math.round((previewUsage / limit) * 100))}%</span>
                </div>
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${excessLiters > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (previewUsage / limit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
