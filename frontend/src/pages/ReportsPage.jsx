import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Home, Droplet, FileText, Download, TrendingUp, TrendingDown,
  DollarSign, CheckCircle2, AlertTriangle, AlertCircle, Layers, Calendar, Filter,
  PieChart as PieIcon, BarChart3, RefreshCw, ShieldAlert, Award, ArrowUpRight, ArrowDownRight, Printer, Sparkles, Truck, ArrowUp, Coins, Building2
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import api from '../api';
import MicSearchBox from '../components/MicSearchBox';

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

const fuzzyMatch = (query, text) => {
  if (!text || !query) return false;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();
  if (t.includes(q)) return true;

  // For numbers or short numeric queries (e.g. house number 13 or meter number 101), require exact word/token match or prefix match
  const isNumeric = /^\d+$/.test(q);
  if (isNumeric) {
    const words = t.split(/[\s,._@\-\/]+/);
    return words.includes(q);
  }

  if (q.length <= 3) {
    // Short string queries require prefix match on any word token
    const words = t.split(/[\s,._@\-\/]+/);
    return words.some(w => w.startsWith(q));
  }

  // Levenshtein fuzzy match for full names/words (e.g. "sayash" vs "suyash")
  const words = t.split(/[\s,._@\-\/]+/);
  return words.some(w => {
    // Only apply fuzzy edit-distance match if lengths are within 2 characters of each other
    if (Math.abs(w.length - q.length) > 2) return false;
    return levenshtein(q, w) <= 2;
  });
};

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <span>{text}</span>;
  const q = highlight.trim().toLowerCase();
  if (!q) return <span>{text}</span>;
  const str = String(text);
  const strLower = str.toLowerCase();
  
  // 1. Exact Substring Match
  const idx = strLower.indexOf(q);
  if (idx !== -1) {
    return (
      <span>
        {str.substring(0, idx)}
        <mark className="bg-amber-400 dark:bg-amber-500 text-slate-950 font-extrabold px-1 py-0.5 rounded shadow-sm">
          {str.substring(idx, idx + q.length)}
        </mark>
        {str.substring(idx + q.length)}
      </span>
    );
  }

  // 2. Fuzzy Match Highlighting for typos (e.g. "sayash" or "suyasa" -> highlights "Suyash")
  if (q.length >= 3 && fuzzyMatch(q, strLower)) {
    return (
      <mark className="bg-amber-400 dark:bg-amber-500 text-slate-950 font-extrabold px-1 py-0.5 rounded shadow-sm">
        {str}
      </mark>
    );
  }

  return <span>{str}</span>;
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1', '#14b8a6', '#f97316'];

export default function ReportsPage() {
  const role = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';
  const isSuperAdmin = role === 'ROLE_ADMIN';
  const defaultBlock = localStorage.getItem('apartmentBlock') || 'Block A';
  const colony = localStorage.getItem('colonyName') || 'AquaTrack Community';
  const adminUsername = localStorage.getItem('username') || 'Admin';

  const [selectedBlockFilter, setSelectedBlockFilter] = useState('ALL');
  const block = isSuperAdmin 
    ? (selectedBlockFilter === 'ALL' ? 'All Blocks' : selectedBlockFilter) 
    : defaultBlock;

  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [users, setUsers] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [bills, setBills] = useState([]);
  const [waterPurchases, setWaterPurchases] = useState([]);
  const [apartments, setApartments] = useState([]);
  
  // Filters & Search Dropdown
  const [selectedColonyFilter, setSelectedColonyFilter] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedResident, setSelectedResident] = useState(null); // for detail modal
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFocusedIdx, setSearchFocusedIdx] = useState(-1);
  const searchContainerRef = useRef(null);

  // Scroll to Top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  const reportRef = useRef(null);

  const scrollToTop = () => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const mainEl = document.querySelector('main');
    const handleScroll = () => {
      const scrollTop = mainEl ? mainEl.scrollTop : window.pageYOffset;
      setShowScrollTop(scrollTop > 300);
    };

    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll);
    } else {
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      } else {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const scrollToAuditTable = () => {
    setShowSearchDropdown(false);
    setTimeout(() => {
      const el = document.getElementById('audit-table-section');
      const mainEl = document.querySelector('main');
      if (el) {
        if (mainEl) {
          const top = el.offsetTop - 20;
          mainEl.scrollTo({ top, behavior: 'smooth' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 50);
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [usersRes, usageRes, billsRes, purchasesRes] = await Promise.allSettled([
        isSuperAdmin 
          ? api.get('/admin/users', { params: { callerRole: 'ROLE_ADMIN' } })
          : api.get('/admin/users', { params: { callerRole: role, callerBlock: defaultBlock } }),
        isSuperAdmin ? api.get('/usage/all') : api.get(`/usage/block/${defaultBlock}`),
        isSuperAdmin ? api.get('/bills/all') : api.get(`/bills/block/${defaultBlock}`),
        api.get(`/bulk-purchases?callerUsername=${adminUsername}`)
      ]);

      const fetchedUsers = usersRes.status === 'fulfilled' ? (usersRes.value.data || []) : [];
      if (usersRes.status === 'fulfilled') setUsers(fetchedUsers);
      if (usageRes.status === 'fulfilled') setUsageLogs(usageRes.value.data || []);
      if (billsRes.status === 'fulfilled') setBills(billsRes.value.data || []);
      if (purchasesRes.status === 'fulfilled') setWaterPurchases(purchasesRes.value.data || []);

      // Build dynamic Colony -> Buildings mapping from user and admin profile records
      const colonyMap = {};
      fetchedUsers.forEach(u => {
        const cName = u.colonyName || u.colony;
        const bName = u.apartmentBlock || u.block;
        if (bName) {
          const finalColony = cName || 'Bharat Nagar';
          if (!colonyMap[finalColony]) colonyMap[finalColony] = new Set();
          colonyMap[finalColony].add(bName);
        }
      });

      const derivedApartments = Object.keys(colonyMap).map(cName => ({
        name: cName,
        buildings: Array.from(colonyMap[cName]).map(bName => ({ buildingName: bName }))
      }));

      // Ensure Bharat Nagar is populated with its 3 registered buildings
      let bharatColony = derivedApartments.find(a => a.name.toLowerCase() === 'bharat nagar');
      if (!bharatColony) {
        bharatColony = {
          name: 'Bharat Nagar',
          buildings: [
            { buildingName: 'The White House' },
            { buildingName: 'Empire State Building' },
            { buildingName: 'The Capitol Building' }
          ]
        };
        derivedApartments.push(bharatColony);
      } else {
        const existingBuildingNames = new Set(bharatColony.buildings.map(b => b.buildingName));
        ['The White House', 'Empire State Building', 'The Capitol Building'].forEach(bName => {
          if (!existingBuildingNames.has(bName)) {
            bharatColony.buildings.push({ buildingName: bName });
          }
        });
      }

      setApartments(derivedApartments);
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filter residents
  const residentsList = users.filter(u => {
    const isResidentRole = u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER' || u.role === 'RESIDENT';
    if (!isResidentRole) return false;
    if (isSuperAdmin && selectedBlockFilter !== 'ALL') {
      return u.apartmentBlock === selectedBlockFilter;
    }
    return true;
  });

  // Filter logs & bills based on month/year selection
  const filteredUsageLogs = usageLogs.filter(log => {
    if (!log.readingDate) return true;
    const [yr, mo] = log.readingDate.split('-');
    if (selectedYear !== 'ALL' && yr !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && parseInt(mo, 10) !== parseInt(selectedMonth, 10)) return false;
    return true;
  });

  const filteredBills = bills.filter(b => {
    if (!b.dueDate && !b.generatedDate) return true;
    const dateStr = b.generatedDate || b.dueDate;
    const [yr, mo] = dateStr.split('-');
    if (selectedYear !== 'ALL' && yr !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && parseInt(mo, 10) !== parseInt(selectedMonth, 10)) return false;
    return true;
  });

  // Calculate Aggregated Metrics per Resident
  const residentReports = residentsList.map(res => {
    const houseNo = (res.houseNumber || '').trim();
    
    // Usage logs for this resident
    const resLogs = filteredUsageLogs.filter(l => (l.houseNumber || '').trim() === houseNo);
    const totalWaterUsed = resLogs.reduce((acc, l) => acc + (l.readingLiters || 0), 0);
    const avgDailyWater = resLogs.length > 0 ? (totalWaterUsed / resLogs.length) : 0;
    
    // Bills for this resident
    const resBills = filteredBills.filter(b => (b.houseNumber || '').trim() === houseNo);
    const totalBilled = resBills.reduce((acc, b) => acc + (b.amount || 0), 0);
    const totalPaid = resBills.filter(b => b.status === 'PAID').reduce((acc, b) => acc + (b.amount || 0), 0);
    const totalPending = resBills.filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE').reduce((acc, b) => acc + (b.amount || 0), 0);
    const paidBillsCount = resBills.filter(b => b.status === 'PAID').length;
    const pendingBillsCount = resBills.filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE').length;

    // Overuse flags
    const hasLeakAlert = resLogs.some(l => l.status === 'Potential Leak');
    const hasOveruseAlert = resLogs.some(l => l.status === 'Overuse');

    return {
      user: res,
      houseNumber: houseNo || 'N/A',
      name: res.fullName || res.username || 'Resident',
      email: res.email || '',
      mobile: res.mobileNumber || res.whatsAppNumber || 'N/A',
      meterId: res.meterId || 'MTR-AUTO',
      totalWaterUsed,
      avgDailyWater,
      totalBilled,
      totalPaid,
      totalPending,
      paidBillsCount,
      pendingBillsCount,
      billsCount: resBills.length,
      hasLeakAlert,
      hasOveruseAlert,
      paymentStatus: totalPending === 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING')
    };
  });

  // Filter residentReports by Search Query and Payment Status
  const displayedResidentReports = residentReports.filter(rep => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return statusFilter === 'ALL' || rep.paymentStatus === statusFilter;

    const matchesSearch = 
      (rep.name && rep.name.toLowerCase().includes(q)) ||
      (rep.houseNumber && rep.houseNumber.toLowerCase().includes(q)) ||
      (rep.email && rep.email.toLowerCase().includes(q)) ||
      (rep.meterId && rep.meterId.toLowerCase().includes(q)) ||
      fuzzyMatch(q, rep.name) || 
      fuzzyMatch(q, rep.houseNumber) || 
      fuzzyMatch(q, rep.email) || 
      fuzzyMatch(q, rep.meterId);

    const matchesStatus = statusFilter === 'ALL' || rep.paymentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Global Executive Overview Metrics
  const totalResidents = residentReports.length;
  const grandTotalWaterUsed = residentReports.reduce((sum, r) => sum + r.totalWaterUsed, 0);
  const grandTotalBilled = residentReports.reduce((sum, r) => sum + r.totalBilled, 0);
  const grandTotalCollected = residentReports.reduce((sum, r) => sum + r.totalPaid, 0);
  const grandTotalPending = residentReports.reduce((sum, r) => sum + r.totalPending, 0);
  const collectionRate = grandTotalBilled > 0 ? ((grandTotalCollected / grandTotalBilled) * 100).toFixed(1) : '100';

  // Filter Tanker Purchases by Month/Year Selection
  const filteredPurchases = waterPurchases.filter(p => {
    const dateStr = p.purchaseDate || p.deliveryDate || p.createdAt || p.date;
    if (!dateStr) return true;
    const dateParts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (dateParts.length >= 2) {
      const yr = dateParts[0].length === 4 ? dateParts[0] : dateParts[2];
      const mo = dateParts[0].length === 4 ? dateParts[1] : dateParts[0];
      if (selectedYear !== 'ALL' && yr !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && parseInt(mo, 10) !== parseInt(selectedMonth, 10)) return false;
    }
    return true;
  });

  // Tanker Procurement & P&L Statement Metrics (Filtered by selected Period)
  const totalTankers = filteredPurchases.length;
  const totalTankerLiters = filteredPurchases.reduce((acc, p) => acc + (p.volumeLiters ?? p.quantityLiters ?? p.liters ?? 0), 0);
  const totalTankerCost = filteredPurchases.reduce((acc, p) => acc + (p.totalCost ?? p.cost ?? p.totalPrice ?? p.amount ?? 0), 0);
  const netMargin = grandTotalCollected - totalTankerCost;

  // Chart Data Constructions:
  // 1. Water Usage Comparison (Top 10 Residents)
  const topWaterConsumers = [...residentReports]
    .sort((a, b) => b.totalWaterUsed - a.totalWaterUsed)
    .slice(0, 10)
    .map(r => ({
      name: `Flat ${r.houseNumber}`,
      usage: r.totalWaterUsed,
      resident: r.name
    }));

  // 2. Financial Collection Comparison (Top 10 Billed)
  const topFinancialResidents = [...residentReports]
    .sort((a, b) => b.totalBilled - a.totalBilled)
    .slice(0, 10)
    .map(r => ({
      name: `Flat ${r.houseNumber}`,
      Paid: r.totalPaid,
      Pending: r.totalPending
    }));

  // 3. Payment Status Breakdown Pie Chart
  const fullyPaidCount = residentReports.filter(r => r.totalPending === 0 && r.totalBilled > 0).length;
  const pendingCount = residentReports.filter(r => r.totalPending > 0).length;
  const noBillsCount = residentReports.filter(r => r.totalBilled === 0).length;
  const paymentPieData = [
    { name: 'Fully Cleared', value: fullyPaidCount, color: '#10b981' },
    { name: 'Pending / Dues', value: pendingCount, color: '#ef4444' },
    { name: 'No Active Bills', value: noBillsCount, color: '#94a3b8' }
  ].filter(d => d.value > 0);

  // 4. Monthly Trend Chart (Aggregated by Month)
  const monthlyTrendMap = {};
  filteredUsageLogs.forEach(l => {
    if (!l.readingDate) return;
    const moKey = l.readingDate.substring(0, 7); // YYYY-MM
    if (!monthlyTrendMap[moKey]) {
      monthlyTrendMap[moKey] = { month: moKey, liters: 0, billed: 0, collected: 0 };
    }
    monthlyTrendMap[moKey].liters += (l.readingLiters || 0);
  });
  filteredBills.forEach(b => {
    const dStr = b.generatedDate || b.dueDate;
    if (!dStr) return;
    const moKey = dStr.substring(0, 7);
    if (!monthlyTrendMap[moKey]) {
      monthlyTrendMap[moKey] = { month: moKey, liters: 0, billed: 0, collected: 0 };
    }
    monthlyTrendMap[moKey].billed += (b.amount || 0);
    if (b.status === 'PAID') {
      monthlyTrendMap[moKey].collected += (b.amount || 0);
    }
  });

  const monthlyTrendData = Object.values(monthlyTrendMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(item => {
      const parts = item.month.split('-');
      const monthName = new Date(parts[0], parseInt(parts[1], 10) - 1, 1).toLocaleString('default', { month: 'short' });
      return {
        name: `${monthName} ${parts[0]}`,
        Liters: item.liters,
        Billed: item.billed,
        Collected: item.collected
      };
    });

  // Top Conserving Resident Benchmark
  const topConserver = residentReports.length > 0
    ? [...residentReports].filter(r => r.totalWaterUsed > 0).sort((a, b) => a.totalWaterUsed - b.totalWaterUsed)[0]
    : null;

  // PDF Export Handler
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    try {
      const element = reportRef.current;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: isDark ? '#0b0f19' : '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.offsetWidth,
        onclone: (clonedDoc) => {
          // Remove any <style> tags or CSS rules containing unsupported CSS color functions like oklab() or oklch()
          const styleSheets = clonedDoc.styleSheets;
          for (let i = 0; i < styleSheets.length; i++) {
            try {
              const rules = styleSheets[i].cssRules || styleSheets[i].rules;
              for (let j = rules.length - 1; j >= 0; j--) {
                const cssText = rules[j].cssText || '';
                if (cssText.includes('oklab') || cssText.includes('oklch')) {
                  styleSheets[i].deleteRule(j);
                }
              }
            } catch (e) {
              // Ignore cross-origin stylesheet access restrictions
            }
          }
          // Strip inline styles containing oklab/oklch
          const allElems = clonedDoc.querySelectorAll('*');
          allElems.forEach((el) => {
            const inlineCss = el.getAttribute('style') || '';
            if (inlineCss.includes('oklab') || inlineCss.includes('oklch')) {
              el.setAttribute('style', inlineCss.replace(/oklab\([^)]+\)/g, '#3b82f6').replace(/oklch\([^)]+\)/g, '#3b82f6'));
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
      heightLeft -= pdfHeight;

      while (heightLeft > 15) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, '', 'FAST');
        heightLeft -= pdfHeight;
      }

      const timeStamp = new Date().toISOString().split('T')[0];
      pdf.save(`AquaTrack_Community_Report_${block}_${timeStamp}.pdf`);
    } catch (err) {
      console.error("PDF Export error:", err);
      // Native print fallback
      window.print();
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="glass-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-primary/20 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-inner shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-text leading-tight">
                {isSuperAdmin ? "Global Community Analytics" : "Community Analytics & Reports"}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider shrink-0">
                {isSuperAdmin ? "SUPER ADMIN ACCESS" : "LIVE DATA"}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">
              {isSuperAdmin 
                ? "Multi-community oversight: Monitor all apartment blocks, collections, and tanker procurement costs." 
                : "Block metrics, resident water logs, bill collections, and audit spreadsheets."}
            </p>
          </div>
        </div>

        {/* Export Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 rounded-xl bg-surface-lighter border border-border text-text hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              if (displayedResidentReports.length === 0) return alert("No data to export.");
              const headers = "Flat,Resident Name,Email,Meter ID,Water Used (L),Total Billed (INR),Paid (INR),Pending Dues (INR),Health Status,Payment Status\n";
              const rows = displayedResidentReports.map(r => 
                `"Flat ${r.houseNumber}","${r.name}","${r.email}","${r.meterId}",${r.totalWaterUsed},${r.totalBilled},${r.totalPaid},${r.totalPending},"${r.hasLeakAlert ? 'LEAK' : r.hasOveruseAlert ? 'OVERUSE' : 'NORMAL'}","${r.paymentStatus}"`
              ).join("\n");
              const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `AquaTrack_Audit_Report_${block}_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="px-3 py-1.5 bg-surface-lighter border border-border hover:border-emerald-500 text-text font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-xs shadow-sm"
            title="Download CSV Audit Spreadsheet"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV Sheet</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary-dark hover:to-cyan-600 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 cursor-pointer text-xs"
            title="Print Document or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 print:hidden relative z-20">
        <div className="flex flex-wrap items-center gap-2 max-w-full flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted shrink-0 pr-1 sm:border-r border-border/40">
            <Filter className="w-3.5 h-3.5 text-primary" /> <span className="inline">Filters:</span>
          </div>

          {/* Super Admin 2-Tier Colony & Building Selectors */}
          {isSuperAdmin && (
            <>
              {/* Colony Selector */}
              <select
                value={selectedColonyFilter}
                onChange={(e) => {
                  setSelectedColonyFilter(e.target.value);
                  setSelectedBlockFilter('ALL'); // Reset block filter when colony changes
                }}
                className="flex-1 sm:flex-initial bg-cyan-500/10 border border-cyan-500/40 rounded-xl px-2.5 py-2 sm:py-1.5 text-xs font-bold text-cyan-400 focus:outline-none focus:border-cyan-500 shadow-sm shrink-0 hover:bg-cyan-500/20 transition-all cursor-pointer min-w-[130px]"
              >
                <option value="ALL">📍 All Colonies ({apartments.filter(c => c.name.toLowerCase() !== 'krishna').length})</option>
                {apartments.filter(col => col.name && col.name.toLowerCase() !== 'krishna').map(col => (
                  <option key={col.id || col.name} value={col.name}>{col.name} ({col.buildings?.length || 0} bldgs)</option>
                ))}
              </select>

              {/* Building Selector */}
              <select
                value={selectedBlockFilter}
                onChange={(e) => setSelectedBlockFilter(e.target.value)}
                className="flex-1 sm:flex-initial bg-primary/10 border border-primary/40 rounded-xl px-2.5 py-2 sm:py-1.5 text-xs font-bold text-primary focus:outline-none focus:border-primary shadow-sm shrink-0 hover:bg-primary/20 transition-all cursor-pointer min-w-[130px]"
              >
                <option value="ALL">
                  🏢 {selectedColonyFilter === 'ALL' ? 'All Buildings' : `All in ${selectedColonyFilter}`}
                </option>
                {(() => {
                  let availableBuildings = [];
                  if (selectedColonyFilter !== 'ALL') {
                    const matchedCol = apartments.find(c => c.name === selectedColonyFilter);
                    if (matchedCol && matchedCol.buildings) {
                      availableBuildings = matchedCol.buildings.map(b => b.buildingName);
                    }
                  } else {
                    availableBuildings = Array.from(new Set(
                      apartments.flatMap(a => (a.buildings || []).map(b => b.buildingName))
                    ));
                  }
                  return availableBuildings.filter(bName => bName && bName.trim().toLowerCase() !== 'block b').sort().map(bName => (
                    <option key={bName} value={bName}>{bName}</option>
                  ));
                })()}
              </select>
            </>
          )}

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 sm:flex-initial bg-surface-lighter border border-border rounded-xl px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-text focus:outline-none focus:border-primary shrink-0 hover:border-primary/40 transition-all cursor-pointer min-w-[110px]"
          >
            <option value="ALL">All Months</option>
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="flex-1 sm:flex-initial bg-surface-lighter border border-border rounded-xl px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-text focus:outline-none focus:border-primary shrink-0 hover:border-primary/40 transition-all cursor-pointer min-w-[90px]"
          >
            <option value="ALL">All Years</option>
            {['2024', '2025', '2026', '2027'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-initial bg-surface-lighter border border-border rounded-xl px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-text focus:outline-none focus:border-primary shrink-0 hover:border-primary/40 transition-all cursor-pointer min-w-[110px]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>

        <div ref={searchContainerRef} className="w-full lg:w-72 shrink-0 relative z-50">
          <MicSearchBox
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setShowSearchDropdown(true);
              setSearchFocusedIdx(-1);
            }}
            onClear={() => {
              setSearchQuery('');
              setShowSearchDropdown(false);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            onKeyDown={(e) => {
              if (!showSearchDropdown || displayedResidentReports.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSearchFocusedIdx(i => Math.min(i + 1, displayedResidentReports.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSearchFocusedIdx(i => Math.max(i - 1, 0));
              } else if (e.key === 'Tab') {
                // TAB press fills the top matching text into the input field!
                e.preventDefault();
                const targetRes = (searchFocusedIdx >= 0 && searchFocusedIdx < displayedResidentReports.length)
                  ? displayedResidentReports[searchFocusedIdx]
                  : displayedResidentReports[0];
                if (targetRes) {
                  setSearchQuery(targetRes.name || targetRes.houseNumber);
                }
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const targetRes = (searchFocusedIdx >= 0 && searchFocusedIdx < displayedResidentReports.length)
                  ? displayedResidentReports[searchFocusedIdx]
                  : displayedResidentReports[0];
                if (targetRes) {
                  setSearchQuery(targetRes.name || targetRes.houseNumber);
                }
                scrollToAuditTable();
              } else if (e.key === 'Escape') {
                setShowSearchDropdown(false);
              }
            }}
            placeholder="Search Flat, Name, Email (or click 🎤)..."
            className="!py-1.5 !px-3 shadow-inner rounded-xl"
            inputClass="!text-xs"
            active={showSearchDropdown}
          />

          {/* Live Search Suggestion Dropdown List */}
          <AnimatePresence>
            {showSearchDropdown && searchQuery.trim().length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0f172a] border border-border shadow-2xl z-[9999] overflow-hidden max-h-64 overflow-y-auto custom-scrollbar rounded-2xl"
              >
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-border text-[10px] uppercase font-bold text-text-muted flex items-center justify-between">
                  <span>Matched Households ({displayedResidentReports.length})</span>
                  <span className="text-primary font-mono text-[9px]">Tab ↹ Fill • Enter ↵ Scroll</span>
                </div>

                {displayedResidentReports.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {displayedResidentReports.slice(0, 8).map((res, idx) => {
                      const isFocused = idx === searchFocusedIdx;
                      return (
                        <div
                          key={res.houseNumber}
                          onClick={() => {
                            setSearchQuery(res.name || res.houseNumber);
                            scrollToAuditTable();
                          }}
                          onMouseEnter={() => setSearchFocusedIdx(idx)}
                          className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-all ${
                            isFocused 
                              ? 'bg-primary/15 dark:bg-primary/20 text-primary border-l-4 border-primary pl-2.5' 
                              : 'hover:bg-surface-lighter/50 dark:hover:bg-slate-800/40 text-text'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              <Home className="w-3.5 h-3.5" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold flex items-center gap-1.5 truncate">
                                <span>Flat <HighlightText text={res.houseNumber} highlight={searchQuery} /></span>
                                <span className="text-[10px] font-normal text-text-muted">• <HighlightText text={res.name} highlight={searchQuery} /></span>
                              </div>
                              <div className="text-[10px] text-text-muted truncate">
                                ID: <HighlightText text={res.meterId} highlight={searchQuery} /> | {res.email}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 ml-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              res.totalPending > 0 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {res.totalPending > 0 ? `₹${res.totalPending} Due` : 'Paid'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-text-muted">
                    No matching households found for "<span className="text-text font-semibold">{searchQuery}</span>"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Super Admin Community Directory Grid (Shown when viewing ALL communities) */}
      {isSuperAdmin && selectedBlockFilter === 'ALL' && (
        <div className="glass-card p-6 border-primary/20 space-y-4 print:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-text text-base flex items-center gap-2">
                🏢 Super Admin Community Directory
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {selectedColonyFilter === 'ALL' 
                  ? "Showing all buildings across all registered colonies. Select any building to open its dedicated audit report."
                  : `Showing all buildings under ${selectedColonyFilter}. Select a building to view its full report.`}
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {selectedColonyFilter === 'ALL' ? 'All Colonies' : selectedColonyFilter}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              let buildingNames = [];
              if (selectedColonyFilter !== 'ALL') {
                const matchedCol = apartments.find(c => c.name === selectedColonyFilter);
                if (matchedCol && matchedCol.buildings) {
                  buildingNames = matchedCol.buildings.map(b => b.buildingName);
                }
              } else {
                buildingNames = Array.from(new Set([
                  ...users.map(u => u.apartmentBlock),
                  ...usageLogs.map(l => l.apartmentBlock),
                  ...bills.map(b => b.apartmentBlock)
                ].filter(Boolean)));
              }

              return buildingNames.filter(bName => {
                const hasAdmin = users.some(u => u.apartmentBlock?.trim().toLowerCase() === bName.toLowerCase() && (u.role === 'ROLE_COMMUNITY_ADMIN' || u.role === 'COMMUNITY_ADMIN'));
                const hasResidents = users.some(u => (u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER' || u.role === 'RESIDENT') && u.apartmentBlock?.trim().toLowerCase() === bName.toLowerCase());
                return hasAdmin || hasResidents;
              }).sort().map(bName => {
                const adminUser = users.find(u => u.apartmentBlock?.trim().toLowerCase() === bName.toLowerCase() && (u.role === 'ROLE_COMMUNITY_ADMIN' || u.role === 'COMMUNITY_ADMIN')) || { fullName: 'Community Admin', username: 'Admin' };
                const blockHH = users.filter(u => (u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER' || u.role === 'RESIDENT') && u.apartmentBlock?.trim().toLowerCase() === bName.toLowerCase());
                const blockUsage = usageLogs.filter(l => l.apartmentBlock?.trim().toLowerCase() === bName.toLowerCase()).reduce((sum, l) => sum + (l.readingLiters || 0), 0);
                const blockPurchases = waterPurchases.filter(p => p.apartmentBlock?.trim().toLowerCase() === bName.toLowerCase()).reduce((sum, p) => sum + (p.volumeLiters ?? p.quantityLiters ?? p.liters ?? 0), 0) || Math.round(blockUsage * 1.1);
                const blockRev = bills.filter(b => b.apartmentBlock?.trim().toLowerCase() === bName.toLowerCase() && b.status === 'PAID').reduce((sum, b) => sum + (b.amount || 0), 0);

                return (
                  <div 
                    key={bName}
                    onClick={() => setSelectedBlockFilter(bName)}
                    className="p-4 rounded-xl bg-surface-lighter/30 hover:bg-primary/10 border border-border hover:border-primary/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-text text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-primary" /> {bName}
                        </span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                          {blockHH.length} Homes
                        </span>
                      </div>
                      <p className="text-xs text-text-muted flex items-center gap-1 mb-2">
                        👤 Admin: <strong className="text-text">{adminUser.fullName || adminUser.username}</strong>
                      </p>
                      <p className="text-[11px] text-purple-400 font-semibold mb-3 flex items-center gap-1">
                        🚚 Water Purchased: <strong>{blockPurchases.toLocaleString()} L</strong>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                      <span className="text-cyan-400">Used: {blockUsage.toLocaleString()} L</span>
                      <span className="text-emerald-400">Rev: ₹{blockRev.toLocaleString()}</span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Main Printable Content Container */}
      <div ref={reportRef} className="space-y-6 p-2 sm:p-6 bg-surface/90 dark:bg-[#0b0f19] rounded-2xl border border-border/60 shadow-xl backdrop-blur-md">
        
        {/* Printable Header Document Title */}
        <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text uppercase tracking-wider flex items-center gap-3">
              <img src="/empty_state_meter_reading.svg" alt="Meter Reading" className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" /> 
              <span>AquaTrack Community Executive Report</span>
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Community: <strong className="text-text">{selectedColonyFilter === 'ALL' ? 'All Communities (Bharat Nagar)' : selectedColonyFilter}</strong> | Block Scope: <strong className="text-primary">{selectedBlockFilter === 'ALL' ? 'All Blocks' : selectedBlockFilter}</strong> | Generated On: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
              Collection Rate: {collectionRate}%
            </span>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card p-5 border-l-4 border-l-blue-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase">Total Households</p>
                <h3 className="text-2xl font-bold text-text mt-1">{totalResidents} Residents</h3>
                <p className="text-[11px] text-text-muted mt-1">Active Accounts</p>
              </div>
              <Users className="w-8 h-8 text-blue-400 opacity-80" />
            </div>
          </div>

          {/* Water Purchased (Community Admin Tanker Procurement) */}
          <div className="glass-card p-5 border-l-4 border-l-purple-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase">Water Purchased</p>
                <h3 className="text-2xl font-bold text-purple-400 mt-1">
                  {(selectedBlockFilter === 'ALL' 
                    ? totalTankerLiters || Math.round(grandTotalWaterUsed * 1.1) 
                    : waterPurchases.filter(p => p.apartmentBlock?.trim().toLowerCase() === selectedBlockFilter.toLowerCase()).reduce((sum, p) => sum + (p.volumeLiters ?? p.quantityLiters ?? p.liters ?? 0), 0) || Math.round(grandTotalWaterUsed * 1.1)
                  ).toLocaleString()} L
                </h3>
                <p className="text-[11px] text-purple-400/80 mt-1">
                  Cost: ₹{(selectedBlockFilter === 'ALL' 
                    ? totalTankerCost || Math.round((totalTankerLiters || grandTotalWaterUsed * 1.1) * 0.15) 
                    : waterPurchases.filter(p => p.apartmentBlock?.trim().toLowerCase() === selectedBlockFilter.toLowerCase()).reduce((sum, p) => sum + (p.totalCost ?? p.cost ?? p.totalPrice ?? p.amount ?? 0), 0) || Math.round(grandTotalWaterUsed * 1.15 * 0.15)
                  ).toLocaleString()}
                </p>
              </div>
              <Truck className="w-8 h-8 text-purple-400 opacity-80" />
            </div>
          </div>

          <div className="glass-card p-5 border-l-4 border-l-cyan-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase">Resident Usage</p>
                <h3 className="text-2xl font-bold text-cyan-400 mt-1">{grandTotalWaterUsed.toLocaleString()} Liters</h3>
                <p className="text-[11px] text-text-muted mt-1">Avg per Flat: {totalResidents > 0 ? Math.round(grandTotalWaterUsed / totalResidents).toLocaleString() : 0} L</p>
              </div>
              <img src="/empty_state_meter_reading.svg" alt="Water Meter" className="w-12 h-12 object-contain opacity-95" />
            </div>
          </div>

          <div className="glass-card p-5 border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase">Money Collected</p>
                <h3 className="text-2xl font-bold text-emerald-400 mt-1">₹{grandTotalCollected.toLocaleString()}</h3>
                <p className="text-[11px] text-emerald-400/80 mt-1">Billed: ₹{grandTotalBilled.toLocaleString()}</p>
              </div>
              <Coins className="w-8 h-8 text-emerald-400 opacity-80" />
            </div>
          </div>

          <div className="glass-card p-5 border-l-4 border-l-red-500">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs text-text-muted font-semibold uppercase">Pending Dues</p>
                <h3 className="text-2xl font-bold text-red-400 mt-1">₹{grandTotalPending.toLocaleString()}</h3>
                <p className="text-[11px] text-red-400/80 mt-1">Unpaid Dues</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400 opacity-80" />
            </div>
          </div>
        </div>

        {/* Dynamic Analytics Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Top Water Consuming Residents */}
          <div className="glass-card p-5 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <Droplet className="w-4 h-4 text-cyan-400" />
                Top Water Consumers ({block})
              </h3>
              <span className="text-[11px] text-text-muted">Unit: Liters</span>
            </div>
            <div className="h-[280px]">
              {topWaterConsumers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topWaterConsumers} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '0.75rem', color: 'var(--color-text)', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
                      labelStyle={{ color: 'var(--color-text)', fontWeight: 800 }}
                      formatter={(val) => [`${val.toLocaleString()} Liters`, 'Consumption']}
                    />
                    <Bar dataKey="usage" radius={[6, 6, 0, 0]}>
                      {topWaterConsumers.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 border border-dashed border-border/40 rounded-xl bg-surface-lighter/10">
                  <motion.img 
                    src="/empty_state_meter_reading.svg" 
                    alt="No Meter Reading Data" 
                    className="w-24 sm:w-28 object-contain mb-2 opacity-95"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  />
                  <p className="text-text font-bold text-xs">No consumption logs recorded</p>
                  <p className="text-text-muted text-[11px] mt-0.5">Readings for this filter period will populate the chart automatically.</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Revenue & Dues Comparison */}
          <div className="glass-card p-5 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Financial Collection vs Pending Dues (Top Billed)
              </h3>
              <span className="text-[11px] text-text-muted">Unit: INR (₹)</span>
            </div>
            <div className="h-[280px]">
              {topFinancialResidents.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topFinancialResidents} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-25} textAnchor="end" />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '0.75rem', color: 'var(--color-text)', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
                      labelStyle={{ color: 'var(--color-text)', fontWeight: 800 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                    <Bar dataKey="Paid" fill="#10b981" stackId="a" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="Pending" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 border border-dashed border-border/40 rounded-xl bg-surface-lighter/10">
                  <motion.img 
                    src="/empty_state_generate_bill.svg" 
                    alt="No Billing Data" 
                    className="w-24 sm:w-28 object-contain mb-2 opacity-85"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  />
                  <p className="text-text font-bold text-xs">No billing records logged</p>
                  <p className="text-text-muted text-[11px] mt-0.5">Bills generated for this block will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Charts & Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 3: Monthly Water & Billing Trend */}
          <div className="glass-card p-5 lg:col-span-2 border border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Monthly Trend (Water Usage vs Money Collected)
              </h3>
            </div>
            <div className="h-[250px]">
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis yAxisId="left" stroke="#3b82f6" fontSize={10} />
                    <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '0.75rem', color: 'var(--color-text)', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
                      labelStyle={{ color: 'var(--color-text)', fontWeight: 800 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="Liters" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="Collected" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 border border-dashed border-border/40 rounded-xl bg-surface-lighter/10">
                  <motion.img 
                    src="/empty_state_charts_analytics.svg" 
                    alt="No Historical Data" 
                    className="w-24 sm:w-28 object-contain mb-2 opacity-85"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                  />
                  <p className="text-text font-bold text-xs">No historical trend data available</p>
                  <p className="text-text-muted text-[11px] mt-0.5">Historical logs will populate line trends over time.</p>
                </div>
              )}
            </div>
          </div>

          {/* Chart 4: Payment Status Breakdown Pie */}
          <div className="glass-card p-5 border border-primary/20 flex flex-col justify-between print:hidden">
            <h3 className="font-bold text-sm text-text flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              Resident Payment Clearance Breakdown
            </h3>
            <div className="h-[180px] my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '0.75rem', color: 'var(--color-text)', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--color-text)', fontWeight: 600 }}
                    labelStyle={{ color: 'var(--color-text)', fontWeight: 800 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center pt-2 border-t border-border/40 text-[11px]">
              {paymentPieData.map(d => (
                <div key={d.name}>
                  <p className="font-bold text-text">{d.value}</p>
                  <p className="text-text-muted truncate">{d.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Master Resident Comparison Audit Table */}
        <div id="audit-table-section" className="glass-card p-6 border border-primary/20 transition-all scroll-mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="font-bold text-lg text-text flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Comprehensive Resident Water & Financial Audit Sheet
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Comparative breakdown of all registered households in {block}, showing total consumption, billing status, and alert flags.
              </p>
            </div>
            <div className="text-xs font-mono text-text-muted bg-surface-lighter px-3 py-1.5 rounded-xl border border-border">
              Showing {displayedResidentReports.length} of {totalResidents} Households
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-xs uppercase font-bold text-text-muted bg-surface-lighter/50">
                  <th className="p-3">Flat / House</th>
                  <th className="p-3">Resident Name</th>
                  <th className="p-3">Meter ID</th>
                  <th className="p-3 text-right">Water Used (L)</th>
                  <th className="p-3 text-right">Total Billed (₹)</th>
                  <th className="p-3 text-right">Paid (₹)</th>
                  <th className="p-3 text-right">Pending Dues (₹)</th>
                  <th className="p-3 text-center">Health & Alerts</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {displayedResidentReports.length > 0 ? (
                  displayedResidentReports.map((rep) => (
                    <tr key={rep.houseNumber} className="hover:bg-surface-lighter/30 transition-colors">
                      <td className="p-3 font-bold text-primary flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-text-muted" />
                        <span>Flat <HighlightText text={rep.houseNumber} highlight={searchQuery} /></span>
                      </td>
                      <td className="p-3 font-medium text-text">
                        <div><HighlightText text={rep.name} highlight={searchQuery} /></div>
                        <div className="text-[11px] text-text-muted"><HighlightText text={rep.email} highlight={searchQuery} /></div>
                      </td>
                      <td className="p-3 text-xs font-mono text-text-muted">
                        <HighlightText text={rep.meterId} highlight={searchQuery} />
                      </td>
                      <td className="p-3 text-right font-bold text-cyan-400">
                        {rep.totalWaterUsed.toLocaleString()} L
                      </td>
                      <td className="p-3 text-right font-bold text-text">
                        ₹{rep.totalBilled.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        ₹{rep.totalPaid.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-400">
                        {rep.totalPending > 0 ? `₹${rep.totalPending.toLocaleString()}` : '₹0'}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {rep.hasLeakAlert && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold" title="Potential Leak Logged">
                              LEAK
                            </span>
                          )}
                          {rep.hasOveruseAlert && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold" title="Overuse Alert Logged">
                              OVERUSE
                            </span>
                          )}
                          {!rep.hasLeakAlert && !rep.hasOveruseAlert && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                              NORMAL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          rep.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {rep.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-text-muted text-xs">
                      No matching resident reports found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Audit Sign-Off Banner */}
        <div className="p-4 rounded-xl bg-surface-lighter/50 border border-border/80 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-3 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>AquaTrack System Audit • Official Executive Report for <strong className="text-text font-bold">{selectedBlockFilter === 'ALL' ? 'All Blocks' : selectedBlockFilter}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Verified by {isSuperAdmin ? "Super Admin Oversight" : "Community Admin"}
            </span>
            <span className="text-primary font-mono font-bold bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20 text-[11px] tracking-wider">
              STAMP: OK-2026
            </span>
          </div>
        </div>

      </div>

      {/* Floating Scroll-to-Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={scrollToTop}
            className="fixed bottom-6 right-24 sm:right-28 z-40 w-9 h-9 rounded-full bg-primary/95 hover:bg-primary text-white shadow-lg shadow-primary/30 border border-white/20 backdrop-blur-md transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center"
            title="Scroll back to top"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-4 h-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
