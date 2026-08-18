import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Droplet,
  MapPin,
  Building2,
  Send,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  User,
  Activity,
  PhoneCall,
  BellRing,
  Cpu,
  Zap,
  Check,
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  Music
} from 'lucide-react';
import MicSearchBox from '../components/MicSearchBox';
import api from '../api';
import { isSoundEnabled, setSoundEnabled, playNotificationSound } from '../utils/audioNotifier';

export default function LeakDetection() {
  const role = localStorage.getItem('role') || 'ROLE_USER';
  const userBlock = localStorage.getItem('apartmentBlock') || localStorage.getItem('block') || '';
  const userColony = localStorage.getItem('colonyName') || localStorage.getItem('colony') || '';
  const currentUsername = localStorage.getItem('username') || 'admin';
  const isSuperAdmin = role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_ADMIN';
  const isCommunityAdmin = role === 'ROLE_COMMUNITY_ADMIN';
  const isAdmin = isSuperAdmin || isCommunityAdmin;

  // Real backend usage logs and user directory states
  const [usageLogs, setUsageLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Anomaly status tracking state (persisted locally for instant notification status)
  const [anomalyStatuses, setAnomalyStatuses] = useState(() => {
    const saved = localStorage.getItem('aquatrack_anomalies_status');
    return saved ? JSON.parse(saved) : {};
  });

  // UI Filters
  const [searchQ, setSearchQ] = useState('');
  const [colonyFilter, setColonyFilter] = useState('ALL');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [logTypeFilter, setLogTypeFilter] = useState('ALL'); // 'ALL', 'DAILY', 'WEEKLY', 'MONTHLY'

  // Flash Feedback
  const [statusMsg, setStatusMsg] = useState(null);

  // Quick 1-Click Alert Modal
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [activeAnomalyForAlert, setActiveAnomalyForAlert] = useState(null);
  const [customAlertMsg, setCustomAlertMsg] = useState('');

  // Persist status tracking changes
  useEffect(() => {
    localStorage.setItem('aquatrack_anomalies_status', JSON.stringify(anomalyStatuses));
  }, [anomalyStatuses]);

  // Fetch real water consumption logs & users from backend
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let usageUrl = '/usage/all';
      if (isCommunityAdmin && userBlock) {
        usageUrl = `/usage/block/${encodeURIComponent(userBlock)}`;
      }
      const [logRes, userRes] = await Promise.all([
        api.get(usageUrl),
        api.get('/admin/users', { params: { callerRole: role, callerBlock: userBlock } })
      ]);
      setUsageLogs(logRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      console.warn('Error fetching usage logs from backend');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Resolve resident details from house number and block
  const getResidentForLog = (houseNum, aptBlk, seedResident) => {
    if (seedResident) return seedResident;
    if (!houseNum || !aptBlk) return 'Resident User';
    const match = users.find(
      u => String(u.houseNumber) === String(houseNum) &&
           String(u.apartmentBlock).toLowerCase() === String(aptBlk).toLowerCase()
    );
    return match ? (match.fullName || match.username) : `Resident (House #${houseNum})`;
  };

  const getColonyForLog = (aptBlk, seedColony) => {
    if (seedColony) return seedColony;
    if (!aptBlk) return 'Bharat Nagar';
    if (aptBlk.includes('Taj') || aptBlk.includes('Bharat')) return 'Bharat Nagar';
    if (aptBlk.includes('A2') || aptBlk.includes('Amarpur')) return 'Amarpur';
    return 'Sheetal Paradise';
  };

  // 🤖 AUTOMATED SMART METER LEAK & ANOMALY DETECTION ENGINE
  // Dynamic Threshold Engine based on Log Type:
  // 1. DAILY Log: Baseline = 250 L/day, Anomaly Threshold = >300 L/day
  // 2. WEEKLY Log: Baseline = 1,750 L/week, Anomaly Threshold = >2,100 L/week
  // 3. MONTHLY Log: Baseline = 7,500 L/month, Anomaly Threshold = >9,000 L/month
  const detectedAnomalies = useMemo(() => {
    let rawLogs = usageLogs;

    // Scope raw logs to Community Admin's colony & building block if restricted!
    if (isCommunityAdmin && (userBlock || userColony)) {
      rawLogs = rawLogs.filter(log => {
        const logBlock = (log.apartmentBlock || log.block || '').toLowerCase();
        const logColony = (log.colonyName || getColonyForLog(log.apartmentBlock || log.block, log.colonyName)).toLowerCase();
        const matchBlock = userBlock ? logBlock.includes(userBlock.toLowerCase()) : true;
        const matchColony = userColony ? logColony.includes(userColony.toLowerCase()) : true;
        return matchBlock || matchColony;
      });
    }

    const anomalies = [];

    rawLogs.forEach((log, idx) => {
      const logType = String(log.logType || log.periodType || log.type || 'DAILY').toUpperCase();
      const liters = Number(log.litersUsed || log.usageAmount || log.liters || log.readingLiters) || 0;

      // Dynamic Baseline & Threshold Parameters based on Water Log Type
      let baseline = 250;
      let anomalyThreshold = 300;
      let criticalLimit = 800;
      let highLimit = 550;
      let mediumLimit = 400;

      if (logType === 'WEEKLY') {
        baseline = 1750;
        anomalyThreshold = 2100;
        criticalLimit = 5000;
        highLimit = 3500;
        mediumLimit = 2600;
      } else if (logType === 'MONTHLY') {
        baseline = 7500;
        anomalyThreshold = 9000;
        criticalLimit = 20000;
        highLimit = 14000;
        mediumLimit = 11000;
      }

      // Automated Threshold Evaluation
      if (liters > anomalyThreshold) {
        const excessLiters = liters - baseline;

        // Auto-calculate Severity
        let severity = 'LOW';
        let probableCause = `Elevated ${logType.toLowerCase()} water consumption`;
        if (liters >= criticalLimit) {
          severity = 'CRITICAL';
          probableCause = logType === 'DAILY'
            ? 'Main underground pipe burst or open valve'
            : logType === 'WEEKLY'
            ? 'Major continuous weekly leak or broken main line'
            : 'Severe unresolved monthly pipe leak';
        } else if (liters >= highLimit) {
          severity = 'HIGH';
          probableCause = logType === 'DAILY'
            ? 'Overhead tank overflow or pipe rupture'
            : logType === 'WEEKLY'
            ? 'Unattended tank overflow over multiple days'
            : 'High recurring monthly overconsumption';
        } else if (liters >= mediumLimit) {
          severity = 'MEDIUM';
          probableCause = 'Continuous toilet flush or leaking faucet';
        }

        const logId = log.id ? String(log.id) : `LK-AUTO-${idx + 1001}`;
        const houseNum = log.houseNumber || log.houseNo || '102';
        const aptBlk = log.apartmentBlock || log.block || 'Taj Mahal';
        const colonyName = getColonyForLog(aptBlk, log.colonyName);
        const residentName = getResidentForLog(houseNum, aptBlk, log.residentName);
        const currentStatus = anomalyStatuses[logId] || 'UNNOTIFIED'; // UNNOTIFIED, NOTIFIED, RESOLVED

        anomalies.push({
          id: logId,
          logType,
          baseline,
          anomalyThreshold,
          houseNumber: houseNum,
          apartmentBlock: aptBlk,
          colonyName,
          residentName,
          litersUsed: liters,
          excessLiters,
          severity,
          probableCause,
          readingDate: log.readingDate || log.date || new Date().toISOString(),
          status: currentStatus,
          phone: log.phone || '+91 98765 00000'
        });
      }
    });

    return anomalies;
  }, [usageLogs, users, anomalyStatuses, isCommunityAdmin, userBlock, userColony]);

  // Derive unique Colonies and Buildings from detected anomalies
  const availableColonies = useMemo(() => {
    return Array.from(new Set(detectedAnomalies.map(a => a.colonyName).filter(Boolean)));
  }, [detectedAnomalies]);

  const availableBuildings = useMemo(() => {
    return Array.from(
      new Set(
        detectedAnomalies
          .filter(a => colonyFilter === 'ALL' || a.colonyName === colonyFilter)
          .map(a => a.apartmentBlock)
          .filter(Boolean)
      )
    );
  }, [detectedAnomalies, colonyFilter]);

  // Flash banner message trigger
  const triggerStatus = (msg, type = 'success') => {
    setStatusMsg({ msg, type });
    setTimeout(() => setStatusMsg(null), 4500);
  };

  // ⚡ 1-CLICK NOTIFY USER TO CALL PLUMBER ACTION
  const handleOneClickNotify = (anomaly) => {
    const defaultMsg = `⚠️ High Water Consumption Alert: Our smart meter detected ${anomaly.litersUsed} Liters used (${anomaly.excessLiters}L above normal baseline) at House #${anomaly.houseNumber}, ${anomaly.apartmentBlock} (${anomaly.colonyName}). Probable Cause: ${anomaly.probableCause}. Please inspect your plumbing or call a plumber immediately! AquaTrack Emergency Plumber Lead: Ramesh Kumar (+91 98765 43210).`;

    setActiveAnomalyForAlert(anomaly);
    setCustomAlertMsg(defaultMsg);
    setShowAlertModal(true);
  };

  // Sound setting state
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  const toggleSound = () => {
    const nextState = !soundOn;
    setSoundOn(nextState);
    setSoundEnabled(nextState);
    if (nextState) {
      playNotificationSound();
    }
  };

  // Execute Send Notification to Resident
  const confirmSendNotification = async () => {
    if (!activeAnomalyForAlert) return;

    // Play notification water bubble chime
    playNotificationSound();

    const anomaly = activeAnomalyForAlert;
    
    // Find target resident user by matching house number and building block
    const targetUserObj = users.find(
      u => String(u.houseNumber) === String(anomaly.houseNumber) &&
           String(u.apartmentBlock || '').toLowerCase() === String(anomaly.apartmentBlock || '').toLowerCase()
    );
    const targetUsername = targetUserObj ? targetUserObj.username : (anomaly.residentName || 'resident');

    const notificationPayload = {
      id: Date.now(),
      title: `🚨 High Water Consumption & Leak Alert (House #${anomaly.houseNumber})`,
      message: customAlertMsg,
      type: 'LEAK_ALERT',
      severity: anomaly.severity,
      targetHouseNumber: anomaly.houseNumber,
      targetBuilding: anomaly.apartmentBlock,
      targetColony: anomaly.colonyName,
      targetResident: anomaly.residentName,
      sentBy: currentUsername,
      createdAt: new Date().toISOString(),
      read: false
    };

    // Send to backend DB notification API so resident gets it on next login/bell check
    try {
      await api.post('/notifications/send', {
        username: targetUsername,
        title: `🚨 High Water Consumption & Leak Alert (House #${anomaly.houseNumber})`,
        message: customAlertMsg,
        type: 'LEAK_ALERT',
        isRead: false
      });
    } catch (err) {
      console.warn('Backend notification send error, saved to local cache', err);
    }

    // Save to system notifications in localStorage so resident sees it in bell icon
    const existingNotifs = JSON.parse(localStorage.getItem('aquatrack_notifications') || '[]');
    localStorage.setItem('aquatrack_notifications', JSON.stringify([notificationPayload, ...existingNotifs]));

    // Update anomaly status to NOTIFIED
    setAnomalyStatuses(prev => ({
      ...prev,
      [anomaly.id]: 'NOTIFIED'
    }));

    setShowAlertModal(false);
    triggerStatus(
      `⚡ Notification sent to ${anomaly.residentName} (House #${anomaly.houseNumber})! Resident advised to call plumber.`
    );
  };

  // Toggle Anomaly Status (e.g. Mark Resolved)
  const handleToggleStatus = (id, newStatus) => {
    setAnomalyStatuses(prev => ({
      ...prev,
      [id]: newStatus
    }));
    triggerStatus(`Anomaly #${id} status updated to ${newStatus}`);
  };

  // Filtered Anomalies
  const filteredAnomalies = useMemo(() => {
    return detectedAnomalies.filter(a => {
      const matchesQ =
        !searchQ ||
        a.id.toLowerCase().includes(searchQ.toLowerCase()) ||
        a.houseNumber.toLowerCase().includes(searchQ.toLowerCase()) ||
        a.apartmentBlock.toLowerCase().includes(searchQ.toLowerCase()) ||
        a.colonyName.toLowerCase().includes(searchQ.toLowerCase()) ||
        a.residentName.toLowerCase().includes(searchQ.toLowerCase()) ||
        a.probableCause.toLowerCase().includes(searchQ.toLowerCase());

      const matchesColony = colonyFilter === 'ALL' || a.colonyName === colonyFilter;
      const matchesBuilding = buildingFilter === 'ALL' || a.apartmentBlock === buildingFilter;
      const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const matchesLogType = logTypeFilter === 'ALL' || a.logType === logTypeFilter;

      return matchesQ && matchesColony && matchesBuilding && matchesSeverity && matchesStatus && matchesLogType;
    });
  }, [detectedAnomalies, searchQ, colonyFilter, buildingFilter, severityFilter, statusFilter, logTypeFilter]);

  // Aggregate Metrics
  const totalAnomaliesCount = detectedAnomalies.length;
  const unnotifiedCount = detectedAnomalies.filter(a => a.status === 'UNNOTIFIED').length;
  const criticalCount = detectedAnomalies.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
  const totalExcessWaterLiters = detectedAnomalies
    .filter(a => a.status !== 'RESOLVED')
    .reduce((sum, a) => sum + a.excessLiters, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page Header & Automated Engine Status ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/15 border border-cyan-500/30 rounded-full text-cyan-700 dark:text-cyan-300 font-black text-xs uppercase tracking-wider mb-2 shadow-xs">
            <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse shrink-0" />
            {isAdmin ? 'Automated Smart Meter Water Log Analysis Engine' : 'Household Water Safety & Leak Monitor'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <AlertTriangle className="w-7 h-7 text-red-500 shrink-0" />
            {isAdmin ? 'Automated Leak & Anomaly Detection' : 'My Household Leak & Spike Monitor'}
          </h1>
          <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold mt-1 max-w-3xl leading-relaxed">
            {isAdmin 
              ? 'System automatically scans water usage logs. When consumption spikes above expected thresholds, anomalies appear here for 1-click resident notification.'
              : `Real-time automated leak protection for your home (${userBlock || 'Your Flat'}). Smart meter tracking alerts you instantly if continuous leaks or consumption spikes occur in your flat.`}
          </p>
        </div>

        {/* Sleek Icon-Only Action Buttons Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sound Toggle Icon Button */}
          <button
            onClick={toggleSound}
            className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center ${
              soundOn
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                : 'bg-surface text-slate-500 dark:text-slate-400 border-border hover:bg-surface-lighter'
            }`}
            title={soundOn ? 'Sound: ON (Click to mute notification audio)' : 'Sound: OFF (Click to enable notification audio)'}
          >
            {soundOn ? <Volume2 className="w-5 h-5 text-cyan-600 dark:text-cyan-300 animate-pulse" /> : <VolumeX className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
          </button>

          {/* Test Chime Icon Button */}
          {soundOn && (
            <button
              onClick={() => playNotificationSound()}
              className="p-3 bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/40 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
              title="Test notification water bubble chime"
            >
              <Music className="w-5 h-5 text-purple-600 dark:text-purple-300" />
            </button>
          )}

          {/* Re-analyze Logs Icon Button */}
          <button
            onClick={fetchData}
            className="p-3 bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-500/40 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
            title="Re-analyze Smart Meter Water Logs"
          >
            <RefreshCw className={`w-5 h-5 text-blue-600 dark:text-blue-300 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Flash Banner */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMsg.msg}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-text-muted hover:text-text cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Key Metrics Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface border border-red-500/20 p-4.5 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {isAdmin ? 'Detected Anomalies' : 'Household Status'}
            </span>
            <div className={`p-2 rounded-xl border ${totalAnomaliesCount > 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
              {totalAnomaliesCount > 0 ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text">
              {isAdmin ? totalAnomaliesCount : (totalAnomaliesCount > 0 ? 'ATTENTION' : 'SAFE')}
            </span>
            {isAdmin ? (
              <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                {criticalCount} Critical
              </span>
            ) : (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${totalAnomaliesCount > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                {totalAnomaliesCount > 0 ? `${totalAnomaliesCount} Alert(s)` : 'Normal Flow'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            {isAdmin ? 'Automatically flagged by meter logs' : 'Monitored continuously by smart meter'}
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface border border-amber-500/20 p-4.5 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {isAdmin ? 'Awaiting Notification' : 'Daily Safety Baseline'}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">
              {isAdmin ? unnotifiedCount : '250 L'}
            </span>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              {isAdmin ? 'Needs 1-Click Alert' : 'Max Baseline/Day'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            {isAdmin ? 'Notify resident to call plumber' : 'Spikes above 300L trigger safety warnings'}
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface border border-sky-500/20 p-4.5 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl group-hover:bg-sky-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {isAdmin ? 'Excess Water Spikes' : 'My Excess Consumption'}
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Droplet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-sky-400">{totalExcessWaterLiters.toLocaleString()}</span>
            <span className="text-xs font-bold text-text-muted">Liters</span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Above standard expected log baselines</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface border border-emerald-500/20 p-4.5 rounded-2xl shadow-xs relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
              {isAdmin ? 'Resolved Leaks' : 'Plumber Assistance'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text">
              {isAdmin ? detectedAnomalies.filter(a => a.status === 'RESOLVED').length : '24/7'}
            </span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {isAdmin
                ? `${detectedAnomalies.length ? Math.round((detectedAnomalies.filter(a => a.status === 'RESOLVED').length / detectedAnomalies.length) * 100) : 0}% Resolved`
                : 'Community Maintenance'}
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-1">
            {isAdmin ? 'Plumber repairs verified' : 'Immediate building maintenance available'}
          </p>
        </div>
      </div>

      {/* ── Control Panel Grid ────────────────────────────────────────────── */}
      {isAdmin ? (
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          {/* Row 1: Full-Width Search Bar */}
          <div className="w-full">
            <MicSearchBox
              value={searchQ}
              onChange={setSearchQ}
              onClear={() => setSearchQ('')}
              placeholder="Search by house #, building block, colony, or resident name…"
            />
          </div>

          {/* Row 2: Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Water Log Type Filter */}
            <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold w-full">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-text-muted text-xs shrink-0 font-medium">Log Type:</span>
              <select
                value={logTypeFilter}
                onChange={e => setLogTypeFilter(e.target.value)}
                className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm truncate"
              >
                <option value="ALL" className="bg-surface text-text">All Log Types</option>
                <option value="DAILY" className="bg-surface text-cyan-400 font-bold">📅 Daily Logs (&gt;300L)</option>
                <option value="WEEKLY" className="bg-surface text-purple-400 font-bold">🗓️ Weekly Logs (&gt;2,100L)</option>
                <option value="MONTHLY" className="bg-surface text-indigo-400 font-bold">📆 Monthly Logs (&gt;9,000L)</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold w-full">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-text-muted text-xs shrink-0 font-medium">Severity:</span>
              <select
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value)}
                className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm truncate"
              >
                <option value="ALL" className="bg-surface text-text">All Severities</option>
                <option value="CRITICAL" className="bg-surface text-red-500 font-bold">CRITICAL</option>
                <option value="HIGH" className="bg-surface text-orange-400 font-bold">HIGH</option>
                <option value="MEDIUM" className="bg-surface text-amber-400 font-bold">MEDIUM</option>
                <option value="LOW" className="bg-surface text-blue-400 font-bold">LOW</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold w-full">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-text-muted text-xs shrink-0 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm truncate"
              >
                <option value="ALL" className="bg-surface text-text">All Statuses</option>
                <option value="UNNOTIFIED" className="bg-surface text-amber-400 font-bold">Awaiting Alert</option>
                <option value="NOTIFIED" className="bg-surface text-blue-400 font-bold">Resident Notified</option>
                <option value="RESOLVED" className="bg-surface text-emerald-400 font-bold">Resolved</option>
              </select>
            </div>

            {/* Colony Filter (Super Admin Only) */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold w-full">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-text-muted text-xs shrink-0 font-medium">Community:</span>
                <select
                  value={colonyFilter}
                  onChange={e => {
                    setColonyFilter(e.target.value);
                    setBuildingFilter('ALL');
                  }}
                  className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm truncate"
                >
                  <option value="ALL" className="bg-surface text-text">All Communities</option>
                  {availableColonies.map(col => (
                    <option key={col} value={col} className="bg-surface text-text">{col}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Filter Clear Bar if any active */}
          {(colonyFilter !== 'ALL' || buildingFilter !== 'ALL' || severityFilter !== 'ALL' || statusFilter !== 'ALL' || logTypeFilter !== 'ALL' || searchQ) && (
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={() => {
                  setColonyFilter('ALL');
                  setBuildingFilter('ALL');
                  setSeverityFilter('ALL');
                  setStatusFilter('ALL');
                  setLogTypeFilter('ALL');
                  setSearchQ('');
                }}
                className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <X className="w-4 h-4" /> Reset Active Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Resident Single-Row Control Panel */
        <div className="bg-surface border border-border/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 w-full">
              <MicSearchBox
                value={searchQ}
                onChange={setSearchQ}
                onClear={() => setSearchQ('')}
                placeholder="Search reading dates or probable causes…"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              {/* Severity Filter */}
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold min-w-[165px]">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-text-muted text-xs shrink-0 font-medium">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm truncate"
                >
                  <option value="ALL" className="bg-surface text-text">All Severities</option>
                  <option value="CRITICAL" className="bg-surface text-red-500 font-bold">CRITICAL (&gt; 800L)</option>
                  <option value="HIGH" className="bg-surface text-orange-400 font-bold">HIGH (&gt; 550L)</option>
                  <option value="MEDIUM" className="bg-surface text-amber-400 font-bold">MEDIUM (&gt; 400L)</option>
                  <option value="LOW" className="bg-surface text-blue-400 font-bold">LOW (&gt; 300L)</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold min-w-[165px]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-text-muted text-xs shrink-0 font-medium">Status:</span>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm truncate"
                >
                  <option value="ALL" className="bg-surface text-text">All Statuses</option>
                  <option value="UNNOTIFIED" className="bg-surface text-amber-400 font-bold">Awaiting Alert</option>
                  <option value="NOTIFIED" className="bg-surface text-blue-400 font-bold">Notified</option>
                  <option value="RESOLVED" className="bg-surface text-emerald-400 font-bold">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Clear Bar for Residents */}
          {(severityFilter !== 'ALL' || statusFilter !== 'ALL' || searchQ) && (
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={() => {
                  setSeverityFilter('ALL');
                  setStatusFilter('ALL');
                  setSearchQ('');
                }}
                className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Automatically Flagged Water Log Anomalies List ───────────────── */}
      {filteredAnomalies.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center text-text-muted space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 opacity-60" />
          <h3 className="text-base font-bold text-text">No Water Consumption Spikes Detected</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            All current water meter reading logs are within normal daily baseline limits (&lt; 300 Liters).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredAnomalies.map(anomaly => {
            const isCritical = anomaly.severity === 'CRITICAL';
            const isNotified = anomaly.status === 'NOTIFIED';
            const isResolved = anomaly.status === 'RESOLVED';

            return (
              <motion.div
                key={anomaly.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-surface border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between relative overflow-hidden ${
                  isCritical && !isResolved
                    ? 'border-red-500/40 shadow-red-500/5 bg-gradient-to-b from-red-500/5 to-transparent'
                    : isNotified
                    ? 'border-blue-500/30'
                    : isResolved
                    ? 'border-emerald-500/20 opacity-90'
                    : 'border-border'
                }`}
              >
                {/* Top Badge Row */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-surface-lighter border border-border text-text font-mono">
                        House #{anomaly.houseNumber}
                      </span>
                      <span className="text-xs font-bold text-text-muted truncate max-w-[120px]">
                        {anomaly.residentName}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1 ${
                        anomaly.severity === 'CRITICAL'
                          ? 'bg-red-500/15 text-red-500 border-red-500/30 animate-pulse'
                          : anomaly.severity === 'HIGH'
                          ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                          : anomaly.severity === 'MEDIUM'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {anomaly.severity}
                    </span>
                  </div>

                  {/* Water Spike Metrics Header */}
                  <div className="bg-surface-lighter/80 border border-border/80 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-muted">Analyzed Log Volume:</span>
                      <span className="text-sm font-black text-red-500 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-red-500" />
                        {anomaly.litersUsed.toLocaleString()} Liters
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-text-muted">Excess (Expected {anomaly.baseline}L):</span>
                      <span className="font-extrabold text-amber-400">+{anomaly.excessLiters.toLocaleString()} L</span>
                    </div>
                  </div>

                  {/* Hierarchy & Log Type Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {anomaly.logType === 'DAILY' ? 'Daily Log' : anomaly.logType === 'WEEKLY' ? 'Weekly Log' : 'Monthly Log'}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-blue-500" />
                      {anomaly.colonyName}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-purple-500" />
                      {anomaly.apartmentBlock}
                    </span>
                  </div>

                  {/* Probable Cause & Timestamp */}
                  <div className="text-xs space-y-1 pt-1">
                    <p className="text-text font-semibold flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="text-text-muted font-normal">System Diagnosis:</span> {anomaly.probableCause}
                    </p>
                  </div>
                </div>

                {/* Footer Actions: 1-Click Resident Notification Button */}
                <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
                  {!isResolved ? (
                    <button
                      onClick={() => handleOneClickNotify(anomaly)}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer border active:scale-95 ${
                        isNotified
                          ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30'
                          : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white border-red-400/30 shadow-red-600/20'
                      }`}
                      title="Send instant notification to resident to inspect plumbing and call plumber"
                    >
                      <Zap className="w-4 h-4 shrink-0 fill-current" />
                      <span>{isNotified ? '⚡ Re-Notify Resident (Call Plumber)' : '⚡ 1-Click Notify Resident (Call Plumber)'}</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Leak Resolved by Resident / Plumber</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-xs pt-1">
                    <span className="text-text-muted font-medium text-[11px]">
                      {isNotified ? '✅ Resident Informed' : isResolved ? '✅ Resolved' : '⏳ Action Required'}
                    </span>

                    {isAdmin && (
                      <button
                        onClick={() => handleToggleStatus(anomaly.id, isResolved ? 'UNNOTIFIED' : 'RESOLVED')}
                        className="text-[11px] font-bold text-text-muted hover:text-text underline cursor-pointer"
                      >
                        {isResolved ? 'Re-open Anomaly' : 'Mark as Resolved'}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── 1-CLICK RESIDENT EMERGENCY ALERT MODAL ───────────────────────── */}
      <AnimatePresence>
        {showAlertModal && activeAnomalyForAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-red-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-text text-base sm:text-lg">
                      1-Click Resident Alert (Call Plumber)
                    </h3>
                    <p className="text-text-muted text-xs">
                      Send direct high-consumption warning & emergency plumber contact
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="p-1.5 text-text-muted hover:text-text rounded-xl hover:bg-surface-lighter cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Resident Target Summary Card */}
              <div className="bg-surface-lighter/90 border border-border p-3.5 rounded-2xl space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted font-medium">Target Resident:</span>
                  <span className="font-black text-text">{activeAnomalyForAlert.residentName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted font-medium">Unit Location:</span>
                  <span className="font-bold text-primary">
                    House #{activeAnomalyForAlert.houseNumber}, {activeAnomalyForAlert.apartmentBlock} ({activeAnomalyForAlert.colonyName})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted font-medium">Meter Consumption:</span>
                  <span className="font-black text-red-500">
                    {activeAnomalyForAlert.litersUsed} L (Excess: +{activeAnomalyForAlert.excessLiters} L)
                  </span>
                </div>
              </div>

              {/* Notification Message Preview */}
              <div className="space-y-2 text-xs">
                <label className="block font-bold text-text-muted">Generated Alert Message Body (Editable):</label>
                <textarea
                  rows={5}
                  value={customAlertMsg}
                  onChange={e => setCustomAlertMsg(e.target.value)}
                  className="w-full p-3 bg-surface-lighter border border-border rounded-xl font-medium text-text focus:outline-none focus:border-red-500 resize-none leading-relaxed text-xs"
                />
              </div>

              {/* Verified Plumber Lead Hotline Card */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-400 block">Emergency Plumber Lead</span>
                    <span className="text-text-muted text-[11px]">Ramesh Kumar Plumbing Services</span>
                  </div>
                </div>
                <span className="font-black text-emerald-400 font-mono">+91 98765 43210</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="px-4 py-2.5 bg-surface-lighter hover:bg-surface border border-border rounded-xl text-xs font-bold text-text-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmSendNotification}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-red-600/25 cursor-pointer flex items-center gap-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Alert Now</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
