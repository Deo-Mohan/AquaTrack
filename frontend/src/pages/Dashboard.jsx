import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets, Receipt, AlertTriangle, TrendingDown, Upload, FileText, CheckCircle2, ShieldAlert, ShieldCheck, X, AlertCircle, Loader2, ArrowRight, Clock, Info, Zap, BarChart3, Lightbulb } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Cell
} from 'recharts';
import api from '../api';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#06b6d4', '#6366f1', '#f97316'];

const getGreeting = () => {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 17) return 'Good afternoon';
  return 'Good evening';
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="glass-card p-6 relative overflow-hidden group"
  >
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-text-muted text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-text tracking-tight">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
    {subtitle && (
      <div className="flex items-center text-sm">
        <TrendingDown className="w-4 h-4 text-emerald-400 mr-1" />
        <span className="text-emerald-400 font-medium">{subtitle}</span>
        <span className="text-text-muted ml-2">vs last week</span>
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
  const [weeklyUsage, setWeeklyUsage] = useState([]);
  const [monthlyUsageData, setMonthlyUsageData] = useState([]);
  const username = localStorage.getItem('username') || 'Household User';
  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem('fullName') || localStorage.getItem('username') || 'Household User';
  });
  const [loading, setLoading] = useState(true);
  const [showResidentHelp, setShowResidentHelp] = useState(true);
  const [quickHelpModalOpen, setQuickHelpModalOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [safeWaterLimit, setSafeWaterLimit] = useState(0); // monthlyLimitLiters from CA tariff
  const [monthlyChartType, setMonthlyChartType] = useState('area'); // area, bar, line
  const [weeklyChartType, setWeeklyChartType] = useState('bar'); // bar, line, area

  const handleRemoveAlert = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const latestVal = stats?.latestReading || 0;
  const avgVal = safeWaterLimit > 0 ? safeWaterLimit : 0;
  const maxVal = Math.max(latestVal, avgVal, 1);
  const userPercentage = Math.round((latestVal * 100) / maxVal);
  const avgPercentage = avgVal > 0 ? Math.round((avgVal * 100) / maxVal) : 0;

  const getLast6MonthsData = (logs) => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthNum: d.getMonth(),
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
              // Load the safe water limit set by the community admin
              if (profileRes.data.monthlyLimitLiters != null && profileRes.data.monthlyLimitLiters > 0) {
                setSafeWaterLimit(profileRes.data.monthlyLimitLiters);
              }
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
                
                // Last 7 readings for weekly usage
                const weekly = sortedLogs.slice(-7).map(log => ({
                  name: new Date(log.readingDate).toLocaleDateString('en-US', { weekday: 'short' }),
                  usage: log.readingLiters
                }));
                setWeeklyUsage(weekly);
                setMonthlyUsageData(getLast6MonthsData(sortedLogs));
              } else {
                setWeeklyUsage([]);
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
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-lg shadow-primary/10">
            <ShieldAlert className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">Profile Verification Required</h1>
          <p className="text-text-muted mt-1.5 text-sm max-w-md">
            To view usage stats, billing history, and access dashboard metrics, please verify your profile with a valid document proof.
          </p>
        </div>

        {/* Dynamic Status Render */}
        <div className="glass-card p-6 border-primary/20 relative overflow-hidden">
          {verificationStatus === 'NOT_SUBMITTED' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-primary text-xs">
                <FileText className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-semibold block mb-0.5">Please Submit Document</span>
                  You must upload a document (Aadhaar, Utility Bill, Rent Agreement, PAN Card, etc.) to start verification.
                </div>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Rent Agreement">Rent Agreement</option>
                    <option value="Electric Bill">Electric Bill</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Select Document File</label>
                  <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    {selectedFile ? (
                      <span className="text-sm font-semibold text-primary block mt-1">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-text block">Drag & Drop or Click to Select File</span>
                        <span className="text-xs text-text-muted mt-1 block">Supports PDF, PNG, JPG, JPEG (Max 5MB)</span>
                      </>
                    )}
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {uploadLoading && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between text-xs font-semibold text-text-muted">
                      <span>Uploading document...</span>
                      <span className="text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-150" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadLoading || !selectedFile}
                  className="btn-next w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {uploadLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading ({uploadProgress}%)</span>
                    </div>
                  ) : (
                    <>
                      <span>Upload & Request Verification</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {verificationStatus === 'PENDING_VERIFICATION' && (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-text">Verification Request Pending Review</h3>
              <p className="text-text-muted text-sm mt-2 max-w-sm">
                Your uploaded documents are currently being verified by your Community Administrator. You will gain access as soon as your profile is approved.
              </p>
              <div className="mt-6 px-4 py-2 bg-surface-lighter/50 border border-border rounded-xl text-xs text-text-muted">
                Status: <strong className="text-amber-400">PENDING APPROVAL</strong>
              </div>
            </div>
          )}

          {verificationStatus === 'REJECTED' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertCircle className="w-5 h-5" />
                  <span>Document Verification Rejected</span>
                </div>
                <p className="text-xs mt-1">
                  <strong>Reason: </strong> {rejectReason || "Invalid document provided or name mismatch."}
                </p>
              </div>

              <div className="text-xs text-text-muted mt-2">
                Please upload a new document to re-verify your residency:
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Rent Agreement">Rent Agreement</option>
                    <option value="Electric Bill">Electric Bill</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Select New Document File</label>
                  <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />
                    <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    {selectedFile ? (
                      <span className="text-sm font-semibold text-primary block mt-1">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-text block">Drag & Drop or Click to Select File</span>
                        <span className="text-xs text-text-muted mt-1 block">Supports PDF, PNG, JPG, JPEG (Max 5MB)</span>
                      </>
                    )}
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {uploadLoading && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between text-xs font-semibold text-text-muted">
                      <span>Uploading document...</span>
                      <span className="text-primary">{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-150" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploadLoading || !selectedFile}
                  className="btn-next w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {uploadLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading ({uploadProgress}%)</span>
                    </div>
                  ) : (
                    <>
                      <span>Re-upload & Re-submit</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Household User Dashboard</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1 text-sm text-text-muted">
            <span>{getGreeting()}, <span className="font-extrabold text-amber-500 dark:text-amber-400">{displayName}</span></span>
            <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0 hidden sm:inline" />
            <div className="flex items-center gap-1.5 bg-surface-lighter/50 px-2.5 py-0.5 rounded-full border border-border/60 text-xs">
              <span className="text-text-muted font-medium">Flat:</span>
              <strong className="text-primary font-semibold">{localStorage.getItem('houseNumber') || 'N/A'}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-surface-lighter/50 px-2.5 py-0.5 rounded-full border border-border/60 text-xs">
              <span className="text-text-muted font-medium">Community/Area:</span>
              <strong className="text-emerald-400 font-semibold">{localStorage.getItem('colonyName') || 'Qutub Minar'}</strong>
            </div>
          </div>
        </div>

        {/* Glowing bulb for quick guide */}
        <div className="relative pb-1" style={{ zIndex: 40 }}>
          <button 
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setQuickHelpModalOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.25)] hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] hover:scale-105 transition-all cursor-pointer animate-pulse focus:outline-none"
          >
            <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
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
          icon={Droplets} 
          color="blue"
          delay={0.1} 
        />
        <StatCard 
          title="Current Bill (Est)" 
          value={`₹${stats.unpaidBillAmount.toFixed(2)}`} 
          subtitle={stats.unpaidBillAmount > 0 ? "Pending Payment" : "No Unpaid Bills"} 
          icon={Receipt} 
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
              <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full border border-amber-500/20">
                {alerts.length} New
              </span>
            )}
          </div>
          <div className="space-y-3">
            {alerts.length > 0 ? (
              alerts.slice(0, 2).map((alert, idx) => (
                <div key={alert.id || idx} className="flex items-start justify-between gap-3 p-3.5 rounded-xl transition-all alert-card-warning group/alert relative">
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
              ))
            ) : (
              <div className="flex items-start gap-3 p-3.5 rounded-xl transition-all alert-card-success">
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold alert-title">System Healthy</p>
                  <p className="text-xs alert-message mt-1 font-medium">No active alerts or overuse notifications.</p>
                </div>
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
          <div className="h-[250px] w-full">
            {monthlyUsageData.length > 0 ? (
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
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
              <div className="h-full flex items-center justify-center text-text-muted">No monthly usage data found.</div>
            )}
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
            <select
              value={weeklyChartType}
              onChange={(e) => setWeeklyChartType(e.target.value)}
              className="bg-surface-lighter border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary/50 cursor-pointer"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            {weeklyUsage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  if (weeklyChartType === 'area') {
                    return (
                      <AreaChart data={weeklyUsage} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorUsageWeekly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                        <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsageWeekly)" />
                      </AreaChart>
                    );
                  }
                  if (weeklyChartType === 'line') {
                    return (
                      <LineChart data={weeklyUsage} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                    <BarChart data={weeklyUsage} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#334155', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#f8fafc' }}
                        itemStyle={{ color: '#cbd5e1' }}
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
              <div className="h-full flex items-center justify-center text-text-muted">No weekly readings logged.</div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-text">Monthly Tariff Limit Comparison</h3>
            <p className="text-xs text-text-muted mt-0.5">
              {avgVal > 0 
                ? `Safe limit: ${avgVal.toLocaleString()} L/mo — excess usage attracts penalty charges`
                : 'Contact your Community Admin to configure a monthly water limit'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 w-full space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-muted">Your Latest Reading</span>
                <span className="text-text font-medium">{stats.latestReading} L</span>
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
          
          {stats.latestReading === 0 ? (
            <div className="w-full md:w-auto p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
              <h4 className="text-xl font-bold text-text-muted mb-1">No Data</h4>
              <p className="text-sm text-text-muted/80 max-w-[200px] mx-auto">Log water readings to view tariff limit comparison.</p>
            </div>
          ) : avgVal === 0 ? (
            <div className="w-full md:w-auto p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
              <h4 className="text-xl font-bold text-text-muted mb-1">No Limit Set</h4>
              <p className="text-sm text-text-muted/80 max-w-[200px] mx-auto">Your Community Admin has not configured a monthly water limit yet.</p>
            </div>
          ) : stats.latestReading <= avgVal ? (
            <div className="w-full md:w-auto p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <h4 className="text-xl font-bold text-emerald-400 mb-1">Within Limit ✓</h4>
              <p className="text-sm text-emerald-400/80 max-w-[200px] mx-auto">You're within the safe usage limit. No excess tariff applies.</p>
            </div>
          ) : (
            <div className="w-full md:w-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
              <h4 className="text-xl font-bold text-red-400 mb-1">Limit Exceeded ⚠️</h4>
              <p className="text-sm text-red-400/80 max-w-[200px] mx-auto">
                Over by {(stats.latestReading - avgVal).toLocaleString()} L. Excess tariff charges will apply.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Quick Help Modal */}
      {quickHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="help-modal-box border w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative my-8"
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
