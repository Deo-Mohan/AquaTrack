import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplet, Receipt, Trash2, Edit2, CheckCircle2, Clock,
  Search, X, ChevronDown, ChevronUp, Loader2, AlertCircle, QrCode
} from 'lucide-react';
import api from '../api';

export default function WaterBillingHistory() {
  const role  = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';
  const block = localStorage.getItem('apartmentBlock') || '';
  const isSuperAdmin = role === 'ROLE_ADMIN';

  const [activeTab,  setActiveTab]  = useState('usage');   // 'usage' | 'billing'
  const [usageLogs,  setUsageLogs]  = useState([]);
  const [bills,      setBills]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [searchQ,    setSearchQ]    = useState('');
  const [sortDir,    setSortDir]    = useState('desc');
  const [statusMsg,  setStatusMsg]  = useState(null);
  const [payQrModalBill, setPayQrModalBill] = useState(null); // Bill to collect via QR
  const [editingLog, setEditingLog] = useState(null); // Log to edit

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [logRes, billRes] = await Promise.all([
        isSuperAdmin ? api.get('/usage/all') : api.get(`/usage/block/${block}`),
        isSuperAdmin ? api.get('/bills/all')  : api.get(`/bills/block/${block}`),
      ]);
      setUsageLogs(logRes.data || []);
      setBills(billRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const flash = (msg, type = 'success') => {
    setStatusMsg({ msg, type });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // ── Delete usage log ────────────────────────────────────────────
  const deleteLog = async (id) => {
    if (!window.confirm('Delete this usage log?')) return;
    const u = localStorage.getItem('username');
    try {
      await api.delete(`/usage/${id}`, { params: { callerRole: role, username: u } });
      flash('Usage log deleted.');
      fetchAll();
    } catch (e) { flash(e?.response?.data?.message || 'Failed to delete.', 'error'); }
  };

  // ── Edit usage log ──────────────────────────────────────────────
  const handleSaveEditLog = async (e) => {
    e.preventDefault();
    if (!editingLog) return;
    const u = localStorage.getItem('username');
    try {
      await api.put(`/usage/${editingLog.id}`, {
        readingLiters: parseFloat(editingLog.readingLiters),
        readingDate: editingLog.readingDate,
        logType: editingLog.logType
      }, {
        params: { username: u, callerRole: role }
      });
      flash('Usage log updated successfully.');
      setEditingLog(null);
      fetchAll();
    } catch (err) {
      flash(err?.response?.data?.message || 'Failed to update usage log.', 'error');
    }
  };

  // ── Mark bill paid ──────────────────────────────────────────────
  const markPaid = async (billId) => {
    try {
      await api.post(`/bills/${billId}/mark-paid`);
      flash('Bill marked as PAID.');
      fetchAll();
    } catch (e) { flash(e?.response?.data?.message || 'Failed to mark paid.', 'error'); }
  };

  const deleteBill = async (id) => {
    if (!window.confirm('Delete this bill?')) return;
    try {
      await api.delete(`/bills/${id}`);
      flash('Bill deleted.');
      fetchAll();
    } catch (e) {
      // Backend returns plain strings for errors, not JSON objects
      const errMsg = typeof e?.response?.data === 'string'
        ? e.response.data
        : e?.response?.data?.message || 'Failed to delete bill.';
      flash(errMsg, 'error');
    }
  };

  // ── Filter helpers ──────────────────────────────────────────────
  const q = searchQ.trim().toLowerCase();

  const filteredLogs = [...usageLogs]
    .filter(l => !q || [l.houseNumber, l.apartmentBlock, l.logType, String(l.readingLiters)]
      .some(v => v && String(v).toLowerCase().includes(q)))
    .sort((a, b) => sortDir === 'desc'
      ? new Date(b.readingDate) - new Date(a.readingDate)
      : new Date(a.readingDate) - new Date(b.readingDate));

  const filteredBills = [...bills]
    .filter(b => !q || [b.houseNumber, b.apartmentBlock, b.status, String(b.amount)]
      .some(v => v && String(v).toLowerCase().includes(q)))
    .sort((a, b) => sortDir === 'desc'
      ? new Date(b.generatedDate || b.createdAt) - new Date(a.generatedDate || a.createdAt)
      : new Date(a.generatedDate || a.createdAt) - new Date(b.generatedDate || b.createdAt));

  const statusColor = (s) => {
    if (!s) return 'text-text-muted';
    if (s === 'PAID')    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (s === 'UNPAID')  return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (s === 'OVERDUE') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  };

  const logTypeColor = (t) => {
    if (t === 'DAILY')   return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (t === 'WEEKLY')  return 'text-violet-400 bg-violet-500/10 border-violet-500/20';
    if (t === 'MONTHLY') return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    return 'text-text-muted bg-surface-lighter border-border';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Water & Billing History</h1>
        <p className="text-text-muted mt-1">Full audit trail of meter readings and generated bills.</p>
      </div>

      {/* Status flash */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {statusMsg.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab Switcher ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-surface-lighter border border-border p-1 rounded-xl w-fit">
        {[
          { id: 'usage',   label: 'Water Usage Logs', icon: Droplet,  count: filteredLogs.length },
          { id: 'billing', label: 'Billing Records',   icon: Receipt,  count: filteredBills.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-surface text-text shadow-sm border border-border'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-surface-lighter text-text-muted'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder={activeTab === 'usage' ? 'Search by house, block, liters…' : 'Search by house, amount, status…'}
            className="w-full bg-surface border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-primary/60 transition-all"
          />
          {searchQ && (
            <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-muted hover:text-text transition-all cursor-pointer"
        >
          {sortDir === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>

        <button onClick={fetchAll} className="px-3 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-medium hover:bg-primary/20 transition-all cursor-pointer">
          Refresh
        </button>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'usage' && (
            <motion.div key="usage" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-20 text-text-muted">
                  <Droplet className="w-14 h-14 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No usage logs found</p>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-lighter/50">
                          {['House #', 'Block', 'Reading (L)', 'Type', 'Date', 'Actions'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-surface-lighter/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-text">{log.houseNumber}</td>
                            <td className="px-4 py-3 text-text-muted">{log.apartmentBlock}</td>
                            <td className="px-4 py-3 font-bold text-blue-400">{log.readingLiters} L</td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${logTypeColor(log.logType)}`}>
                                {log.logType || 'DAILY'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                              {log.readingDate ? new Date(log.readingDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingLog(log)}
                                  className="p-1.5 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Edit log"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteLog(log.id)}
                                  className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Delete log"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-border text-xs text-text-muted">
                    {filteredLogs.length} records · Total: {filteredLogs.reduce((s, l) => s + (l.readingLiters || 0), 0).toLocaleString()} L
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div key="billing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {filteredBills.length === 0 ? (
                <div className="text-center py-20 text-text-muted">
                  <Receipt className="w-14 h-14 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No bills found</p>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-lighter/50">
                          {['House #', 'Block', 'Amount', 'Status', 'Due Date', 'Generated', 'Actions'].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredBills.map(bill => (
                          <tr key={bill.id} className="hover:bg-surface-lighter/30 transition-colors">
                            <td className="px-4 py-3 font-semibold text-text">{bill.houseNumber}</td>
                            <td className="px-4 py-3 text-text-muted">{bill.apartmentBlock}</td>
                            <td className="px-4 py-3 font-bold text-emerald-400">₹{bill.amount}</td>
                            <td className="px-4 py-3">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColor(bill.status)}`}>
                                {bill.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                              {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                              {bill.generatedDate ? new Date(bill.generatedDate).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {bill.status !== 'PAID' && (
                                  <>
                                    <button
                                      onClick={() => setPayQrModalBill(bill)}
                                      className="p-1.5 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                                      title="Collect Payment"
                                    >
                                      <QrCode className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => markPaid(bill.id)}
                                      className="p-1.5 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                                      title="Mark as Paid"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {bill.status !== 'PAID' && (
                                  <button
                                    onClick={() => deleteBill(bill.id)}
                                    className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                    title="Delete bill"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                                {bill.status === 'PAID' && (
                                  <span
                                    className="p-1.5 text-text-muted/30 cursor-not-allowed"
                                    title="Paid bills are protected and cannot be deleted"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                    <span>{filteredBills.length} bills</span>
                    <span>
                      Paid: {filteredBills.filter(b => b.status === 'PAID').length} ·
                      Unpaid: {filteredBills.filter(b => b.status === 'UNPAID').length} ·
                      Total: ₹{filteredBills.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* QR Pay Modal */}
      {payQrModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-center">
            <button onClick={() => setPayQrModalBill(null)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-text mb-1">Collect Payment</h3>
            <p className="text-text-muted text-xs mb-4">Show this QR to the resident for UPI payment, or collect cash.</p>
            <div className="bg-white p-4 rounded-xl mx-auto w-fit mb-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`AquaTrack Bill|ID:${payQrModalBill.id}|House:${payQrModalBill.houseNumber}|Amount:${payQrModalBill.amount}|Due:${payQrModalBill.dueDate}`)}`}
                alt="Payment QR Code"
                className="w-44 h-44"
              />
            </div>
            <div className="bg-surface-lighter rounded-xl p-3 text-left mb-5 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-text-muted">House</span><span className="font-semibold text-text">{payQrModalBill.houseNumber}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Amount</span><span className="font-bold text-emerald-400">₹{payQrModalBill.amount}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Due Date</span><span className="font-semibold text-text">{payQrModalBill.dueDate}</span></div>
              <div className="flex justify-between"><span className="text-text-muted">Status</span><span className="text-amber-400 font-semibold">{payQrModalBill.status}</span></div>
            </div>
            <button
              onClick={async () => {
                await markPaid(payQrModalBill.id);
                setPayQrModalBill(null);
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all cursor-pointer"
            >
              ✅ Confirm Cash/Offline Payment
            </button>
            <p className="text-xs text-text-muted mt-3">Clicking confirm will mark this bill as PAID in the system and notify the resident.</p>
          </motion.div>
        </div>
      )}

      {/* Edit Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => setEditingLog(null)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Edit2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-text mb-1">Edit Water Usage Log</h3>
            <p className="text-text-muted text-xs mb-4">Update consumption details for House #{editingLog.houseNumber}.</p>
            
            <form onSubmit={handleSaveEditLog} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Reading (Liters)</label>
                <input
                  type="number" min="0" step="0.1" required
                  value={editingLog.readingLiters || ''}
                  onChange={e => setEditingLog({ ...editingLog, readingLiters: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 transition-all font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Reading Date</label>
                <input
                  type="date" required
                  value={editingLog.readingDate ? (typeof editingLog.readingDate === 'string' ? editingLog.readingDate.split('T')[0] : editingLog.readingDate) : ''}
                  onChange={e => setEditingLog({ ...editingLog, readingDate: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Log Period</label>
                <select
                  value={editingLog.logType || 'DAILY'}
                  onChange={e => setEditingLog({ ...editingLog, logType: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer"
                >
                  <option value="DAILY">DAILY</option>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MONTHLY">MONTHLY</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditingLog(null)} className="px-4 py-2 bg-surface border border-border text-text hover:bg-surface-lighter rounded-xl text-sm font-semibold transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-white hover:bg-primary/95 rounded-xl text-sm font-bold transition-colors cursor-pointer">Save Changes</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
