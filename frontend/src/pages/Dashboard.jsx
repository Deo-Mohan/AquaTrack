import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Receipt, AlertTriangle, TrendingDown, Upload, FileText, CheckCircle2, ShieldAlert, ShieldCheck, X, AlertCircle, Loader2, ArrowRight, Clock, Info, Zap, BarChart3, Lightbulb, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Cell
} from 'recharts';
import api from '../api';
import ErrorBoundary from '../components/ErrorBoundary';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#06b6d4', '#6366f1', '#f97316'];

const WeeklyTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div 
        className="bg-slate-900/95 border border-slate-700/90 p-2.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px] text-slate-300 w-56 pointer-events-auto select-text z-50"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="font-bold text-xs text-white mb-1">{data.name}</p>
        <p className="mb-2"><span className="text-slate-400">Total Usage:</span> <strong className="text-primary font-bold text-xs">{data.usage.toLocaleString()} L</strong></p>

        {data.items && data.items.length > 0 ? (
          <div className="space-y-1 border-t border-slate-800 pt-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Logged Entries ({data.items.length}):</p>
            {data.items.map((item, idx) => (
              <div key={idx} className="bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50 flex items-center justify-between gap-2 hover:bg-slate-800 transition-colors">
                <div>
                  <p className="text-white font-semibold text-xs">{item.liters.toLocaleString()} L</p>
                  <p className="text-slate-400 text-[9px]">{item.dayName}</p>
                </div>
                <span className="text-slate-400 text-[9px] whitespace-nowrap">{item.dateStr}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 italic mt-1 text-[10px]">No readings logged for this week.</p>
        )}
      </div>
    );
  }
  return null;
};
const CustomXAxisTick = ({ x, y, payload }) => {
  if (!payload || !payload.value) return null;
  const parts = payload.value.split(' ');
  const weekLabel = `${parts[0] || ''} ${parts[1] || ''}`;
  const rangeLabel = parts[2] || '';

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="middle" fill="#94a3b8" fontSize={11} className="font-semibold">
        <tspan x={0} dy={10}>{weekLabel}</tspan>
        {rangeLabel && <tspan x={0} dy={14} fill="#64748b" className="font-medium text-[9px]">{rangeLabel}</tspan>}
      </text>
    </g>
  );
};

const getGreeting = () => {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
};

const StatCard = ({ title, value, subtitle, infoNote, icon: Icon, svgSrc, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-card p-6 relative overflow-hidden group flex flex-col justify-between"
  >
    <div>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-text-muted text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-text tracking-tight">{value}</h3>
        </div>
        {svgSrc ? (
          <motion.img 
            src={svgSrc} 
            alt={title} 
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain group-hover:scale-110 transition-transform duration-300 -mt-2 -mr-2"
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          />
        ) : (
          <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {subtitle && (
        <div className="flex items-center text-xs font-semibold text-emerald-400 mb-1">
          <span>{subtitle}</span>
        </div>
      )}
    </div>

    {infoNote && (
      <div className="mt-3 pt-2.5 border-t border-border/40 flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-300/90 font-medium">
        <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" />
        <span>{infoNote}</span>
      </div>
    )}
    <div className={`absolute -right-10 -bottom-10 w-32 h-32 bg-${color}-500/5 rounded-full blur-2xl group-hover:bg-${color}-500/10 transition-colors`} />
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    monthlyUsage: 0,
    averageDailyUsage: 0,
    unpaidBillAmount: 0,
    latestReading: 0,
    latestReadingDate: 'N/A'
  });
  const userRole = localStorage.getItem('role') || 'ROLE_RESIDENT';
  const [verificationStatus, setVerificationStatus] = useState('APPROVED'); // APPROVED, PENDING_VERIFICATION, REJECTED, NOT_SUBMITTED
  const [rejectReason, setRejectReason] = useState('');
  const [docType, setDocType] = useState('Aadhaar Card');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    setUploadLoading(true);
    setUploadProgress(0);
    setErrorMsg('');
    setSuccessMsg('');
    const formDataObj = new FormData();
    formDataObj.append('username', username);
    formDataObj.append('documentType', docType);
    formDataObj.append('file', selectedFile);

    try {
      const response = await api.post('/users/profile/verify/upload', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      setVerificationStatus('PENDING_VERIFICATION');
      setSuccessMsg(response.data.message || 'Document uploaded successfully.');
      setSelectedFile(null);
    } catch (err) {
      setErrorMsg(
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message || err.response?.data?.error || 'Failed to upload document. Please try again.'
      );
    } finally {
      setUploadLoading(false);
    }
  };
  const [alerts, setAlerts] = useState([]);
  const [rawLogs, setRawLogs] = useState([]);
  const [selectedWeeklyMonth, setSelectedWeeklyMonth] = useState(new Date().getMonth() + 1);
  const [monthlyUsageData, setMonthlyUsageData] = useState([]);

  const getWeeklyDataForMonth = (logs, monthVal) => {
    const targetYear = new Date().getFullYear();
    const monthLogs = logs.filter(log => {
      const d = new Date(log.readingDate);
      return d.getFullYear() === targetYear && (d.getMonth() + 1) === monthVal;
    });

    const weeks = [
      { name: 'Week 1 (1-7)', minDay: 1, maxDay: 7, usage: 0, items: [] },
      { name: 'Week 2 (8-14)', minDay: 8, maxDay: 14, usage: 0, items: [] },
      { name: 'Week 3 (15-21)', minDay: 15, maxDay: 21, usage: 0, items: [] },
      { name: 'Week 4 (22+)', minDay: 22, maxDay: 31, usage: 0, items: [] }
    ];

    monthLogs.forEach(log => {
      const logDate = new Date(log.readingDate);
      const day = logDate.getDate();
      const week = weeks.find(w => day >= w.minDay && day <= w.maxDay);
      if (week) {
        week.usage += log.readingLiters;
        week.items.push({
          liters: log.readingLiters,
          dateStr: log.readingDate,
          dayName: logDate.toLocaleDateString('en-US', { weekday: 'long' })
        });
      }
    });

    return weeks.map(w => ({ name: w.name, usage: w.usage, items: w.items }));
  };

  const weeklyUsage = getWeeklyDataForMonth(rawLogs, selectedWeeklyMonth);
  const username = localStorage.getItem('username') || 'Household User';
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem('fullName') || localStorage.getItem('username') || 'Household User';
  });
  const [loading, setLoading] = useState(true);
  const [showResidentHelp, setShowResidentHelp] = useState(true);
  const [quickHelpModalOpen, setQuickHelpModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [safeWaterLimit, setSafeWaterLimit] = useState(0); // monthlyLimitLiters from CA tariff
  const [baseRatePerLiter, setBaseRatePerLiter] = useState(0);
  const [excessRatePerLiter, setExcessRatePerLiter] = useState(0);
  const [gracePeriodDays, setGracePeriodDays] = useState(20);
  const [lateFeePerMonth, setLateFeePerMonth] = useState(0);
  const [monthlyChartType, setMonthlyChartType] = useState('area'); // area, bar, line
  const [weeklyChartType, setWeeklyChartType] = useState('bar'); // bar, line, area
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);

  const handleRemoveAlert = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setAlerts(prev => {
        const nextAlerts = prev.filter(alert => alert.id !== id);
        if (currentAlertIndex >= nextAlerts.length && nextAlerts.length > 0) {
          setCurrentAlertIndex(nextAlerts.length - 1);
        }
        return nextAlerts;
      });
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const handleClearAllAlerts = async () => {
    if (alerts.length === 0) return;
    try {
      await Promise.all(alerts.map(a => api.delete(`/notifications/${a.id}`).catch(() => {})));
      setAlerts([]);
      setCurrentAlertIndex(0);
    } catch (err) {
      console.error("Error clearing all notifications:", err);
      setAlerts([]);
      setCurrentAlertIndex(0);
    }
  };

  const [comparisonDate, setComparisonDate] = useState(new Date());

  const getUsageForMonth = (logs, dateObj) => {
    const targetMonth = dateObj.getMonth();
    const targetYear = dateObj.getFullYear();
    let total = 0;
    logs.forEach(log => {
      const d = new Date(log.readingDate);
      if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
        total += log.readingLiters;
      }
    });
    return total;
  };

  const latestVal = getUsageForMonth(rawLogs, comparisonDate);
  const avgVal = safeWaterLimit > 0 ? safeWaterLimit : 0;
  const maxVal = Math.max(latestVal, avgVal, 1);
  const userPercentage = Math.round((latestVal * 100) / maxVal);
  const avgPercentage = avgVal > 0 ? Math.round((avgVal * 100) / maxVal) : 0;

  const getLast6MonthsData = (logs) => {
    const months = [];
    const now = new Date();
    const targetYear = now.getFullYear();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 12; i++) {
      months.push({
        name: monthNames[i],
        year: targetYear,
        monthNum: i,
        usage: 0
      });
    }

    if (logs && logs.length > 0) {
      logs.forEach(log => {
        const logDate = new Date(log.readingDate);
        const logMonth = logDate.getMonth();
        const logYear = logDate.getFullYear();

        const match = months.find(m => m.monthNum === logMonth && m.year === logYear);
        if (match) {
          match.usage += log.readingLiters;
        }
      });
    }

    return months.map(({ name, usage }) => ({ name, usage }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const houseNumber = localStorage.getItem('houseNumber');
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');

        let currentStatus = 'APPROVED';

        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Fetch profile status
          try {
            const profileRes = await api.get(`/users/profile/${username}`);
            if (profileRes.data) {
              currentStatus = profileRes.data.verificationStatus || 'NOT_SUBMITTED';
              setVerificationStatus(currentStatus);
              setRejectReason(profileRes.data.verificationRejectReason || '');
              if (profileRes.data.fullName) {
                setDisplayName(profileRes.data.fullName);
              }

              let limit = profileRes.data.monthlyLimitLiters || 0;
              let baseRate = profileRes.data.waterRatePerLiter || 0;
              let excessRate = profileRes.data.excessRatePerLiter || 0;
              let graceDays = profileRes.data.gracePeriodDays || 20;
              let lateFee = profileRes.data.lateFeePerMonth || 0;

              // Fallback to fetch from block tariff configured by Community Admin
              try {
                const tariffRes = await api.get(`/tariff?callerUsername=${username}`);
                if (tariffRes.data) {
                  if (limit === 0) limit = tariffRes.data.monthlyLimitLiters || 0;
                  if (baseRate === 0) baseRate = tariffRes.data.baseRatePerLiter || 0;
                  if (excessRate === 0) excessRate = tariffRes.data.excessRatePerLiter || 0;
                  if (tariffRes.data.gracePeriodDays) graceDays = tariffRes.data.gracePeriodDays;
                  if (tariffRes.data.lateFeePerMonth) lateFee = tariffRes.data.lateFeePerMonth;
                }
              } catch (err) {
                console.error("Error fetching block tariff fallback:", err);
              }

              if (limit > 0) {
                setSafeWaterLimit(limit);
              }
              setBaseRatePerLiter(baseRate);
              setExcessRatePerLiter(excessRate);
              setGracePeriodDays(graceDays);
              setLateFeePerMonth(lateFee);
            }
          } catch (e) {
            console.error("Error fetching user profile:", e);
          }

          // If resident is not approved, we don't load other dashboard details
          if (role !== 'ROLE_RESIDENT' || currentStatus === 'APPROVED' || currentStatus === 'VERIFIED') {
            if (houseNumber) {
              // 1. Fetch dashboard stats
              const statsRes = await api.get(`/dashboard/household/${houseNumber}`);
              if (statsRes.data) {
                setStats({
                  monthlyUsage: statsRes.data.monthlyUsage || 0,
                  averageDailyUsage: statsRes.data.averageDailyUsage || 0,
                  unpaidBillAmount: statsRes.data.unpaidBillAmount || 0,
                  latestReading: statsRes.data.latestReading || 0,
                  latestReadingDate: statsRes.data.latestReadingDate || 'N/A'
                });
              }

              // 2. Fetch usage logs for charts
              const usageRes = await api.get(`/usage/household/${houseNumber}`);
              if (usageRes.data && usageRes.data.length > 0) {
                const sortedLogs = [...usageRes.data].sort((a, b) => new Date(a.readingDate) - new Date(b.readingDate));
                setRawLogs(sortedLogs);
                setMonthlyUsageData(getLast6MonthsData(sortedLogs));
              } else {
                setRawLogs([]);
                setMonthlyUsageData(getLast6MonthsData([]));
              }
            }

            // 3. Fetch recent alerts/notifications
            if (username) {
              const alertsRes = await api.get(`/notifications/${username}`);
              if (alertsRes.data) {
                setAlerts(alertsRes.data);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching household dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Welcome Section Skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-64 rounded-lg skeleton-pulse" />
          <div className="h-4 w-96 rounded-lg skeleton-pulse" />
        </div>

        {/* Quick Guide Skeleton */}
        <div className="h-16 w-full rounded-2xl skeleton-pulse" />

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-32 rounded-2xl skeleton-pulse" />
          <div className="h-32 rounded-2xl skeleton-pulse" />
          <div className="h-32 rounded-2xl skeleton-pulse" />
        </div>

        {/* Charts Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 lg:col-span-2 rounded-2xl skeleton-pulse" />
          <div className="h-80 rounded-2xl skeleton-pulse" />
        </div>
      </div>
    );
  }

  if (userRole === 'ROLE_RESIDENT' && verificationStatus !== 'APPROVED' && verificationStatus !== 'VERIFIED') {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-8 px-4">
        {/* Modern Header Banner */}
        <div className="flex flex-col items-center text-center relative">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-blue-500/20 border border-primary/30 flex items-center justify-center shadow-xl shadow-primary/10 backdrop-blur-md">
              <ShieldAlert className="w-10 h-10 text-primary drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <h1 className="text-3xl font-black text-text tracking-tight">Profile Verification Required</h1>
          <p className="text-text-muted mt-2 text-sm max-w-lg leading-relaxed">
            Verify your household profile with a valid document to unlock your real-time water usage dashboard, invoice downloads, and smart telemetry metrics.
          </p>

          {/* Verification Process Stepper */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-lg mt-6 pt-6 border-t border-border/50 text-xs">
            <div className={`flex flex-col items-center gap-1.5 font-bold ${verificationStatus === 'NOT_SUBMITTED' ? 'text-primary' : 'text-emerald-500'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${verificationStatus === 'NOT_SUBMITTED' ? 'bg-primary/10 border-primary text-primary' : 'bg-emerald-500/10 border-emerald-500 text-emerald-500'}`}>
                1
              </div>
              <span>Upload Document</span>
            </div>
            <div className={`flex flex-col items-center gap-1.5 font-bold ${verificationStatus === 'PENDING_VERIFICATION' ? 'text-amber-500' : 'text-text-muted'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border ${verificationStatus === 'PENDING_VERIFICATION' ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-surface-lighter border-border text-text-muted'}`}>
                2
              </div>
              <span>Admin Review</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 font-bold text-text-muted">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border bg-surface-lighter border-border text-text-muted">
                3
              </div>
              <span>Full Access</span>
            </div>
          </div>
        </div>

        {/* Form / Status Card Container */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 border-primary/20 relative overflow-hidden shadow-2xl rounded-3xl"
        >
          {verificationStatus === 'NOT_SUBMITTED' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 text-text">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-sm text-text block mb-0.5">Proof of Residence Submission</span>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Please upload an official government ID or utility bill (Aadhaar, Electricity Bill, Rent Agreement, PAN Card) matching your apartment details.
                  </p>
                </div>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-5">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-widest text-text-muted mb-2">Select Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text font-semibold focus:outline-none focus:border-primary cursor-pointer shadow-sm"
                  >
                    <option value="Aadhaar Card">🪪 Aadhaar Card</option>
                    <option value="PAN Card">💳 PAN Card</option>
                    <option value="Rent Agreement">📜 Rent Agreement</option>
                    <option value="Electric Bill">⚡ Electric Utility Bill</option>
                    <option value="Driver's License">🚗 Driver's License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-widest text-text-muted mb-2">Upload Document File</label>
                  <div className="border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative bg-surface-lighter/30 hover:bg-primary/5 group">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <Upload className="w-7 h-7" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 block">File Selected</span>
                        <span className="text-sm font-bold text-text block mt-1 bg-surface border border-border px-3 py-1.5 rounded-lg inline-block shadow-sm">
                          {selectedFile.name}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-text block group-hover:text-primary transition-colors">Drag & Drop or Click to Browse File</span>
                        <span className="text-xs text-text-muted mt-1.5 block">Supports PDF, PNG, JPG, JPEG (Max size: 5MB)</span>
                      </>
                    )}
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {uploadLoading && (
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-xs font-bold text-text-muted">
                      <span>Encrypting & uploading document...</span>
                      <span className="text-primary font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-lighter rounded-full overflow-hidden p-0.5 border border-border">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadLoading || !selectedFile}
                  className="btn-next w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none mt-4 shadow-lg shadow-primary/20"
                >
                  {uploadLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading Proof ({uploadProgress}%)</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Submit Document for Verification</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </button>
              </form>
            </div>
          )}

          {verificationStatus === 'PENDING_VERIFICATION' && (
            <div className="flex flex-col items-center py-8 text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
                  <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-black text-text">Verification Pending Review</h3>
              <p className="text-text-muted text-sm max-w-md leading-relaxed">
                Your submitted document has been securely received and is currently undergoing manual verification by your Community Administrator.
              </p>
              <div className="mt-4 px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-400 font-extrabold tracking-wider uppercase">
                Status: PENDING ADMIN APPROVAL
              </div>
            </div>
          )}

          {verificationStatus === 'REJECTED' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <div className="flex items-center gap-2.5 font-bold mb-1.5 text-base">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Document Verification Rejected</span>
                </div>
                <p className="text-xs leading-relaxed text-red-300">
                  <strong>Reason for Rejection: </strong> {rejectReason || "The submitted document could not be verified or apartment details mismatched."}
                </p>
              </div>

              <div className="text-xs font-extrabold uppercase tracking-widest text-text-muted">
                Please re-upload a valid proof document below:
              </div>

              <form onSubmit={handleFileUpload} className="space-y-5">
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-widest text-text-muted mb-2">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text font-semibold focus:outline-none focus:border-primary cursor-pointer shadow-sm"
                  >
                    <option value="Aadhaar Card">🪪 Aadhaar Card</option>
                    <option value="PAN Card">💳 PAN Card</option>
                    <option value="Rent Agreement">📜 Rent Agreement</option>
                    <option value="Electric Bill">⚡ Electric Utility Bill</option>
                    <option value="Driver's License">🚗 Driver's License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-widest text-text-muted mb-2">Select New Document File</label>
                  <div className="border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 relative bg-surface-lighter/30 hover:bg-primary/5 group">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto mb-3 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <Upload className="w-7 h-7" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 block">File Selected</span>
                        <span className="text-sm font-bold text-text block mt-1 bg-surface border border-border px-3 py-1.5 rounded-lg inline-block shadow-sm">
                          {selectedFile.name}
                        </span>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-bold text-text block group-hover:text-primary transition-colors">Drag & Drop or Click to Browse File</span>
                        <span className="text-xs text-text-muted mt-1.5 block">Supports PDF, PNG, JPG, JPEG (Max size: 5MB)</span>
                      </>
                    )}
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {uploadLoading && (
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-xs font-bold text-text-muted">
                      <span>Encrypting & uploading document...</span>
                      <span className="text-primary font-mono">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-lighter rounded-full overflow-hidden p-0.5 border border-border">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadLoading || !selectedFile}
                  className="btn-next w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none mt-4 shadow-lg shadow-primary/20"
                >
                  {uploadLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading ({uploadProgress}%)</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span>Re-upload & Re-submit Document</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Household User Dashboard</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1 text-sm text-text-muted">
            <span>{getGreeting()}, <span className="font-extrabold text-amber-500 dark:text-amber-400 capitalize" lang="en">{displayName}</span></span>
            <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0 hidden sm:inline" />
            <div className="flex items-center gap-1.5 bg-surface-lighter/50 px-2.5 py-0.5 rounded-full border border-border/60 text-xs">
              <span className="text-text-muted font-medium">Block:</span>
              <strong className="text-primary font-semibold notranslate" translate="no">{localStorage.getItem('apartmentBlock') || 'The White House'}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-lighter/50 px-2.5 py-0.5 rounded-full border border-border/60 text-xs">
              <span className="text-text-muted font-medium">Flat:</span>
              <strong className="text-primary font-semibold capitalize" lang="en">{localStorage.getItem('houseNumber') || 'N/A'}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-lighter/50 px-2.5 py-0.5 rounded-full border border-border/60 text-xs">
              <span className="text-text-muted font-medium">Community/Area:</span>
              <strong className="text-emerald-400 font-semibold notranslate" translate="no">{localStorage.getItem('colonyName') || 'Bharat Nagar'}</strong>
            </div>
          </div>
        </div>

        {/* Glowing bulb for quick guide */}
        <div className="relative pb-1" style={{ zIndex: 10 }}>
          <button
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setQuickHelpModalOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500 dark:bg-yellow-500/10 text-white dark:text-yellow-400 hover:bg-amber-600 dark:hover:bg-yellow-500/20 border border-amber-600 dark:border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.25)] hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] hover:scale-105 transition-all cursor-pointer animate-pulse focus:outline-none"
          >
            <Lightbulb className="w-5 h-5 text-white dark:text-yellow-400 fill-white/20 dark:fill-yellow-400/20" />
          </button>
          {showTooltip && (
            <div className="absolute right-0 top-11 whitespace-nowrap bg-surface-lighter border border-border text-text text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md z-50">
              Quick guide to help you
            </div>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Latest Meter Reading"
          value={`${stats.latestReading} L`}
          subtitle={stats.latestReadingDate !== 'N/A' ? `Logged: ${stats.latestReadingDate}` : "No usage logs"}
          svgSrc="/empty_state_meter_reading.svg"
          color="blue"
          delay={0.1}
        />
        <StatCard
          title="Current Bill (Est)"
          value={`₹${stats.unpaidBillAmount.toFixed(2)}`}
          subtitle={stats.unpaidBillAmount > 0 ? "Pending Payment" : "No Unpaid Bills"}
          infoNote={`Pay within ${gracePeriodDays} days of bill generation to avoid late fee penalties.`}
          svgSrc="/empty_state_generate_bill.svg"
          color="emerald"
          delay={0.2}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="glass-card p-6 lg:col-span-2 flex flex-col justify-center"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Recent Alerts</h3>
            {alerts.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearAllAlerts}
                  className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                  title="Clear all alerts"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">
                  {alerts.length} New
                </span>
              </div>
            )}
          </div>
          <div className="space-y-3 min-h-[110px] flex flex-col justify-between">
            {alerts.length > 0 ? (
              (() => {
                const alert = alerts[currentAlertIndex];
                if (!alert) return null;
                return (
                  <div key={alert.id || currentAlertIndex} className="flex items-start justify-between gap-3 p-3.5 rounded-xl transition-all alert-card-warning group/alert relative animate-fadeIn">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold alert-title">{alert.title}</p>
                        <p className="text-xs alert-message mt-1 font-medium">{alert.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAlert(alert.id)}
                      className="p-1 rounded-full text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer focus:outline-none shrink-0"
                      title="Dismiss alert"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className="flex items-start gap-3 p-3.5 rounded-xl transition-all alert-card-success">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs alert-message font-medium">No active alerts or overuse notifications.</p>
                </div>
              </div>
            )}

            {alerts.length > 1 && (
              <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-1">
                <button
                  onClick={() => setCurrentAlertIndex(prev => (prev - 1 + alerts.length) % alerts.length)}
                  className="p-1.5 rounded-lg bg-surface-lighter hover:bg-surface-lighter/80 text-text-muted hover:text-text border border-border/40 hover:border-border transition-all cursor-pointer focus:outline-none shrink-0"
                  title="Previous Alert"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-text-muted/80">
                  Alert {currentAlertIndex + 1} of {alerts.length}
                </span>
                <button
                  onClick={() => setCurrentAlertIndex(prev => (prev + 1) % alerts.length)}
                  className="p-1.5 rounded-lg bg-surface-lighter hover:bg-surface-lighter/80 text-text-muted hover:text-text border border-border/40 hover:border-border transition-all cursor-pointer focus:outline-none shrink-0"
                  title="Next Alert"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="glass-card p-6 lg:col-span-2 min-h-[350px]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="font-semibold text-text">Monthly Consumption Chart</h3>
            <select
              value={monthlyChartType}
              onChange={(e) => setMonthlyChartType(e.target.value)}
              className="bg-surface-lighter border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="area">Area Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
            </select>
          </div>
          <div className="overflow-x-auto w-full custom-scrollbar">
            <div className="h-[250px] min-w-[700px]">
              <ErrorBoundary fallbackText="Monthly Usage chart could not be loaded.">
                {monthlyUsageData.length > 0 && monthlyUsageData.some(d => d.usage > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    if (monthlyChartType === 'bar') {
                      return (
                        <BarChart data={monthlyUsageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            labelStyle={{ color: '#f8fafc' }}
                            itemStyle={{ color: '#cbd5e1' }}
                          />
                          <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                            {monthlyUsageData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      );
                    }
                    if (monthlyChartType === 'line') {
                      return (
                        <LineChart data={monthlyUsageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            labelStyle={{ color: '#f8fafc' }}
                            itemStyle={{ color: '#cbd5e1' }}
                          />
                          <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      );
                    }
                    return (
                      <AreaChart data={monthlyUsageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#f8fafc' }}
                          itemStyle={{ color: '#cbd5e1' }}
                        />
                        <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
                      </AreaChart>
                    );
                  })()}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <motion.img 
                    src="/empty_state_charts_analytics.svg" 
                    alt="No Monthly Usage Data" 
                    className="w-36 sm:w-44 object-contain mb-3 drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  />
                  <p className="text-text font-black text-base">No Monthly Water Consumption Recorded</p>
                  <p className="text-text-muted text-xs mt-1 max-w-sm">Monthly consumption metrics and trend charts will automatically populate here once water meter readings are logged.</p>
                </div>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="glass-card p-6 min-h-[350px]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="font-semibold text-text">Weekly Usage (Liters)</h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedWeeklyMonth}
                onChange={(e) => setSelectedWeeklyMonth(parseInt(e.target.value, 10))}
                className="bg-surface-lighter border border-border rounded-lg px-2.5 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold"
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((mName, idx) => (
                  <option key={mName} value={idx + 1}>{mName}</option>
                ))}
              </select>

              <select
                value={weeklyChartType}
                onChange={(e) => setWeeklyChartType(e.target.value)}
                className="bg-surface-lighter border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
              </select>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ErrorBoundary fallbackText="Weekly Usage chart could not be loaded.">
              {weeklyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {(() => {
                    if (weeklyChartType === 'area') {
                      return (
                        <AreaChart data={weeklyUsage} margin={{ top: 10, right: 30, left: -15, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorUsageWeekly" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" tick={<CustomXAxisTick />} tickLine={false} axisLine={false} height={40} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            content={<WeeklyTooltip />} 
                            allowEscapeViewBox={{ x: true, y: true }}
                            wrapperStyle={{ pointerEvents: 'auto', zIndex: 100 }} 
                          />
                          <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsageWeekly)" />
                        </AreaChart>
                      );
                    }
                    if (weeklyChartType === 'line') {
                      return (
                        <LineChart data={weeklyUsage} margin={{ top: 10, right: 30, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" tick={<CustomXAxisTick />} tickLine={false} axisLine={false} height={40} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            content={<WeeklyTooltip />} 
                            allowEscapeViewBox={{ x: true, y: true }}
                            wrapperStyle={{ pointerEvents: 'auto', zIndex: 100 }} 
                          />
                          <Line type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      );
                    }
                    return (
                        <BarChart data={weeklyUsage} margin={{ top: 10, right: 30, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis dataKey="name" tick={<CustomXAxisTick />} tickLine={false} axisLine={false} height={40} />
                          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            content={<WeeklyTooltip />} 
                            wrapperStyle={{ pointerEvents: 'auto', zIndex: 100 }} 
                          />
                        <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                          {weeklyUsage.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    );
                  })()}
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <motion.img 
                    src="/empty_state_charts_analytics.svg" 
                    alt="No Weekly Usage Data" 
                    className="w-32 sm:w-40 object-contain mb-2 opacity-90"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                  />
                  <p className="text-text font-bold text-sm">No weekly readings logged</p>
                  <p className="text-text-muted text-xs mt-0.5 font-medium">Select a month with recorded readings to view chart.</p>
                </div>
              )}
            </ErrorBoundary>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-semibold text-text">Monthly Tariff Limit Comparison</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {avgVal > 0 
                ? `Safe limit: ${avgVal.toLocaleString()} L/mo — excess usage attracts penalty charges`
                : 'Contact your Community Admin to configure a monthly water limit'}
            </p>
          </div>
          
          <div className="flex items-center justify-between sm:justify-center gap-2 bg-surface-lighter/60 dark:bg-slate-900/60 px-3 py-2 rounded-xl border border-border/60 w-full sm:w-auto shrink-0 shadow-xs">
            <button
              onClick={() => setComparisonDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="p-2 hover:bg-surface active:scale-95 rounded-lg text-text-muted hover:text-text cursor-pointer transition-all focus:outline-none shrink-0"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-text whitespace-nowrap min-w-[110px] text-center flex-1 sm:flex-initial">
              {comparisonDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const nextDate = new Date(comparisonDate.getFullYear(), comparisonDate.getMonth() + 1, 1);
                if (nextDate <= new Date()) {
                  setComparisonDate(nextDate);
                }
              }}
              disabled={new Date(comparisonDate.getFullYear(), comparisonDate.getMonth() + 1, 1) > new Date()}
              className="p-2 hover:bg-surface active:scale-95 rounded-lg text-text-muted hover:text-text disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-all focus:outline-none shrink-0"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 w-full space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Your Monthly Consumption</span>
                <span className="text-text font-medium">{latestVal.toLocaleString()} L</span>
              </div>
              <div className="h-2 w-full bg-surface-lighter rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${userPercentage}%` }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="h-full bg-primary"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted">Safe Usage Limit</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">CA Set</span>
                </div>
                <span className="text-text font-medium">
                  {avgVal > 0 ? `${avgVal.toLocaleString()} L` : <span className="text-text-muted/60 italic text-xs">Not configured</span>}
                </span>
              </div>
              <div className="h-2 w-full bg-surface-lighter rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: avgVal > 0 ? `${avgPercentage}%` : '0%' }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="h-full bg-emerald-400"
                />
              </div>
            </div>
          </div>

          {latestVal === 0 ? (
            <div className="w-full md:w-auto p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
              <h4 className="text-xl font-bold text-text-muted mb-1">No Data</h4>
              <p className="text-sm text-text-muted/80 max-w-[200px] mx-auto">Log water readings to view tariff limit comparison.</p>
            </div>
          ) : avgVal === 0 ? (
            <div className="w-full md:w-auto p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
              <h4 className="text-xl font-bold text-text-muted mb-1">No Limit Set</h4>
              <p className="text-sm text-text-muted/80 max-w-[200px] mx-auto">Your Community Admin has not configured a monthly water limit yet.</p>
            </div>
          ) : latestVal <= avgVal ? (
            <div className="w-full md:w-auto p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <h4 className="text-xl font-bold text-emerald-400 mb-1">Within Limit ✓</h4>
              <p className="text-sm text-emerald-400/80 max-w-[200px] mx-auto">You're within the safe usage limit. No excess tariff applies.</p>
            </div>
          ) : (
            <div className="w-full md:w-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <h4 className="text-xl font-bold text-red-400 mb-1">Limit Exceeded ⚠️</h4>
              <p className="text-sm text-red-400/80 max-w-[200px] mx-auto">
                Over by {(latestVal - avgVal).toLocaleString()} L. Excess tariff charges will apply.
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Tariff Rates and Estimated Charges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-5 mt-6 pt-6 border-t border-border/40">
          <div className="glass-card lg:col-span-3 bg-surface-lighter/15 hover:bg-surface-lighter/25 border border-border/40 hover:border-primary/40 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted/80">Base Rate</span>
              <h4 className="text-2xl font-black text-primary mt-2 flex items-baseline gap-1">
                ₹{baseRatePerLiter.toFixed(4)} <span className="text-xs font-semibold text-text-muted">/ Liter</span>
              </h4>
            </div>
            <div className="mt-4 pt-3 border-t border-border/20 text-xs text-text-muted/95 flex items-center justify-between">
              <span>Equivalent KL:</span>
              <strong className="text-text font-bold">₹{(baseRatePerLiter * 1000).toFixed(2)} / KL</strong>
            </div>
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
          </div>

          <div className="glass-card lg:col-span-3 bg-surface-lighter/15 hover:bg-surface-lighter/25 border border-border/40 hover:border-rose-500/30 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted/80">Excess Usage Rate</span>
              <h4 className="text-2xl font-black text-rose-400 mt-2 flex items-baseline gap-1">
                ₹{excessRatePerLiter.toFixed(4)} <span className="text-xs font-semibold text-text-muted">/ Liter</span>
              </h4>
            </div>
            <div className="mt-4 pt-3 border-t border-border/20 text-xs text-text-muted/95 flex items-center justify-between">
              <span>Equivalent KL:</span>
              <strong className="text-rose-400/90 font-bold">₹{(excessRatePerLiter * 1000).toFixed(2)} / KL</strong>
            </div>
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition-colors" />
          </div>

          <div className="glass-card lg:col-span-3 bg-surface-lighter/15 hover:bg-surface-lighter/25 border border-border/40 hover:border-amber-500/30 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted/80">Late Fee Penalty</span>
              <h4 className="text-2xl font-black text-amber-500 dark:text-amber-400 mt-2 flex items-baseline gap-1">
                ₹{lateFeePerMonth.toFixed(2)} <span className="text-xs font-semibold text-text-muted">/ Month</span>
              </h4>
            </div>
            <div className="mt-4 pt-3 border-t border-border/20 text-xs text-text-muted/95 flex items-center justify-between">
              <span>Applied After:</span>
              <strong className="text-amber-400 font-bold">Due Date + Grace</strong>
            </div>
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-colors" />
          </div>

          <div className="glass-card lg:col-span-3 bg-surface-lighter/15 hover:bg-surface-lighter/25 border border-border/40 hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between shadow-sm relative overflow-hidden group">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted/80">Grace Period</span>
              <h4 className="text-2xl font-black text-indigo-400 mt-2 flex items-baseline gap-1">
                {gracePeriodDays} <span className="text-xs font-semibold text-text-muted">Days</span>
              </h4>
            </div>
            <div className="mt-4 pt-3 border-t border-border/20 text-xs text-text-muted/95 flex items-center justify-between">
              <span>Penalty Window:</span>
              <strong className="text-indigo-400 font-bold">{gracePeriodDays} Days Window</strong>
            </div>
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-colors" />
          </div>

          <div className="glass-card lg:col-span-12 bg-surface-lighter/15 hover:bg-surface-lighter/25 border border-border/40 hover:border-emerald-500/30 rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between shadow-sm relative overflow-hidden group mt-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-muted/80">Est. Charge (Monthly Usage)</span>
              <h4 className="text-2xl font-black text-emerald-400 mt-2">
                ₹{((Math.min(latestVal, avgVal) * baseRatePerLiter) + (Math.max(0, latestVal - avgVal) * excessRatePerLiter)).toFixed(2)}
              </h4>
            </div>
            <div className="mt-4 pt-3 border-t border-border/20 text-xs text-text-muted/95">
              {latestVal > 0 ? (
                latestVal > avgVal && avgVal > 0 ? (
                  <p className="font-mono text-xs md:text-sm leading-relaxed text-text mt-1 bg-surface-lighter/10 p-2.5 rounded-xl border border-border/25 shadow-inner">
                    <span className="font-bold text-text">{avgVal}</span> * <span className="text-primary font-bold">{baseRatePerLiter}</span>
                    {" + "}
                    <span className="font-bold text-rose-400">{latestVal - avgVal}</span> * <span className="text-rose-400 font-bold">{excessRatePerLiter}</span>
                    {" = "}
                    <span className="text-text font-bold">₹{(avgVal * baseRatePerLiter).toFixed(2)}</span> base
                    {" + "}
                    <span className="text-rose-400 font-bold">₹{((latestVal - avgVal) * excessRatePerLiter).toFixed(2)}</span> penalty
                    {" = "}
                    <strong className="text-emerald-400 font-extrabold">₹{((avgVal * baseRatePerLiter) + ((latestVal - avgVal) * excessRatePerLiter)).toFixed(2)}</strong> total
                  </p>
                ) : (
                  <p className="font-mono text-xs md:text-sm leading-relaxed text-text mt-1 bg-surface-lighter/10 p-2.5 rounded-xl border border-border/25 shadow-inner">
                    <span className="font-bold text-text">{latestVal}</span> * <span className="text-primary font-bold">{baseRatePerLiter}</span>
                    {" = "}
                    <strong className="text-emerald-400 font-extrabold">₹{(latestVal * baseRatePerLiter).toFixed(2)}</strong> total
                  </p>
                )
              ) : (
                <p className="italic text-text-muted/60">No usage logged</p>
              )}
            </div>
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
          </div>
        </div>
      </motion.div>

      {/* Quick Help Modal */}
      {quickHelpModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="help-modal-box border w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl p-4 sm:p-6 shadow-2xl relative my-auto bg-surface"
          >
            <button
              onClick={() => setQuickHelpModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.25)]">
                <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text">
                  💡 Resident Quick Guide
                </h3>
                <p className="text-text-muted text-xs mt-0.5">Everything you need to know about navigating AquaTrack as a Resident</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-text">
                <div className="space-y-3 bg-surface-lighter/25 p-5 rounded-xl border border-border/50">
                  <p className="font-bold text-blue-500 dark:text-blue-400 text-base flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" /> Usage & History
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-2 leading-relaxed text-text">
                    <li>Go to the <strong className="text-primary font-bold">My Usage</strong> page to visualize consumption patterns.</li>
                    <li>Toggle between daily, weekly, and monthly view modes.</li>
                    <li>Compare your usage to the block average to identify conservation opportunities.</li>
                  </ul>
                </div>

                <div className="space-y-3 bg-surface-lighter/25 p-5 rounded-xl border border-border/50">
                  <p className="font-bold text-emerald-500 dark:text-emerald-400 text-base flex items-center gap-2">
                    <Receipt className="w-5 h-5" /> Bills & Payments
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-2 leading-relaxed text-text">
                    <li>Go to the <strong className="text-primary font-bold">My Bills</strong> page to check pending and paid transactions.</li>
                    <li>Pay outstanding dues securely using the integrated <strong className="text-emerald-500 dark:text-emerald-400 font-bold">Razorpay Gateway</strong>.</li>
                    <li>Download detailed, electronic receipt PDFs under <strong className="text-primary font-bold">My Invoices</strong>.</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-text">
                <div className="space-y-3 bg-surface-lighter/25 p-5 rounded-xl border border-border/50">
                  <p className="font-bold text-rose-500 dark:text-rose-400 text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Leak & Overuse Alerts
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-2 leading-relaxed text-text">
                    <li>Check <strong className="text-rose-500 dark:text-rose-400 font-bold">Recent Alerts</strong> on the main panel for automated system flags.</li>
                    <li>Spike alerts show sudden abnormal water consumption logs.</li>
                    <li>Leak notifications trigger when continuous flow is registered over long periods.</li>
                  </ul>
                </div>

                <div className="space-y-3 bg-surface-lighter/25 p-5 rounded-xl border border-border/50">
                  <p className="font-bold text-purple-500 dark:text-purple-400 text-base flex items-center gap-2">
                    <Info className="w-5 h-5" /> Support Tickets
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-2 leading-relaxed text-text">
                    <li>Go to the <strong className="text-primary font-bold">Support</strong> tab to open tickets for technical help.</li>
                    <li>File issues under categories: Meter Issue, Leakage Report, Billing Query, or Other.</li>
                    <li>Real-time status updates are visible as administrators review your reports.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs text-text-muted">
              <span className="font-semibold text-primary">🌱 Conserve Water. Save Earth.</span>
              <span>AquaTrack Resident Engine</span>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
