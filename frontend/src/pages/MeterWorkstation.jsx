import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Droplet, Receipt, User, Home, Hash, CheckCircle2,
  AlertCircle, Loader2, X, ChevronRight, Zap, Calendar, Info, FileText, Plus,
  Send, Activity, Download, Upload, AlertTriangle, ShieldAlert
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

const getBillingMonthLabel = (dateStr) => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length < 2) return 'N/A';
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const dateObj = new Date(year, monthIdx, 1);
  return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function MeterWorkstation() {
  const location = useLocation();
  const role  = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';
  const block = localStorage.getItem('apartmentBlock') || '';
  const isSuperAdmin = role === 'ROLE_ADMIN';
  const currentYear = new Date().getFullYear();
  const currentMonthVal = new Date().getMonth() + 1;

  // Navigation Tab
  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'cycles' : 'workstation'); // workstation, cycles, reminders

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
  const [hasLoggedNewReading, setHasLoggedNewReading] = useState(false);
  const [selectedSingleBillMonthKey, setSelectedSingleBillMonthKey] = useState(`${currentYear}-${currentMonthVal}`);

  // Bulk Billing
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress,   setBulkProgress]   = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkList,        setBulkList]        = useState([]);
  const [tariffSettings,  setTariffSettings]  = useState(null);
  const [selectedBulkMonth, setSelectedBulkMonth] = useState(new Date().getMonth() + 1);
  const [selectedBulkYear, setSelectedBulkYear] = useState(new Date().getFullYear());

  // Custom Confirm Alert Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: 'Confirm Finalization',
    message: '',
    onConfirm: null
  });

  // ── Load data ───────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchAll();
    fetchBillingCycles();
    fetchApartments();
  }, []);

  useEffect(() => {
    if (location.state && location.state.selectedResidentId && users.length > 0) {
      const foundUser = users.find(u => u.id === location.state.selectedResidentId);
      if (foundUser) {
        selectResident(foundUser);
        
        // Auto scroll to log/bill section if requested
        setTimeout(() => {
          const elementId = location.state.action === 'log' ? 'log-reading-section' : 'generate-bill-section';
          const el = document.getElementById(elementId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-slate-900', 'transition-all');
            setTimeout(() => {
              el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-slate-900');
            }, 3000);
          }
        }, 300);
      }
    }
  }, [location.state, users]);

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
        apartmentBlock: billingCycleForm.apartmentBlock || null,
        createdByRole: role
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

  const residents = users.filter(u => u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER');

  const isMonthFinalized = (houseNumber, dateStr) => {
    if (!houseNumber || !dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length < 2) return false;
    const targetYear = parseInt(parts[0], 10);
    const targetMonth = parseInt(parts[1], 10);
    
    return bills.some(b => {
      if (b.houseNumber !== houseNumber) return false;
      if (!b.generatedDate) return false;
      const dParts = b.generatedDate.split('-');
      return parseInt(dParts[0], 10) === targetYear && parseInt(dParts[1], 10) === targetMonth;
    });
  };

  const isLogDateFinalized = selected && isMonthFinalized(selected.houseNumber, logForm.readingDate);
  const isBillMonthFinalized = selected && billForm.generatedDate && isMonthFinalized(selected.houseNumber, billForm.generatedDate);

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];
  
  const years = [];
  const startYr = new Date().getFullYear() - 3;
  const endYr = new Date().getFullYear() + 2;
  for (let y = startYr; y <= endYr; y++) {
    years.push(y);
  }

  const pendingBulkCount = (() => {
    let count = 0;
    for (const u of residents) {
      const targetMonthLogs = usageLogs.filter(l => {
        if (l.houseNumber !== u.houseNumber) return false;
        if (!l.readingDate) return false;
        const parts = l.readingDate.split('-');
        if (parts.length < 2) return false;
        const logYear = parseInt(parts[0], 10);
        const logMonth = parseInt(parts[1], 10);
        return logYear === selectedBulkYear && logMonth === selectedBulkMonth;
      });
      if (targetMonthLogs.length === 0) continue;

      const alreadyBilled = bills.some(b => {
        if (b.houseNumber !== u.houseNumber) return false;
        const dateStr = b.generatedDate || b.createdAt;
        if (!dateStr) return false;
        const parts = dateStr.split('-');
        if (parts.length < 2) return false;
        const billYear = parseInt(parts[0], 10);
        const billMonth = parseInt(parts[1], 10);
        return billYear === selectedBulkYear && billMonth === selectedBulkMonth;
      });
      if (alreadyBilled) continue;

      const totalL = targetMonthLogs.reduce((s, l) => s + (l.readingLiters || 0), 0);
      if (totalL > 0) {
        count++;
      }
    }
    return count;
  })();

  const getPendingCountForMonth = (monthVal) => {
    let count = 0;
    for (const u of residents) {
      const targetMonthLogs = usageLogs.filter(l => {
        if (l.houseNumber !== u.houseNumber) return false;
        if (!l.readingDate) return false;
        const parts = l.readingDate.split('-');
        if (parts.length < 2) return false;
        const logYear = parseInt(parts[0], 10);
        const logMonth = parseInt(parts[1], 10);
        return logYear === selectedBulkYear && logMonth === monthVal;
      });
      if (targetMonthLogs.length === 0) continue;

      const alreadyBilled = bills.some(b => {
        if (b.houseNumber !== u.houseNumber) return false;
        const dateStr = b.generatedDate || b.createdAt;
        if (!dateStr) return false;
        const parts = dateStr.split('-');
        if (parts.length < 2) return false;
        const billYear = parseInt(parts[0], 10);
        const billMonth = parseInt(parts[1], 10);
        return billYear === selectedBulkYear && billMonth === monthVal;
      });
      if (alreadyBilled) continue;

      const totalL = targetMonthLogs.reduce((s, l) => s + (l.readingLiters || 0), 0);
      if (totalL > 0) {
        count++;
      }
    }
    return count;
  };

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
    setHasLoggedNewReading(false);
    computeBillCalc(u);
  };

  const computeBillCalc = (u) => {
    if (!u) { setBillCalc(null); return; }

    const currentYear = new Date().getFullYear();
    const currentMonthVal = new Date().getMonth() + 1;

    let selYear = currentYear;
    let selMonth = currentMonthVal;
    if (selectedSingleBillMonthKey) {
      const parts = selectedSingleBillMonthKey.split('-');
      if (parts.length >= 2) {
        selYear = parseInt(parts[0], 10);
        selMonth = parseInt(parts[1], 10);
      }
    }

    const pad = (n) => String(n).padStart(2, '0');

    // Check if a bill already exists for this household in the selected month & year
    const existingBill = bills.find(b => {
      if (b.houseNumber !== u.houseNumber) return false;
      if (!b.generatedDate) return false;
      const dParts = b.generatedDate.split('-');
      return parseInt(dParts[0], 10) === selYear && parseInt(dParts[1], 10) === selMonth;
    });

    const baseRate = tariffSettings ? parseFloat(tariffSettings.baseRatePerLiter) : 0;
    const limit = tariffSettings ? parseFloat(tariffSettings.monthlyLimitLiters) : 10000;
    const excessRate = tariffSettings ? parseFloat(tariffSettings.excessRatePerLiter) : 0;

    let totalL = 0;
    let withinLimit = 0;
    let overused = 0;
    let amount = "0.00";
    let activeLogs = [];
    let isFinalized = false;

    if (existingBill) {
      totalL = existingBill.consumptionLiters || 0;
      withinLimit = existingBill.withinLimitLiters || 0;
      overused = existingBill.excessLiters || 0;
      amount = (existingBill.amount || 0).toFixed(2);
      isFinalized = true;
      
      activeLogs = usageLogs.filter(l => {
        if (l.houseNumber !== u.houseNumber || !l.readingDate) return false;
        const parts = l.readingDate.split('-');
        return parseInt(parts[0], 10) === selYear && parseInt(parts[1], 10) === selMonth;
      });
    } else {
      activeLogs = usageLogs.filter(l => {
        if (l.houseNumber !== u.houseNumber || !l.readingDate) return false;
        const parts = l.readingDate.split('-');
        return parseInt(parts[0], 10) === selYear && parseInt(parts[1], 10) === selMonth;
      });

      totalL = activeLogs.reduce((s, l) => s + (l.readingLiters || 0), 0);
      withinLimit = Math.min(totalL, limit);
      overused = Math.max(0, totalL - limit);
      amount = ((withinLimit * baseRate) + (overused * excessRate)).toFixed(2);
    }

    const generatedDate = `${selYear}-${pad(selMonth)}-28`;

    // Find matching billing cycle
    const matchingCycle = billingCycles.find(c => {
      if (!c.startDate || !c.endDate) return false;
      const gDate = new Date(generatedDate);
      return gDate >= new Date(c.startDate) && gDate <= new Date(c.endDate);
    });
    const billingCycleId = matchingCycle ? matchingCycle.id : 1;

    setBillCalc({
      totalL,
      baseRate,
      limit,
      excessRate,
      withinLimit,
      overused,
      amount,
      unbilled: isFinalized ? [] : activeLogs,
      logsCount: activeLogs.length,
      activeMonthKey: `${selYear}-${selMonth}`,
      isFinalized,
      baseRateNotSet: !baseRate || baseRate <= 0
    });

    setBillForm(f => ({
      ...f,
      amount,
      generatedDate,
      billingCycleId
    }));
  };

  // Re-compute bill whenever logs/bills change and resident is selected
  useEffect(() => { if (selected) computeBillCalc(selected); }, [usageLogs, bills, tariffSettings, selectedSingleBillMonthKey]);

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
      
      // Auto-focus the active month for single bill generation to match the logged date
      if (logForm.readingDate) {
        const parts = logForm.readingDate.split('-');
        if (parts.length >= 2) {
          const key = `${parseInt(parts[0], 10)}-${parseInt(parts[1], 10)}`;
          setSelectedSingleBillMonthKey(key);
        }
      }

      setLogForm(f => ({ ...f, readingLiters: '' }));
      setHasLoggedNewReading(true);
      await fetchAll();
    } catch (err) {
      setLogStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to submit log.' });
    } finally { setLogLoading(false); }
  };

  // ── Generate bill ────────────────────────────────────────────────
  const submitBill = async (e) => {
    e.preventDefault();
    if (!selected || !billCalc) return;

    const message = `WARNING: Generating this bill will permanently LOCK the billing cycle (${getBillingMonthLabel(billForm.generatedDate)}) for this household.
No further water log entries, updates, or deletions will be allowed for this month.

Are you sure you want to finalize this bill and lock the cycle?`;

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Bill Finalization',
      message,
      onConfirm: async () => {
        setBillLoading(true); setBillStatus(null);
        try {
          await api.post('/bills/create', {
            houseNumber: selected.houseNumber,
            apartmentBlock: selected.apartmentBlock,
            amount: parseFloat(billForm.amount),
            dueDate: billForm.dueDate,
            status: 'UNPAID',
            billingCycleId: billForm.billingCycleId,
            generatedDate: billForm.generatedDate
          }, { params: { callerRole: role } });
          setBillStatus({ type: 'success', msg: `✅ Bill of ₹${billForm.amount} generated and finalized for ${selected.fullName || selected.username}` });
          setHasLoggedNewReading(false);
          await fetchAll();
        } catch (err) {
          setBillStatus({ type: 'error', msg: err?.response?.data?.message || 'Failed to generate bill.' });
        } finally { setBillLoading(false); }
      }
    });
  };

  // ── Bulk Generate Bills ──────────────────────────────────────────
  const handleGenerateAllBills = () => {
    const toBill = [];
    const baseRate = tariffSettings ? parseFloat(tariffSettings.baseRatePerLiter) : 0;
    const limit = tariffSettings ? parseFloat(tariffSettings.monthlyLimitLiters) : 10000;
    const excessRate = tariffSettings ? parseFloat(tariffSettings.excessRatePerLiter) : 0;

    for (const u of residents) {
      // Find logs for the selected month and year
      const targetMonthLogs = usageLogs.filter(l => {
        if (l.houseNumber !== u.houseNumber) return false;
        if (!l.readingDate) return false;
        const parts = l.readingDate.split('-');
        if (parts.length < 2) return false;
        const logYear = parseInt(parts[0], 10);
        const logMonth = parseInt(parts[1], 10);
        return logYear === selectedBulkYear && logMonth === selectedBulkMonth;
      });

      if (targetMonthLogs.length === 0) continue;

      // Check if a bill already exists for this resident for this month/year
      const alreadyBilled = bills.some(b => {
        if (b.houseNumber !== u.houseNumber) return false;
        const dateStr = b.generatedDate || b.createdAt;
        if (!dateStr) return false;
        const parts = dateStr.split('-');
        if (parts.length < 2) return false;
        const billYear = parseInt(parts[0], 10);
        const billMonth = parseInt(parts[1], 10);
        return billYear === selectedBulkYear && billMonth === selectedBulkMonth;
      });

      if (alreadyBilled) continue;

      const totalL = targetMonthLogs.reduce((s, l) => s + (l.readingLiters || 0), 0);
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
      const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedBulkMonth - 1];
      alert(`No residents have unbilled water logs for ${monthName} ${selectedBulkYear}.`);
      return;
    }

    setBulkList(toBill);
    setShowBulkPreview(true);
  };

  const executeBulkGeneration = async () => {
    if (bulkList.length === 0) return;
    
    const message = `WARNING: Finalizing bills will permanently LOCK the billing month (${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedBulkMonth - 1]} ${selectedBulkYear}) for the ${bulkList.length} households in this list.

Once finalized, you will NOT be able to submit, edit, or delete water logs for this period.

Are you sure you want to finalize these bills and lock the cycle?`;

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Bulk Finalization',
      message,
      onConfirm: async () => {
        setShowBulkPreview(false);
        setBulkGenerating(true);
        setBulkProgress({ current: 0, total: bulkList.length, success: 0, failed: 0 });

        const defaultDueDate = new Date(Date.now() + 15*86400000).toISOString().split('T')[0];
        const pad = (n) => String(n).padStart(2, '0');
        const targetGeneratedDate = `${selectedBulkYear}-${pad(selectedBulkMonth)}-28`;

        for (let i = 0; i < bulkList.length; i++) {
          const item = bulkList[i];
          try {
            await api.post(`/bills/create?callerRole=${role}`, {
              houseNumber: item.resident.houseNumber,
              apartmentBlock: item.resident.apartmentBlock,
              amount: parseFloat(item.amount),
              dueDate: item.dueDate || defaultDueDate,
              status: 'UNPAID',
              billingCycleId: item.billingCycleId || 1,
              generatedDate: targetGeneratedDate
            });
            setBulkProgress(prev => ({ ...prev, current: i + 1, success: prev.success + 1 }));
          } catch (err) {
            setBulkProgress(prev => ({ ...prev, current: i + 1, failed: prev.failed + 1 }));
            console.error(`Bulk generation failed for house ${item.resident.houseNumber}:`, err);
          }
        }
        setBulkGenerating(false);
        await fetchAll();
      }
    });
  };

  // ── CSV Bulk Operations ─────────────────────────────────────────
  const handleDownloadTemplate = async () => {
    try {
      const targetBlock = isSuperAdmin ? '' : block;
      const response = await api.get('/usage/template', {
        params: { 
          apartmentBlock: targetBlock,
          month: selectedBulkMonth,
          year: selectedBulkYear
        },
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

  const monthsOfSelectedYear = Array.from({ length: 12 }, (_, i) => {
    const monthVal = i + 1;
    return {
      value: monthVal,
      key: `${currentYear}-${monthVal}`,
      label: new Date(currentYear, i, 1).toLocaleString('default', { month: 'short' }),
      fullName: new Date(currentYear, i, 1).toLocaleString('default', { month: 'long' })
    };
  });

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
          ...(!isSuperAdmin ? [{ id: 'workstation', label: 'Workstation', icon: Droplet }] : []),
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
      {activeTab === 'workstation' && !isSuperAdmin && (
        <motion.div
          key="workstation"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Action Toolbars Wrapper */}
          <div className="flex flex-col lg:flex-row gap-6 items-stretch w-full">
            {/* CSV Actions Toolbar */}
            <div className="flex flex-col gap-4 glass-card p-5 min-w-[180px] justify-between items-center text-center">
              <span className="text-xs font-black text-text-muted uppercase tracking-wider">Bulk Logging</span>
              <div className="flex items-center gap-4">
                {/* Download Template button */}
                <motion.button
                  onClick={handleDownloadTemplate}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 hover:text-blue-300 transition-colors shadow-lg cursor-pointer relative group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    animate={{ y: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Download className="w-5 h-5" />
                  </motion.div>
                  {/* Tooltip */}
                  <span className="absolute top-full mt-2 hidden group-hover:block bg-slate-900 border border-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-2xl z-30">
                    Download Template
                  </span>
                </motion.button>

                {/* Upload Water Logs button */}
                <motion.label
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300 transition-colors shadow-lg cursor-pointer relative group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleUploadCsv}
                    className="hidden"
                  />
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Upload className="w-5 h-5" />
                  </motion.div>
                  {/* Tooltip */}
                  <span className="absolute top-full mt-2 hidden group-hover:block bg-slate-900 border border-slate-800 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-2xl z-30">
                    Upload Water Logs
                  </span>
                </motion.label>
              </div>
            </div>

            {/* Monthly Bulk Billing Actions */}
            <div className="flex flex-col gap-3 glass-card p-5 flex-1 justify-between">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-black text-text-muted uppercase tracking-wider">Bulk Billing</span>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-surface-lighter/50 border border-border/60 px-3.5 py-2 rounded-xl">
                      <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Month:</span>
                      <select
                        value={selectedBulkMonth}
                        onChange={e => setSelectedBulkMonth(parseInt(e.target.value, 10))}
                        className="bg-transparent text-text text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        {months.map(m => {
                          const pendingCount = getPendingCountForMonth(m.value);
                          return (
                            <option key={m.value} value={m.value} className="bg-surface text-text font-semibold">
                              {pendingCount > 0 ? `⚠️ ${m.label} (${pendingCount} pending)` : m.label}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 bg-surface-lighter/50 border border-border/60 px-3.5 py-2 rounded-xl">
                      <span className="text-xs font-extrabold text-text-muted uppercase tracking-wider">Year:</span>
                      <select
                        value={selectedBulkYear}
                        onChange={e => setSelectedBulkYear(parseInt(e.target.value, 10))}
                        className="bg-transparent text-text text-xs font-bold focus:outline-none cursor-pointer"
                      >
                        {years.map(y => (
                          <option key={y} value={y} className="bg-surface text-text font-semibold">{y}</option>
                        ))}
                      </select>
                    </div>

                    {pendingBulkCount > 0 ? (
                      <div className="text-xs font-black text-amber-400 bg-amber-500/15 px-3 py-2 rounded-xl border border-amber-500/25 shadow-sm">
                        {pendingBulkCount} pending
                      </div>
                    ) : (
                      <div className="text-xs font-black text-text-muted bg-surface-lighter/30 px-3 py-2 rounded-xl border border-border/40">
                        0 pending
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerateAllBills}
                    className="generate-bills-button cursor-pointer flex-shrink-0"
                  >
                    <div className="button-outer">
                      <div className="button-inner">
                        <span>
                          <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                          Finalize Bills
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-bold text-text-muted/80 mt-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                Note: The selected month and year apply to both the bulk logging templates and bulk billing.
              </p>
            </div>
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
                className="flex flex-wrap items-center gap-4 p-5 bg-gradient-to-r from-blue-500/12 via-primary/5 to-surface-lighter/30 border-l-4 border-l-blue-500 border border-y-border/70 border-r-border/70 rounded-2xl shadow-xl shadow-blue-500/5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="w-12 h-12 rounded-full bg-blue-500/25 border border-blue-500/30 flex items-center justify-center flex-shrink-0 text-blue-400">
                  <User className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 z-10">
                  <p className="font-black text-lg text-text tracking-tight">{selected.fullName || selected.username}</p>
                  <p className="text-xs text-text-muted font-semibold mt-0.5">@{selected.username}</p>
                </div>
                {[
                  { icon: Home,     label: 'House',  value: selected.houseNumber || '—' },
                  { icon: Hash,     label: 'Block',  value: selected.apartmentBlock || '—' },
                  { icon: Zap,      label: 'Meter',  value: selected.meterId || selected.meterNumber || 'N/A' },
                  { icon: Receipt,  label: 'Rate',   value: selected.waterRatePerLiter ? `₹${selected.waterRatePerLiter}/L` : 'Block rate' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center px-5 py-2.5 bg-surface/50 backdrop-blur-md rounded-xl border border-border/70 min-w-[90px] shadow-sm hover:border-blue-500/40 transition-all hover:shadow-md hover:shadow-blue-500/5 z-10">
                    <Icon className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-black">{label}</p>
                    <p className="text-sm font-black text-text mt-0.5">{value}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Split Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT — Water Meter Log */}
            <div id="log-reading-section" className="glass-card overflow-hidden">
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
                        disabled={isLogDateFinalized}
                        className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                          disabled={isLogDateFinalized}
                          placeholder={isLogDateFinalized ? "Locked" : "e.g. 350"}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <p className="text-[11px] text-primary mt-1.5 font-bold">
                          Billing Cycle: <span className="text-text">{getBillingMonthLabel(logForm.readingDate)}</span>
                        </p>
                      </div>
                    </div>

                    {isLogDateFinalized && (
                      <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="text-xs text-red-400 font-bold">🔒 Billing Locked</p>
                          <p className="text-[11px] text-red-300 leading-normal mt-0.5">
                            Billing for {getBillingMonthLabel(logForm.readingDate)} has already been finalized. No additional readings can be submitted.
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit" disabled={logLoading || !logForm.readingLiters || isLogDateFinalized}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {logLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Droplet className="w-4 h-4" />}
                      {logLoading ? 'Submitting…' : 'Submit Reading Log'}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* RIGHT — Bill Generation */}
            <div id="generate-bill-section" className="glass-card overflow-hidden">
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
                      <div className="space-y-4 text-left">
                        {/* Months Quick Select row */}
                        <div className="bg-surface-lighter/60 border border-border/80 rounded-2xl p-3.5 space-y-2">
                          <label className="text-[11px] font-black text-text-muted uppercase tracking-wider block">
                            Select Month to View/Finalize
                          </label>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                            {monthsOfSelectedYear.map(m => {
                              const isFinalized = selected && isMonthFinalized(selected.houseNumber, `${m.key}-28`);
                              const isActive = selectedSingleBillMonthKey === m.key;
                              
                              const hasLogs = selected && usageLogs.some(l => {
                                if (l.houseNumber !== selected.houseNumber) return false;
                                if (!l.readingDate) return false;
                                const parts = l.readingDate.split('-');
                                if (parts.length < 2) return false;
                                const logYear = parseInt(parts[0], 10);
                                const logMonth = parseInt(parts[1], 10);
                                const mParts = m.key.split('-');
                                const targetYear = parseInt(mParts[0], 10);
                                const targetMonth = parseInt(mParts[1], 10);
                                return logYear === targetYear && logMonth === targetMonth;
                              });
                              
                              return (
                                <button
                                  key={m.key}
                                  type="button"
                                  onClick={() => setSelectedSingleBillMonthKey(m.key)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 flex-shrink-0 cursor-pointer ${
                                    isActive
                                      ? 'bg-primary text-text shadow-md shadow-primary/20'
                                      : hasLogs && !isFinalized
                                      ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                                      : isFinalized
                                      ? 'bg-rose-500/10 border border-rose-500/25 text-rose-400 hover:bg-rose-500/15'
                                      : 'bg-surface border border-border hover:border-text-muted text-text-muted hover:text-text'
                                  }`}
                                >
                                  {m.label}
                                  {isFinalized && <span className="text-[10px]">🔒</span>}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="bg-surface-lighter border border-border rounded-xl p-4 space-y-2.5">
                          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Bill Calculation</p>
                          {[
                            [billCalc.isFinalized ? 'Water Consumption' : 'Unbilled Usage (For Cycle)', `${billCalc.totalL.toLocaleString()} Liters`],
                            ['Safe Limit Threshold', `${billCalc.limit.toLocaleString()} Liters`],
                            ['Within Limit Logged', `${billCalc.withinLimit.toLocaleString()} L @ ₹${billCalc.baseRate}/L`],
                            ['Overused Logged', billCalc.overused > 0 ? `${billCalc.overused.toLocaleString()} L @ ₹${billCalc.excessRate}/L` : '0 L (No Overuse)'],
                            [billCalc.isFinalized ? 'Logs Count' : 'Unbilled Logs Count', `${billCalc.logsCount} entries`],
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
                      </div>
                    )}

                    {!billCalc.isFinalized && billCalc.unbilled.length === 0 && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">No unbilled water logs found. Please submit a meter reading first using the panel on the left.</p>
                      </div>
                    )}

                    {isBillMonthFinalized && (
                      <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-left">
                          <p className="text-xs text-red-400 font-bold">🔒 Billing Cycle Locked</p>
                          <p className="text-[11px] text-red-300 leading-normal mt-0.5">
                            This billing month has already been finalized. No further bill generation is allowed.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Bill Amount (₹)</label>
                        <input
                          type="number" step="0.01" required
                          disabled={billCalc.baseRateNotSet || isBillMonthFinalized}
                          value={billForm.amount}
                          onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text font-bold focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Due Date</label>
                        <input
                          type="date" required
                          disabled={billCalc.baseRateNotSet || isBillMonthFinalized}
                          value={billForm.dueDate}
                          onChange={e => setBillForm(f => ({ ...f, dueDate: e.target.value }))}
                          className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-emerald-500/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={billLoading || billCalc.unbilled.length === 0 || billCalc.baseRateNotSet || isBillMonthFinalized}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {billLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                      {billLoading ? 'Generating…' : 'Finalize & Generate Bill'}
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
                const myColonyName = (localStorage.getItem('colonyName') || '').trim().toLowerCase();
                const myColony = apartments.find(a => a.name.trim().toLowerCase() === myColonyName);
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
                <h3 className="text-2xl font-black text-text tracking-tight">Bulk Billing Preview ({['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedBulkMonth - 1]} {selectedBulkYear})</h3>
                <p className="text-text-muted text-sm mt-1.5 font-semibold">Review water rates, thresholds, and calculations before generating resident invoices for this billing cycle.</p>
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
                  ⚡ Finalize & Generate Bills
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
                {isSuperAdmin ? (
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
                ) : (
                  <input
                    type="text"
                    disabled
                    value={apartments.find(apt => apt.id === parseInt(billingCycleForm.apartmentId))?.name || localStorage.getItem('colonyName') || 'My Colony'}
                    className="w-full bg-surface-lighter/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-muted cursor-not-allowed"
                  />
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5 block">Building / Block</label>
                {isSuperAdmin ? (
                  <input
                    type="text"
                    placeholder="e.g. Block A (Leave empty for all)"
                    value={billingCycleForm.apartmentBlock}
                    onChange={e => setBillingCycleForm(prev => ({ ...prev, apartmentBlock: e.target.value }))}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/60"
                  />
                ) : (
                  <input
                    type="text"
                    disabled
                    value={billingCycleForm.apartmentBlock || block || 'N/A'}
                    className="w-full bg-surface-lighter/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-muted cursor-not-allowed"
                  />
                )}
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
      {/* Custom Confirm Alert Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(f => ({ ...f, isOpen: false }))}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                zIndex: -1
              }}
            />
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg p-8 rounded-3xl shadow-2xl z-10 space-y-5 border border-border bg-surface text-text"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0 shadow-lg">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wide text-red-500">{confirmModal.title}</h3>
                  <p className="text-sm font-semibold mt-2.5 whitespace-pre-line leading-relaxed text-text-muted">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3.5 pt-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal(f => ({ ...f, isOpen: false }))}
                  className="px-5 py-2.5 bg-surface-lighter hover:bg-surface border border-border rounded-xl text-xs font-bold transition-all cursor-pointer text-text shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                    setConfirmModal(f => ({ ...f, isOpen: false }));
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  Finalize & Lock
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
