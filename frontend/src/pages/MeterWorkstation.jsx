import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Droplet, Receipt, User, Home, Hash, CheckCircle2,
  AlertCircle, Loader2, X, ChevronRight, Zap, Calendar, Info, FileText, Plus,
  Send, Activity
} from 'lucide-react';
import api from '../api';

const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
};

const fuzzy = (q, t) => {
  q = q.toLowerCase(); t = t.toLowerCase();
  if (t.includes(q)) return true;
  if (q.length <= 3) return t.startsWith(q);
  return levenshtein(q, t) <= 2;
};

export default function MeterWorkstation() {
  const role  = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';
  const block = localStorage.getItem('apartmentBlock') || '';
  const isSuperAdmin = role === 'ROLE_ADMIN';

  // Navigation Tab
  const [activeTab, setActiveTab] = useState('workstation'); // workstation, cycles, reminders

  // Data
  const [users,     setUsers]     = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [bills,     setBills]     = useState([]);
  const [adminRate, setAdminRate] = useState(null);

  // Billing Cycles & Reminders state
  const [billingCycles, setBillingCycles] = useState([]);
  const [billingCycleModalOpen, setBillingCycleModalOpen] = useState(false);
  const [apartments, setApartments] = useState([]);
  const [billingCycleForm, setBillingCycleForm] = useState({
    cycleName: '',
    startDate: '',
    endDate: '',
    apartmentId: '',
    apartmentBlock: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState(null); // Tab-specific status alerts

  // Search
  const [query,       setQuery]       = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAllDropdown, setShowAllDropdown] = useState(false);
  const [selected,    setSelected]    = useState(null);
  const searchRef = useRef(null);
  const allDropdownRef = useRef(null);

  // Log form
  const [logForm,    setLogForm]    = useState({ readingLiters: '', readingDate: new Date().toISOString().split('T')[0], logType: 'DAILY' });
  const [logStatus,  setLogStatus]  = useState(null); // { type:'success'|'error', msg }
  const [logLoading, setLogLoading] = useState(false);

  // Bill form
  const [billForm,    setBillForm]    = useState({ amount: '', dueDate: new Date(Date.now() + 15*86400000).toISOString().split('T')[0], status: 'UNPAID', billingCycleId: 1 });
  const [billCalc,    setBillCalc]    = useState(null);
  const [billStatus,  setBillStatus]  = useState(null);
  const [billLoading, setBillLoading] = useState(false);

  // Bulk Billing
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress,   setBulkProgress]   = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkList,        setBulkList]        = useState([]);
  const [tariffSettings,  setTariffSettings]  = useState(null);

  // ── Load data ───────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchAll();
    fetchBillingCycles();
    fetchApartments();
  }, []);

  const fetchAll = async () => {
    try {
      const [uRes, logRes, billRes] = await Promise.all([
        api.get('/admin/users', { params: { callerRole: role, callerBlock: block } }),
        isSuperAdmin ? api.get('/usage/all') : api.get(`/usage/block/${block}`),
        isSuperAdmin ? api.get('/bills/all') : api.get(`/bills/block/${block}`)
      ]);
      setUsers(uRes.data || []);
      setUsageLogs(logRes.data || []);
      setBills(billRes.data || []);
    } catch (e) { console.error(e); }

    try {
      const u = localStorage.getItem('username');
      const tRes = await api.get('/tariff', {
        params: { callerUsername: u, callerBlock: block }
      });
      setTariffSettings(tRes.data);
    } catch (e) {
      console.error("Failed to fetch tariff settings:", e);
    }

    if (!isSuperAdmin) {
      try {
        const u = localStorage.getItem('username');
        const r = await api.get(`/users/profile/${u}`);
        if (r.data?.waterRatePerLiter != null) setAdminRate(r.data.waterRatePerLiter);
      } catch (e) {}
    }
  };

  // ── Billing Cycles & Reminders Functions ───────────────────────
  const fetchBillingCycles = async () => {
    try {
      const res = await api.get('/billing-cycles');
      setBillingCycles(res.data || []);
    } catch (err) {
      console.error("Error fetching billing cycles", err);
    }
  };

  const fetchApartments = async () => {
    try {
      const res = await api.get('/public/colonies');
      const mapped = (res.data || []).map(col => ({
        id: col.id,
        name: col.colonyName,
        address: col.address || '',
        buildings: col.buildings || []
      }));
      setApartments(mapped || []);
    } catch (err) {
      console.error("Error fetching apartments", err);
    }
  };

  const getApartmentName = (id) => {
    const apt = apartments.find(a => a.id === id);
    return apt ? apt.name : `Colony ID: ${id}`;
  };

  const handleCreateBillingCycle = async (e) => {
    e.preventDefault();
    setActionLoading(true); setActionStatus(null);
    try {
      await api.post('/billing-cycles', {
        cycleName: billingCycleForm.cycleName,
        startDate: billingCycleForm.startDate,
        endDate: billingCycleForm.endDate,
        apartmentId: parseInt(billingCycleForm.apartmentId),
        apartmentBlock: billingCycleForm.apartmentBlock || null
      });
      setActionStatus({ type: 'success', msg: `✅ Billing cycle "${billingCycleForm.cycleName}" created successfully.` });
      setBillingCycleModalOpen(false);
      fetchBillingCycles();
    } catch (err) {
      console.error(err);
      setActionStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to create billing cycle.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeCycle = async (cycleId) => {
    if (!window.confirm("Are you sure you want to finalize this billing cycle? This will calculate consumption and generate bills for all households in the scope of this cycle.")) return;
    setActionLoading(true); setActionStatus(null);
    try {
      const res = await api.post(`/billing-cycles/${cycleId}/finalize`);
      setActionStatus({ type: 'success', msg: `✅ ${res.data || 'Billing cycle finalized successfully.'}` });
      fetchBillingCycles();
      fetchAll(); // refresh billing/logs data
    } catch (err) {
      console.error(err);
      setActionStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to finalize billing cycle.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveCycle = async (cycleId) => {
    setActionLoading(true); setActionStatus(null);
    try {
      await api.post(`/billing-cycles/${cycleId}/archive`);
      setActionStatus({ type: 'success', msg: '✅ Billing cycle archived successfully.' });
      fetchBillingCycles();
    } catch (err) {
      console.error(err);
      setActionStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to archive billing cycle.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleScanAlertAdmins = async () => {
    setActionLoading(true); setActionStatus(null);
    try {
      await api.post('/bills/reminders/check');
      setActionStatus({ type: 'success', msg: '✅ Global scan completed. Community admins have been alerted.' });
      fetchAll();
    } catch (err) {
      setActionStatus({ type: 'error', msg: 'Failed to scan and alert admins.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendAllReminders = async () => {
    setActionLoading(true); setActionStatus(null);
    try {
      const targetBlock = isSuperAdmin ? '' : block;
      await api.post(`/bills/reminders/send-all?apartmentBlock=${encodeURIComponent(targetBlock)}`);
      setActionStatus({ type: 'success', msg: `✅ Dispatched payment reminders to all unpaid households in ${targetBlock || 'all blocks'}!` });
      fetchAll();
    } catch (err) {
      setActionStatus({ type: 'error', msg: 'Failed to send reminders to all.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendIndividualReminder = async (houseNo, aptBlk) => {
    setActionLoading(true); setActionStatus(null);
    try {
      await api.post(`/bills/reminders/send?houseNumber=${encodeURIComponent(houseNo)}&apartmentBlock=${encodeURIComponent(aptBlk)}`);
      setActionStatus({ type: 'success', msg: `✅ Reminder notice dispatched to resident of ${houseNo} (${aptBlk})!` });
      fetchAll();
    } catch (err) {
      setActionStatus({ type: 'error', msg: 'Failed to send individual reminder.' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Fuzzy resident search ────────────────────────────────────────
  const residents = users.filter(u => u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER');

  const matched = query.trim().length === 0 ? [] : residents.filter(u =>
    [u.fullName, u.username, u.houseNumber, u.meterId, u.meterNumber, u.email, u.mobileNumber]
      .filter(Boolean)
      .some(f => fuzzy(query.trim(), String(f)))
  ).slice(0, 8);

  // ── Select resident ──────────────────────────────────────────────
  const selectResident = (u) => {
    setSelected(u);
    setQuery(u.fullName || u.username);
    setShowDropdown(false);
    setShowAllDropdown(false);
    setLogStatus(null);
    setBillStatus(null);
    setLogForm(f => ({ ...f, readingLiters: '' }));
    computeBillCalc(u);
  };

  const computeBillCalc = (u) => {
    if (!u) { setBillCalc(null); return; }
    const houseBills = bills.filter(b => b.houseNumber === u.houseNumber);
    const latestBill = houseBills.sort((a,b) => new Date(b.generatedDate) - new Date(a.generatedDate))[0] || null;
    const latestDate = latestBill ? new Date(latestBill.generatedDate) : null;
    const unbilled = usageLogs.filter(l => l.houseNumber === u.houseNumber && (!latestDate || new Date(l.readingDate) > latestDate));
    const totalL = unbilled.reduce((s, l) => s + (l.readingLiters || 0), 0);

    const baseRate = tariffSettings ? parseFloat(tariffSettings.baseRatePerLiter) : 0;
    const limit = tariffSettings ? parseFloat(tariffSettings.monthlyLimitLiters) : 10000;
    const excessRate = tariffSettings ? parseFloat(tariffSettings.excessRatePerLiter) : 0;

    const withinLimit = Math.min(totalL, limit);
    const overused = Math.max(0, totalL - limit);
    const amount = ((withinLimit * baseRate) + (overused * excessRate)).toFixed(2);

    setBillCalc({
      totalL,
      baseRate,
      limit,
      excessRate,
      withinLimit,
      overused,
      amount,
      unbilled,
      lastBillDate: latestBill?.generatedDate || 'None',
      baseRateNotSet: !baseRate || baseRate <= 0
    });
    
    setBillForm(f => ({ ...f, amount, houseNumber: u.houseNumber, apartmentBlock: u.apartmentBlock }));
  };

  // Re-compute bill whenever logs/bills change and resident is selected
  useEffect(() => { if (selected) computeBillCalc(selected); }, [usageLogs, bills, tariffSettings]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
      if (allDropdownRef.current && !allDropdownRef.current.contains(e.target)) setShowAllDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Submit water log ─────────────────────────────────────────────
  const submitLog = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setLogLoading(true); setLogStatus(null);
    try {
      await api.post('/usage/log', {
        houseNumber: selected.houseNumber,
        apartmentBlock: selected.apartmentBlock,
        readingDate: logForm.readingDate,
        readingLiters: parseFloat(logForm.readingLiters),
        logType: logForm.logType
      }, { params: { callerRole: role } });
      setLogStatus({ type: 'success', msg: `✅ ${logForm.readingLiters}L logged for ${selected.fullName || selected.username}` });
      setLogForm(f => ({ ...f, readingLiters: '' }));
      await fetchAll();
    } catch (err) {
      setLogStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to submit log.' });
    } finally { setLogLoading(false); }
  };

  // ── Generate bill ────────────────────────────────────────────────
  const submitBill = async (e) => {
    e.preventDefault();
    if (!selected || !billCalc) return;
    setBillLoading(true); setBillStatus(null);
    try {
      await api.post('/bills/create', {
        houseNumber: selected.houseNumber,
        apartmentBlock: selected.apartmentBlock,
        amount: parseFloat(billForm.amount),
        dueDate: billForm.dueDate,
        status: 'UNPAID',
        billingCycleId: billForm.billingCycleId
      }, { params: { callerRole: role } });
      setBillStatus({ type: 'success', msg: `✅ Bill of ₹${billForm.amount} generated for ${selected.fullName || selected.username}` });
      await fetchAll();
    } catch (err) {
      setBillStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to generate bill.' });
    } finally { setBillLoading(false); }
  };

  // ── Bulk Generate Bills ──────────────────────────────────────────
  const handleGenerateAllBills = () => {
    const toBill = [];
    const baseRate = tariffSettings ? parseFloat(tariffSettings.baseRatePerLiter) : 0;
    const limit = tariffSettings ? parseFloat(tariffSettings.monthlyLimitLiters) : 10000;
    const excessRate = tariffSettings ? parseFloat(tariffSettings.excessRatePerLiter) : 0;

    for (const u of residents) {
      const houseBills = bills.filter(b => b.houseNumber === u.houseNumber);
      const latestBill = houseBills.sort((a,b) => new Date(b.generatedDate) - new Date(a.generatedDate))[0] || null;
      const latestDate = latestBill ? new Date(latestBill.generatedDate) : null;
      const unbilled = usageLogs.filter(l => l.houseNumber === u.houseNumber && (!latestDate || new Date(l.readingDate) > latestDate));
      const totalL = unbilled.reduce((s, l) => s + (l.readingLiters || 0), 0);
      
      if (totalL > 0) {
        const withinLimit = Math.min(totalL, limit);
        const overused = Math.max(0, totalL - limit);
        const amount = parseFloat(((withinLimit * baseRate) + (overused * excessRate)).toFixed(2));

        toBill.push({
          resident: u,
          totalL,
          withinLimit,
          overused,
          baseRate,
          tariffRate: excessRate,
          amount
        });
      }
    }

    if (toBill.length === 0) {
      alert("No residents have unbilled water logs currently.");
      return;
    }

    setBulkList(toBill);
    setShowBulkPreview(true);
  };

  const executeBulkGeneration = async () => {
    if (bulkList.length === 0) return;
    
    setShowBulkPreview(false);
    setBulkGenerating(true);
    setBulkProgress({ current: 0, total: bulkList.length, success: 0, failed: 0 });

    const defaultDueDate = new Date(Date.now() + 15*86400000).toISOString().split('T')[0];

    for (let i = 0; i < bulkList.length; i++) {
      const item = bulkList[i];
      try {
        await api.post(`/bills/create?callerRole=${role}`, {
          houseNumber: item.resident.houseNumber,
          apartmentBlock: item.resident.apartmentBlock,
          amount: item.amount,
          dueDate: defaultDueDate,
          status: 'UNPAID',
          billingCycleId: 1
        });
        setBulkProgress(prev => ({ ...prev, current: i + 1, success: prev.success + 1 }));
      } catch (err) {
        console.error(`Failed to generate bill for ${item.resident.houseNumber}:`, err);
        setBulkProgress(prev => ({ ...prev, current: i + 1, failed: prev.failed + 1 }));
      }
    }

    setBulkGenerating(false);
    alert("Bulk bill generation completed.");
    fetchAll();
  };

  // ── CSV Bulk Operations ─────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const targetBlock = isSuperAdmin ? '' : block;
      const response = await api.get('/usage/template', {
        params: { apartmentBlock: targetBlock },
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'water_usage_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setLogStatus({ type: 'success', msg: 'Prefilled CSV template downloaded successfully!' });
    } catch (err) {
      console.error(err);
      setLogStatus({ type: 'error', msg: 'Failed to download CSV template.' });
    }
  };

  const handleUploadCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLogLoading(true);
    try {
      const res = await api.post(`/usage/upload-csv?callerRole=${role}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLogStatus({ type: 'success', msg: res.data });
      fetchAll();
    } catch (err) {
      console.error(err);
      setLogStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to upload CSV logs.' });
    } finally {
      setLogLoading(false);
      e.target.value = '';
    }
  };

  // ── Resident Card ────────────────────────────────────────────────
  const ResidentCard = ({ u, onClick }) => (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(u); }}
      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary/8 transition-colors text-left cursor-pointer border-b border-border/30 last:border-0"
    >
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{u.fullName || u.username}</p>
        <p className="text-xs text-text-muted truncate">
          House #{u.houseNumber} · {u.apartmentBlock}
          {u.meterId || u.meterNumber ? ` · Meter: ${u.meterId || u.meterNumber}` : ''}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
    </button>
  );

  const StatusBanner = ({ status }) => status ? (
    <motion.div
      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border ${
        status.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}
    >
      {status.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {status.msg}
    </motion.div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Meter Workstation</h1>
        <p className="text-text-muted mt-1">Manage readings, run billing cycles, and track reminders — all in one centralized console.</p>
      </div>

      {/* ── Sub-Tab Switcher ─────────────────────────────────────── */}
      <div className="flex gap-4 border-b border-border pb-4">
        {[
          { id: 'workstation', label: 'Workstation', icon: Droplet },
          { id: 'cycles', label: 'Billing Cycles & Periods', icon: Calendar },
          { id: 'reminders', label: 'Payment Reminders 🔔', icon: Zap }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setActionStatus(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md shadow-primary/15'
                  : 'text-text-muted hover:text-text bg-surface-lighter/50 border border-border/40'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab-Specific Action Status Alerts */}
      {actionStatus && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between gap-2 px-4 py-3.5 rounded-xl text-sm font-medium border ${
            actionStatus.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {actionStatus.msg}
          </div>
          <button onClick={() => setActionStatus(null)} className="text-text-muted hover:text-text cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* ── WORKSTATION TAB CONTENT ─────────────────────────────── */}
      {activeTab === 'workstation' && (
        <motion.div
          key="workstation"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 glass-card p-5">
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" /> Download CSV Template
              </button>
              <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer">
                <Plus className="w-4 h-4" /> Upload CSV Logs
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleUploadCsv}
                  className="hidden"
                />
              </label>
            </div>
            <button
              onClick={handleGenerateAllBills}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-650 hover:from-blue-650 hover:to-indigo-800 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4" /> Generate Bills for All
            </button>
          </div>

          {/* Resident Search & Browse */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div ref={searchRef} className="relative flex-1">
              <div className={`flex items-center gap-3 px-4 py-3.5 bg-surface-lighter/60 border border-border/80 rounded-2xl transition-all ${showDropdown || selected ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border'} hover:border-primary/40`}>
                <Search className="w-5 h-5 text-primary flex-shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setShowDropdown(true); if (!e.target.value) { setSelected(null); setBillCalc(null); } }}
                  onFocus={() => query && setShowDropdown(true)}
                  placeholder="Search resident by name, house number, username..."
                  className="flex-1 bg-transparent text-text placeholder-text-muted text-sm focus:outline-none"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setSelected(null); setBillCalc(null); setShowDropdown(false); }} className="text-text-muted hover:text-text cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              <AnimatePresence>
                {showDropdown && matched.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
                      <p className="text-xs font-medium text-text-muted">Select a resident</p>
                      <span className="text-xs text-primary font-semibold">{matched.length} found</span>
                    </div>
                    {matched.map(u => <ResidentCard key={u.id || u.username} u={u} onClick={selectResident} />)}
                  </motion.div>
                )}
                {showDropdown && query.trim().length > 0 && matched.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-2xl shadow-xl z-50 px-4 py-6 text-center">
                    <Search className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-text-muted">No residents match "<strong className="text-text">{query}</strong>"</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Complete List Dropdown */}
            <div ref={allDropdownRef} className="relative">
              <button
                onClick={() => setShowAllDropdown(!showAllDropdown)}
                className={`h-full px-5 py-3.5 bg-surface-lighter/60 border border-border/80 rounded-2xl font-semibold text-sm text-text hover:border-primary/50 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap min-w-[200px] justify-between ${showAllDropdown ? 'border-primary/50 shadow-lg shadow-primary/10' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  {selected ? 'Change Resident' : 'Browse All'}
                </span>
                <ChevronRight className={`w-4 h-4 text-text-muted transition-transform duration-200 ${showAllDropdown ? 'rotate-90' : ''}`} />
              </button>

              <AnimatePresence>
                {showAllDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full right-0 mt-2 w-80 bg-surface/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-2.5 border-b border-border/50 bg-surface-lighter/50">
                      <p className="text-xs font-semibold text-text-muted">All Residents ({residents.length})</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto custom-scrollbar">
                      {residents.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-text-muted">No residents found.</div>
                      ) : (
                        residents.map(u => (
                          <button
                            key={u.id || u.username}
                            onClick={() => selectResident(u)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-primary/8 transition-colors text-left cursor-pointer border-b border-border/30 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-text truncate">{u.fullName || u.username}</p>
                              <p className="text-xs text-text-muted truncate">@{u.username}</p>
                            </div>
                            <span className="px-2.5 py-1 bg-surface-lighter border border-border rounded-lg text-xs font-bold text-text-muted flex-shrink-0 ml-2">
                              House {u.houseNumber || '—'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Selected Resident Info Banner */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl"
              >
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text">{selected.fullName || selected.username}</p>
                  <p className="text-xs text-text-muted">@{selected.username}</p>
                </div>
                {[
                  { icon: Home,     label: 'House',  value: selected.houseNumber || '—' },
                  { icon: Hash,     label: 'Block',  value: selected.apartmentBlock || '—' },
                  { icon: Zap,      label: 'Meter',  value: selected.meterId || selected.meterNumber || 'N/A' },
                  { icon: Receipt,  label: 'Rate',   value: selected.waterRatePerLiter ? `₹${selected.waterRatePerLiter}/L` : 'Block rate' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center px-4 py-2 bg-surface/60 rounded-xl border border-border/50 min-w-[80px]">
                    <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-text">{value}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Split Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Water Meter Log */}
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-blue-500/5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <Droplet className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="font-bold text-text text-sm">Log Meter Reading</h2>
                  <p className="text-xs text-text-muted">Record daily or monthly water consumption</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {!selected && (
                  <div className="flex flex-col items-center py-10 text-center text-text-muted">
                    <Droplet className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Search and select a resident above</p>
                    <p className="text-xs mt-1 opacity-70">to log their meter reading</p>
                  </div>
                )}

                {selected && (
                  <form onSubmit={submitLog} className="space-y-4">
                    <StatusBanner status={logStatus} />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">House Number</label>
                        <div className="px-3 py-2.5 bg-surface-lighter/50 border border-border/80 rounded-xl text-sm text-text font-medium">{selected.houseNumber}</div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Block</label>
                        <div className="px-3 py-2.5 bg-surface-lighter/50 border border-border/80 rounded-xl text-sm text-text font-medium">{selected.apartmentBlock}</div>
                      </div>
                    </div>

                    {(selected.meterId || selected.meterNumber) && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/8 border border-blue-500/20 rounded-xl">
                        <Zap className="w-4 h-4 text-blue-300 flex-shrink-0" />
                        <p className="text-xs text-blue-200">Meter ID: <strong>{selected.meterId || selected.meterNumber}</strong></p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Log Period</label>
                      <select
                        value={logForm.logType}
                        onChange={e => setLogForm(f => ({ ...f, logType: e.target.value }))}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer"
                      >
                        <option value="DAILY">Single Day (Daily Log)</option>
                        <option value="WEEKLY">Weekly Log</option>
                        <option value="MONTHLY">Monthly Log</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Reading (Liters)</label>
                        <input
                          type="number" min="0" step="0.1" required
                          value={logForm.readingLiters}
                          onChange={e => setLogForm(f => ({ ...f, readingLiters: e.target.value }))}
                          placeholder="e.g. 350"
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Reading Date</label>
                        <input
                          type="date" required
                          value={logForm.readingDate}
                          onChange={e => setLogForm(f => ({ ...f, readingDate: e.target.value }))}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      type="submit" disabled={logLoading || !logForm.readingLiters}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {logLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Droplet className="w-4 h-4" />}
                      {logLoading ? 'Submitting…' : 'Submit Reading Log'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* RIGHT — Bill Generation */}
            <div className="glass-card overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-emerald-500/5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-bold text-text text-sm">Generate Bill</h2>
                  <p className="text-xs text-text-muted">Create bill from unbilled water usage logs</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {!selected && (
                  <div className="flex flex-col items-center py-10 text-center text-text-muted">
                    <Receipt className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">Select a resident first</p>
                    <p className="text-xs mt-1 opacity-70">Bill amount will be auto-calculated from usage logs</p>
                  </div>
                )}

                {selected && !billCalc && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-text-muted">Calculating bill…</p>
                  </div>
                )}

                {selected && billCalc && (
                  <form onSubmit={submitBill} className="space-y-4">
                    <StatusBanner status={billStatus} />

                    {billCalc.baseRateNotSet ? (
                      <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-text">Base rate is not set</p>
                          <p className="text-xs text-text-muted mt-1">Please contact your Super Admin to configure the base rate for this community before generating bills.</p>
                        </div>
                      </div>
                    ) : (
                      /* Calculation Summary Card */
                      <div className="bg-surface-lighter border border-border rounded-xl p-4 space-y-2.5">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Bill Calculation</p>
                        {[
                          ['Unbilled Usage', `${billCalc.totalL.toLocaleString()} Liters`],
                          ['Safe Limit Threshold', `${billCalc.limit.toLocaleString()} Liters`],
                          ['Within Limit Logged', `${billCalc.withinLimit.toLocaleString()} L @ ₹${billCalc.baseRate}/L`],
                          ['Overused Logged', billCalc.overused > 0 ? `${billCalc.overused.toLocaleString()} L @ ₹${billCalc.excessRate}/L` : '0 L (No Overuse)'],
                          ['Last Bill Date', billCalc.lastBillDate === 'None' ? 'First Bill' : new Date(billCalc.lastBillDate).toLocaleDateString('en-IN')],
                          ['Unbilled Logs count', `${billCalc.unbilled.length} entries`],
                        ].map(([k,v]) => (
                          <div key={k} className="flex justify-between text-sm">
                            <span className="text-text-muted">{k}</span>
                            <span className="font-semibold text-text">{v}</span>
                          </div>
                        ))}
                        <div className="h-px bg-border my-2" />
                        <div className="flex justify-between">
                          <span className="font-bold text-text">Total Amount</span>
                          <span className="text-xl font-black text-emerald-400">₹{billCalc.amount}</span>
                        </div>
                      </div>
                    )}

                    {billCalc.unbilled.length === 0 && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">No unbilled water logs found. Please submit a meter reading first using the panel on the left.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Bill Amount (₹)</label>
                        <input
                          type="number" step="0.01" required
                          disabled={billCalc.baseRateNotSet}
                          value={billForm.amount}
                          onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text font-bold focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Due Date</label>
                        <input
                          type="date" required
                          disabled={billCalc.baseRateNotSet}
                          value={billForm.dueDate}
                          onChange={e => setBillForm(f => ({ ...f, dueDate: e.target.value }))}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-emerald-500/60 cursor-pointer disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={billLoading || billCalc.unbilled.length === 0 || billCalc.baseRateNotSet}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {billLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                      {billLoading ? 'Generating…' : 'Generate & Save Bill'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── BILLING CYCLES TAB CONTENT ───────────────────────────── */}
      {activeTab === 'cycles' && (
        <motion.div
          key="cycles"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-text text-lg">Billing Cycles & Periods</h3>
              <p className="text-text-muted text-sm mt-0.5">
                Define water billing cycles per Colony community and auto-calculate household bills.
              </p>
            </div>
            <button
              onClick={() => {
                const myColonyName = localStorage.getItem('colonyName') || '';
                const myColony = apartments.find(a => a.name === myColonyName);
                const myColonyId = myColony?.id || '';
                setBillingCycleForm({
                  cycleName: '',
                  startDate: '',
                  endDate: '',
                  apartmentId: isSuperAdmin ? (apartments[0]?.id || '') : myColonyId,
                  apartmentBlock: isSuperAdmin ? '' : block
                });
                setBillingCycleModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              Create Billing Cycle
            </button>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-lighter/50 border-b border-border">
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Cycle Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Colony / Community</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Building / Block</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Start Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">End Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Total Water (L)</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Total Billed</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-primary uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(() => {
                    const filteredCycles = billingCycles.filter(cycle => {
                      if (isSuperAdmin) return true;
                      const myColonyName = localStorage.getItem('colonyName') || '';
                      const myColony = apartments.find(a => a.name === myColonyName);
                      return cycle.apartmentId === myColony?.id && cycle.apartmentBlock === block;
                    });

                    if (filteredCycles.length === 0) {
                      return (
                        <tr>
                          <td colSpan="9" className="px-6 py-10 text-center text-text-muted text-sm">
                            No billing cycles defined yet. Click "Create Billing Cycle" to define one.
                          </td>
                        </tr>
                      );
                    }

                    return filteredCycles.map(cycle => (
                      <tr key={cycle.id} className="hover:bg-surface-lighter/20 transition-colors text-sm">
                        <td className="px-6 py-4 font-semibold text-text">{cycle.cycleName}</td>
                        <td className="px-6 py-4 text-text-muted">{getApartmentName(cycle.apartmentId)}</td>
                        <td className="px-6 py-4 text-text-muted">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            cycle.apartmentBlock 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {cycle.apartmentBlock || 'All Blocks'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-text-muted">{cycle.startDate}</td>
                        <td className="px-6 py-4 text-text-muted">{cycle.endDate}</td>
                        <td className="px-6 py-4 text-text font-bold">{cycle.totalConsumptionLiters ? `${cycle.totalConsumptionLiters.toLocaleString()} L` : '0 L'}</td>
                        <td className="px-6 py-4 text-text font-bold">₹{cycle.totalBilledAmount ? cycle.totalBilledAmount.toFixed(2) : '0.00'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            cycle.status === 'FINALIZED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : cycle.status === 'OPEN'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {cycle.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {cycle.status === 'OPEN' && (
                              <button
                                onClick={() => handleFinalizeCycle(cycle.id)}
                                title="Finalize & Auto-Generate Bills"
                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Finalize
                              </button>
                            )}
                            {cycle.status === 'FINALIZED' && (
                              <button
                                onClick={() => handleArchiveCycle(cycle.id)}
                                title="Archive Cycle"
                                className="px-3 py-1.5 bg-slate-500/10 text-slate-405 hover:bg-slate-500/25 border border-slate-500/20 rounded-lg cursor-pointer text-xs font-semibold"
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── PAYMENT REMINDERS TAB CONTENT ────────────────────────── */}
      {activeTab === 'reminders' && (
        <motion.div
          key="reminders"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-text text-lg">Payment Reminder Control Panel</h3>
              <p className="text-text-muted text-sm mt-0.5">
                Notify community admins of blocks with pending bills, and dispatch email notices to unpaid residents.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleScanAlertAdmins}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-blue-500/10 text-blue-450 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
              >
                <Activity className="w-4 h-4" />
                Scan & Alert Admins
              </button>

              <button 
                onClick={handleSendAllReminders}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50 text-sm"
              >
                <Send className="w-4 h-4" />
                Send All Reminders
              </button>
            </div>
          </div>

          {/* Aggregated Unpaid Households */}
          {(() => {
            const blockBills = isSuperAdmin 
              ? bills
              : bills.filter(b => b.apartmentBlock === block);
            
            const unpaidBills = blockBills.filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE');
            const unpaidByHouse = {};
            
            unpaidBills.forEach(b => {
              const key = `${b.apartmentBlock}-${b.houseNumber}`;
              if (!unpaidByHouse[key]) {
                unpaidByHouse[key] = {
                  houseNumber: b.houseNumber,
                  apartmentBlock: b.apartmentBlock,
                  totalAmount: 0,
                  billCount: 0,
                  latestDueDate: b.dueDate
                };
              }
              unpaidByHouse[key].totalAmount += b.amount;
              unpaidByHouse[key].billCount += 1;
              if (new Date(b.dueDate) > new Date(unpaidByHouse[key].latestDueDate)) {
                unpaidByHouse[key].latestDueDate = b.dueDate;
              }
            });
            
            const unpaidList = Object.values(unpaidByHouse);

            return (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 bg-primary/5 border-b border-border/40 flex items-center justify-between">
                  <span className="text-sm font-bold text-text">
                    Unpaid Households: <strong className="text-primary font-black">{unpaidList.length}</strong> total
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-lighter/50 border-b border-border">
                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">House Number</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Apartment Block</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Resident Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Unpaid Bills</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Total Outstanding</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Latest Due Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-sm">
                      {unpaidList.length > 0 ? (
                        unpaidList.map(item => {
                          const resident = users.find(u => u.houseNumber === item.houseNumber && u.apartmentBlock === item.apartmentBlock);
                          return (
                            <tr key={`${item.apartmentBlock}-${item.houseNumber}`} className="hover:bg-primary/5 transition-colors">
                              <td className="px-6 py-4 font-bold text-text">{item.houseNumber}</td>
                              <td className="px-6 py-4 text-text-muted font-medium">{item.apartmentBlock}</td>
                              <td className="px-6 py-4 text-text">
                                {resident ? (resident.fullName || resident.username) : 'N/A'}
                              </td>
                              <td className="px-6 py-4 font-semibold text-amber-500">
                                {item.billCount} pending
                              </td>
                              <td className="px-6 py-4 font-bold text-red-400">
                                ₹{item.totalAmount.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-text-muted text-xs font-semibold">{item.latestDueDate}</td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => handleSendIndividualReminder(item.houseNumber, item.apartmentBlock)}
                                  disabled={actionLoading}
                                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/25 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ml-auto disabled:opacity-50"
                                >
                                  <Send className="w-3 h-3" /> Send Reminder
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-6 py-10 text-center text-text-muted">
                            No unpaid household bills found. All clear!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Bulk Bill Generation Modal */}
      {bulkGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text mb-1">Generating Bills...</h3>
            <p className="text-text-muted text-xs mb-4">Processing residents with unbilled water usage logs.</p>
            
            <div className="w-full bg-surface-lighter rounded-full h-2.5 mb-4 overflow-hidden border border-border">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-around text-sm font-semibold text-text">
              <div>
                <span className="block text-xs text-text-muted">Total</span>
                <span>{bulkProgress.total}</span>
              </div>
              <div>
                <span className="block text-xs text-emerald-400">Success</span>
                <span>{bulkProgress.success}</span>
              </div>
              <div>
                <span className="block text-xs text-red-400">Failed</span>
                <span>{bulkProgress.failed}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Preview Modal */}
      {showBulkPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface border-2 border-border w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-border bg-surface-lighter/30 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-text tracking-tight">Bulk Billing Preview</h3>
                <p className="text-text-muted text-sm mt-1.5 font-semibold">Review water rates, thresholds, and calculations before generating resident invoices.</p>
              </div>
              <button
                onClick={() => setShowBulkPreview(false)}
                className="p-2 hover:bg-surface-lighter rounded-xl text-text-muted hover:text-text cursor-pointer transition-colors border border-border/45"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-8 space-y-6 flex-1">
              {(!tariffSettings?.baseRatePerLiter || parseFloat(tariffSettings.baseRatePerLiter) <= 0) ? (
                <div className="flex items-start gap-4 p-5 bg-red-500/10 border-2 border-red-500/30 rounded-2xl">
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-text text-base">Your base rate is not set, contact admin</span>
                    <p className="mt-1 text-sm text-text-muted font-medium">
                      A base rate must be configured by the Super Admin before bills can be calculated and generated. Please contact your administrator.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex gap-4 text-sm text-text">
                  <Info className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-text text-base">Calculation Formula:</span>
                    <p className="mt-1 text-sm text-text-muted font-medium">
                      Charges are calculated using the safe threshold limit (<strong className="text-text font-bold">{parseFloat(tariffSettings.monthlyLimitLiters || 10000).toLocaleString()} Liters</strong>) set in settings:
                    </p>
                    <div className="mt-2.5">
                      <code className="bg-surface border border-primary/30 text-primary font-mono text-xs md:text-sm font-black px-3.5 py-1.5 rounded-xl inline-block shadow-sm">
                        water used within limit * base rate + overused water * tariff rate = total
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Resident Billing Table */}
              <div className="border border-border rounded-2xl overflow-hidden bg-surface-lighter/20 shadow-inner">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-lighter text-text text-xs md:text-sm font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Flat / House</th>
                      <th className="px-6 py-4">Resident Name</th>
                      <th className="px-6 py-4">Meter ID / No</th>
                      <th className="px-6 py-4 text-right">Water Log</th>
                      <th className="px-6 py-4 text-right">Calculation Formula</th>
                      <th className="px-6 py-4 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 bg-surface">
                    {bulkList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-surface-lighter/30 transition-colors">
                        <td className="px-6 py-4.5 font-black text-sm md:text-base text-text">
                          House #{item.resident.houseNumber}
                        </td>
                        <td className="px-6 py-4.5 text-text font-bold text-sm md:text-base">
                          {item.resident.fullName || item.resident.username}
                        </td>
                        <td className="px-6 py-4.5 text-text-muted font-mono text-xs md:text-sm font-bold">
                          {item.resident.meterId || item.resident.meterNumber || '—'}
                        </td>
                        <td className="px-6 py-4.5 text-right font-black text-blue-500 text-sm md:text-base whitespace-nowrap">
                          {item.totalL.toLocaleString()} Liters
                        </td>
                        <td className="px-6 py-4.5 text-right text-text-muted text-xs md:text-sm font-mono whitespace-nowrap">
                          <span className="text-primary font-bold">{item.withinLimit.toLocaleString()}L</span> × ₹{item.baseRate.toFixed(3)}
                          {item.overused > 0 && (
                            <>
                              {' '}+{' '}<span className="text-amber-500 font-bold">{item.overused.toLocaleString()}L</span> × ₹{item.tariffRate.toFixed(3)}
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4.5 text-right font-black text-emerald-500 text-base md:text-lg whitespace-nowrap">
                          ₹{item.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border bg-surface-lighter/30 flex items-center justify-between gap-4">
              <span className="text-sm md:text-base font-bold text-text-muted">
                Total Residents: <strong className="text-text font-black">{bulkList.length}</strong>
              </span>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowBulkPreview(false)}
                  className="px-6 py-3 bg-surface border border-border hover:border-text-muted text-text font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBulkGeneration}
                  disabled={!tariffSettings?.baseRatePerLiter || parseFloat(tariffSettings.baseRatePerLiter) <= 0}
                  className="px-7 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-500 disabled:to-gray-650 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm md:text-base rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  ⚡ Generate Bills for All
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Billing Cycle Modal */}
      {billingCycleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setBillingCycleModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer p-1.5 hover:bg-surface-lighter rounded-lg border border-border/40"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-text mb-4">Create Billing Cycle</h3>
            <form onSubmit={handleCreateBillingCycle} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Cycle Name</label>
                <input
                  type="text" required
                  placeholder="e.g. June 2026 Cycle"
                  value={billingCycleForm.cycleName}
                  onChange={e => setBillingCycleForm(prev => ({ ...prev, cycleName: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Start Date</label>
                  <input
                    type="date" required
                    value={billingCycleForm.startDate}
                    onChange={e => setBillingCycleForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">End Date</label>
                  <input
                    type="date" required
                    value={billingCycleForm.endDate}
                    onChange={e => setBillingCycleForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Colony / Community</label>
                <select
                  required
                  value={billingCycleForm.apartmentId}
                  onChange={e => setBillingCycleForm(prev => ({ ...prev, apartmentId: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer"
                >
                  <option value="">Select Colony</option>
                  {apartments.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Building / Block</label>
                <input
                  type="text"
                  placeholder="e.g. Block A (Leave empty for all)"
                  value={billingCycleForm.apartmentBlock}
                  onChange={e => setBillingCycleForm(prev => ({ ...prev, apartmentBlock: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60"
                />
              </div>
              <button
                type="submit" disabled={actionLoading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Cycle
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
