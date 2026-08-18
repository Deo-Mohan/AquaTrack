import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Droplet, Receipt, Trash2, Edit2, CheckCircle2, Clock,
  Search, X, ChevronDown, ChevronUp, Loader2, AlertCircle, QrCode, Calendar, FileText, Download, Printer,
  MapPin, Building2, Layers, Filter, ArrowUpDown
} from 'lucide-react';
import api from '../api';
import MicSearchBox from '../components/MicSearchBox';


const getBillingMonthLabel = (dateStr) => {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length < 2) return 'N/A';
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const dateObj = new Date(year, monthIdx, 1);
  return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
};

export default function WaterBillingHistory() {
  const role  = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';
  const block = localStorage.getItem('apartmentBlock') || '';
  const isSuperAdmin = role === 'ROLE_ADMIN';

  const [activeTab,  setActiveTab]  = useState('usage');   // 'usage' | 'billing'
  const [usageLogs,  setUsageLogs]  = useState([]);
  const [bills,      setBills]      = useState([]);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [searchQ,    setSearchQ]    = useState('');
  const [sortDir,    setSortDir]    = useState('desc');
  const [statusMsg,  setStatusMsg]  = useState(null);
  const [payQrModalBill, setPayQrModalBill] = useState(null); // Bill to collect via QR
  const [editingLog, setEditingLog] = useState(null); // Log to edit
  const [editLoading, setEditLoading] = useState(false);

  // Hierarchy Filter & Grouping States
  const [colonyFilter, setColonyFilter]         = useState('ALL');
  const [buildingFilter, setBuildingFilter]     = useState('ALL');
  const [groupByHierarchy, setGroupByHierarchy] = useState(false);

  // PDF Modal & Date Filtering States
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfDateMode, setPdfDateMode]   = useState('RANGE'); // 'ALL' | 'RANGE' | 'MONTH'
  const [pdfStartDate, setPdfStartDate] = useState('');
  const [pdfEndDate, setPdfEndDate]     = useState('');
  const [pdfMonth, setPdfMonth]         = useState(''); // format YYYY-MM

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [logRes, billRes, userRes] = await Promise.all([
        isSuperAdmin ? api.get('/usage/all') : api.get(`/usage/block/${block}`),
        isSuperAdmin ? api.get('/bills/all')  : api.get(`/bills/block/${block}`),
        api.get('/admin/users', { params: { callerRole: role, callerBlock: block } })
      ]);
      setUsageLogs(logRes.data || []);
      setBills(billRes.data || []);
      setUsers(userRes.data || []);
    } catch (e) {
      console.error(e);
      // fallback if admin/users fails (e.g. for dev/debug convenience)
      try {
        const [logRes, billRes] = await Promise.all([
          isSuperAdmin ? api.get('/usage/all') : api.get(`/usage/block/${block}`),
          isSuperAdmin ? api.get('/bills/all')  : api.get(`/bills/block/${block}`),
        ]);
        setUsageLogs(logRes.data || []);
        setBills(billRes.data || []);
      } catch (err) { console.error(err); }
    }
    finally { setLoading(false); }
  };
  const getUserName = (houseNum, aptBlk) => {
    if (!houseNum || !aptBlk) return 'N/A';
    const resident = users.find(
      u => String(u.houseNumber) === String(houseNum) && 
           String(u.apartmentBlock).toLowerCase() === String(aptBlk).toLowerCase()
    );
    return resident ? (resident.fullName || resident.username) : 'Unknown Resident';
  };

  // Returns the community admin name responsible for a given apartment block
  const getAdminForBlock = (aptBlk) => {
    if (!aptBlk) return '—';
    const admin = users.find(
      u => u.role === 'ROLE_COMMUNITY_ADMIN' &&
           String(u.apartmentBlock).toLowerCase() === String(aptBlk).toLowerCase()
    );
    return admin ? (admin.fullName || admin.username) : '—';
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
    setEditLoading(true);
    const u = localStorage.getItem('username');
    try {
      await api.put(`/usage/${editingLog.id}`, {
        houseNumber: editingLog.houseNumber,
        apartmentBlock: editingLog.apartmentBlock,
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
    } finally {
      setEditLoading(false);
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

  // ── Hierarchy & Filter Helpers ─────────────────────────────────────
  const getColonyForRecord = (record) => {
    if (record.colonyName) return record.colonyName;
    if (!record.apartmentBlock) return 'General Community';
    const matchedUser = users.find(u =>
      u.apartmentBlock && u.apartmentBlock.trim().toLowerCase() === record.apartmentBlock.trim().toLowerCase() && u.colonyName
    );
    return matchedUser?.colonyName || 'General Community';
  };

  // Dynamic list of unique colonies
  const availableColonies = Array.from(new Set(
    users.map(u => u.colonyName).concat(usageLogs.map(getColonyForRecord), bills.map(getColonyForRecord)).filter(Boolean)
  )).sort();

  // Dynamic list of unique buildings under currently selected colony (or all if ALL)
  const availableBuildings = Array.from(new Set(
    users
      .filter(u => colonyFilter === 'ALL' || (u.colonyName && u.colonyName.trim().toLowerCase() === colonyFilter.trim().toLowerCase()))
      .map(u => u.apartmentBlock)
      .concat(
        usageLogs
          .filter(l => colonyFilter === 'ALL' || getColonyForRecord(l).trim().toLowerCase() === colonyFilter.trim().toLowerCase())
          .map(l => l.apartmentBlock),
        bills
          .filter(b => colonyFilter === 'ALL' || getColonyForRecord(b).trim().toLowerCase() === colonyFilter.trim().toLowerCase())
          .map(b => b.apartmentBlock)
      )
      .filter(Boolean)
  )).sort();

  const q = searchQ.trim().toLowerCase();

  const filteredLogs = [...usageLogs]
    .filter(l => {
      const col = getColonyForRecord(l);
      if (colonyFilter !== 'ALL' && col.trim().toLowerCase() !== colonyFilter.trim().toLowerCase()) {
        return false;
      }
      if (buildingFilter !== 'ALL' && String(l.apartmentBlock).trim().toLowerCase() !== buildingFilter.trim().toLowerCase()) {
        return false;
      }
      if (q) {
        return [l.houseNumber, l.apartmentBlock, col, l.logType, String(l.readingLiters), getUserName(l.houseNumber, l.apartmentBlock)]
          .some(v => v && String(v).toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => sortDir === 'desc'
      ? new Date(b.readingDate) - new Date(a.readingDate)
      : new Date(a.readingDate) - new Date(b.readingDate));

  const filteredBills = [...bills]
    .filter(b => {
      const col = getColonyForRecord(b);
      if (colonyFilter !== 'ALL' && col.trim().toLowerCase() !== colonyFilter.trim().toLowerCase()) {
        return false;
      }
      if (buildingFilter !== 'ALL' && String(b.apartmentBlock).trim().toLowerCase() !== buildingFilter.trim().toLowerCase()) {
        return false;
      }
      if (q) {
        return [b.houseNumber, b.apartmentBlock, col, b.status, String(b.amount), getUserName(b.houseNumber, b.apartmentBlock)]
          .some(v => v && String(v).toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => sortDir === 'desc'
      ? new Date(b.generatedDate || b.createdAt) - new Date(a.generatedDate || a.createdAt)
      : new Date(a.generatedDate || a.createdAt) - new Date(b.generatedDate || b.createdAt));

  // Group logs by month
  const monthlyLogsGrouped = [];
  const processedMonths = new Set();
  filteredLogs.forEach(log => {
    const month = getBillingMonthLabel(log.readingDate);
    if (!processedMonths.has(month)) {
      processedMonths.add(month);
      const monthLogs = filteredLogs.filter(l => getBillingMonthLabel(l.readingDate) === month);
      const totalLiters = monthLogs.reduce((s, l) => s + (l.readingLiters || 0), 0);
      monthlyLogsGrouped.push({
        month,
        totalLiters,
        logs: monthLogs
      });
    }
  });

  // Group bills by month
  const monthlyBillsGrouped = [];
  const processedBillMonths = new Set();
  filteredBills.forEach(bill => {
    const month = getBillingMonthLabel(bill.generatedDate || bill.createdAt);
    if (!processedBillMonths.has(month)) {
      processedBillMonths.add(month);
      const monthBills = filteredBills.filter(b => getBillingMonthLabel(b.generatedDate || b.createdAt) === month);
      const totalAmount = monthBills.reduce((s, b) => s + (b.amount || 0), 0);
      monthlyBillsGrouped.push({
        month,
        totalAmount,
        bills: monthBills
      });
    }
  });

  // Helper to group records by Colony -> Building
  const getHierarchyGroupedData = (items) => {
    const colonyMap = {};
    items.forEach(item => {
      const colony = getColonyForRecord(item);
      const bldg = item.apartmentBlock || 'Unassigned Building';
      if (!colonyMap[colony]) colonyMap[colony] = {};
      if (!colonyMap[colony][bldg]) colonyMap[colony][bldg] = [];
      colonyMap[colony][bldg].push(item);
    });
    return colonyMap;
  };

  // Returns true if this log's month+house has a bill generated (finalized)
  const isLogBilled = (log) => {
    if (!log.readingDate || !log.houseNumber) return false;
    const parts = log.readingDate.split('-');
    if (parts.length < 2) return false;
    const logYear  = parseInt(parts[0], 10);
    const logMonth = parseInt(parts[1], 10);
    return bills.some(b => {
      if (b.houseNumber !== log.houseNumber) return false;
      const dateStr = b.generatedDate || b.createdAt;
      if (!dateStr) return false;
      const bp = dateStr.split('-');
      return parseInt(bp[0], 10) === logYear && parseInt(bp[1], 10) === logMonth;
    });
  };

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

  // ── PDF Report Generator ──────────────────────────────────────────
  const downloadPDFReport = () => {
    const isUsage = activeTab === 'usage';
    let targetLogs  = [...filteredLogs];
    let targetBills = [...filteredBills];
    let filterDescription = 'All Historical Records';

    // Apply PDF Date Filtering
    if (pdfDateMode === 'RANGE') {
      if (pdfStartDate) {
        const start = new Date(pdfStartDate);
        targetLogs  = targetLogs.filter(l => l.readingDate && new Date(l.readingDate) >= start);
        targetBills = targetBills.filter(b => (b.generatedDate || b.createdAt) && new Date(b.generatedDate || b.createdAt) >= start);
      }
      if (pdfEndDate) {
        const end = new Date(pdfEndDate);
        end.setHours(23, 59, 59, 999);
        targetLogs  = targetLogs.filter(l => l.readingDate && new Date(l.readingDate) <= end);
        targetBills = targetBills.filter(b => (b.generatedDate || b.createdAt) && new Date(b.generatedDate || b.createdAt) <= end);
      }
      filterDescription = `Custom Range: ${pdfStartDate || 'Beginning'} to ${pdfEndDate || 'Today'}`;
    } else if (pdfDateMode === 'MONTH' && pdfMonth) {
      const [mYear, mNum] = pdfMonth.split('-').map(Number);
      targetLogs  = targetLogs.filter(l => {
        if (!l.readingDate) return false;
        const d = new Date(l.readingDate);
        return d.getFullYear() === mYear && (d.getMonth() + 1) === mNum;
      });
      targetBills = targetBills.filter(b => {
        const dateStr = b.generatedDate || b.createdAt;
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === mYear && (d.getMonth() + 1) === mNum;
      });
      const monthObj = new Date(mYear, mNum - 1, 1);
      filterDescription = `Specific Month: ${monthObj.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
    }

    const reportTitle = isUsage ? 'Water Usage Audit Report' : 'Billing Records Financial Report';
    const blockText = block ? `Block: ${block}` : 'All Apartment Blocks';
    const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' });
    const userRoleText = isSuperAdmin ? 'Super Admin' : 'Community Admin';

    let tableRowsHTML = '';

    if (isUsage) {
      if (targetLogs.length === 0) {
        tableRowsHTML = `<tr><td colspan="${isSuperAdmin ? 7 : 6}" style="text-align: center; padding: 24px; color: #94a3b8; font-style: italic;">No usage records found for the selected date range.</td></tr>`;
      } else {
        tableRowsHTML = targetLogs.map((log, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${getUserName(log.houseNumber, log.apartmentBlock)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${log.houseNumber}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${log.apartmentBlock}</td>
            ${isSuperAdmin ? `<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${getAdminForBlock(log.apartmentBlock)}</td>` : ''}
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0284c7;">${log.readingLiters} L</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; color: #475569;">${log.logType || 'DAILY'}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${log.readingDate ? new Date(log.readingDate).toLocaleDateString('en-IN') : '—'}</td>
          </tr>
        `).join('');
      }
    } else {
      if (targetBills.length === 0) {
        tableRowsHTML = `<tr><td colspan="${isSuperAdmin ? 8 : 7}" style="text-align: center; padding: 24px; color: #94a3b8; font-style: italic;">No billing records found for the selected date range.</td></tr>`;
      } else {
        tableRowsHTML = targetBills.map((bill, idx) => {
          const isPaid = bill.status === 'PAID';
          const statusColor = isPaid ? '#15803d' : bill.status === 'OVERDUE' ? '#b91c1c' : '#b45309';
          return `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${getUserName(bill.houseNumber, bill.apartmentBlock)}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${bill.houseNumber}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${bill.apartmentBlock}</td>
              ${isSuperAdmin ? `<td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${getAdminForBlock(bill.apartmentBlock)}</td>` : ''}
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #059669;">₹${bill.amount}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: ${statusColor};">${bill.status}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : '—'}</td>
              <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${bill.generatedDate ? new Date(bill.generatedDate).toLocaleDateString('en-IN') : '—'}</td>
            </tr>
          `;
        }).join('');
      }
    }

    const totalStatsHTML = isUsage ? `
      <div style="display: flex; gap: 20px; margin-bottom: 24px;">
        <div style="flex: 1; padding: 14px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px;">
          <span style="font-size: 11px; color: #0369a1; text-transform: uppercase; font-weight: 700; display: block;">Total Logs Analyzed</span>
          <strong style="font-size: 20px; color: #0284c7;">${targetLogs.length} Records</strong>
        </div>
        <div style="flex: 1; padding: 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px;">
          <span style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700; display: block;">Cumulative Water Usage</span>
          <strong style="font-size: 20px; color: #059669;">${targetLogs.reduce((s, l) => s + (l.readingLiters || 0), 0).toLocaleString('en-IN')} Liters</strong>
        </div>
      </div>
    ` : `
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; padding: 14px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px;">
          <span style="font-size: 11px; color: #0369a1; text-transform: uppercase; font-weight: 700; display: block;">Total Bills</span>
          <strong style="font-size: 20px; color: #0284c7;">${targetBills.length} Bills</strong>
        </div>
        <div style="flex: 1; padding: 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px;">
          <span style="font-size: 11px; color: #047857; text-transform: uppercase; font-weight: 700; display: block;">Paid Amount</span>
          <strong style="font-size: 20px; color: #059669;">₹${targetBills.filter(b => b.status === 'PAID').reduce((s, b) => s + (b.amount || 0), 0).toLocaleString('en-IN')}</strong>
        </div>
        <div style="flex: 1; padding: 14px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px;">
          <span style="font-size: 11px; color: #b91c1c; text-transform: uppercase; font-weight: 700; display: block;">Pending / Unpaid</span>
          <strong style="font-size: 20px; color: #dc2626;">₹${targetBills.filter(b => b.status !== 'PAID').reduce((s, b) => s + (b.amount || 0), 0).toLocaleString('en-IN')}</strong>
        </div>
      </div>
    `;

    const printableHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 32px; margin: 0; background: #ffffff; }
            .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; }
            .logo-title { font-size: 24px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; }
            .meta-text { font-size: 12px; color: #64748b; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
            th { background-color: #0f172a; color: #ffffff; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; pt: 16px; font-size: 11px; color: #94a3b8; text-align: center; }
            @media print {
              body { padding: 0; }
              @page { size: A4 landscape; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div>
              <div class="logo-title">💧 AquaTrack Management System</div>
              <div style="font-size: 16px; font-weight: 700; color: #334155; margin-top: 4px;">${reportTitle}</div>
              <div class="meta-text">${blockText} · ${filterDescription} · Generated by ${userRoleText} (${localStorage.getItem('username') || 'Admin'})</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Generated Date</div>
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${timestamp}</div>
            </div>
          </div>

          ${totalStatsHTML}

          <table>
            <thead>
              <tr>
                <th>Resident</th>
                <th>House #</th>
                <th>Block</th>
                ${isSuperAdmin ? '<th>Community Admin</th>' : ''}
                ${isUsage ? '<th>Reading (Liters)</th><th>Log Type</th><th>Reading Date</th>' : '<th>Amount</th><th>Status</th><th>Due Date</th><th>Generated Date</th>'}
              </tr>
            </thead>
            <tbody>
              ${tableRowsHTML}
            </tbody>
          </table>

          <div class="footer">
            AquaTrack Water & Infrastructure Monitoring Platform — Official System Audit PDF Document (${filterDescription})
            <div style="margin-top: 5px; font-size: 10px; font-weight: 700; color: #475569;">
              Built with ❤️ by Krishna Mohan
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    setShowPdfModal(false);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printableHTML);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Page Header & Top Actions ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text tracking-tight flex items-center gap-2.5">
            <Droplet className="w-7 h-7 text-primary shrink-0" />
            Water & Billing History
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-0.5">
            Full audit trail of meter readings, community consumption, and generated invoices.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface hover:bg-surface-lighter text-text-muted hover:text-text border border-border rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs"
            title="Refresh Data"
          >
            <Clock className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all cursor-pointer border border-emerald-400/40"
            title={`Export PDF report for ${activeTab === 'usage' ? 'Water Usage Logs' : 'Billing Records'}`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Download {activeTab === 'usage' ? 'Water Logs' : 'Billing'} PDF</span>
          </button>
        </div>
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

      {/* ── Master Unified Control Panel ────────────────────────────────── */}
      <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-sm space-y-3.5">
        {/* Panel Row 1: Primary Category Tabs & Grouping View Toggle */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
          {/* Sub-Tab Selector with vibrant color contrast */}
          <div className="flex items-center gap-1.5 bg-surface-lighter/90 border border-border/80 p-1 rounded-2xl w-full sm:w-fit shadow-xs">
            <button
              onClick={() => setActiveTab('usage')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'usage'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 border border-blue-400/30 scale-[1.02]'
                  : 'text-text-muted hover:text-text hover:bg-surface/60'
              }`}
              title="Click to view Water Meter Reading Logs"
            >
              <Droplet className={`w-4 h-4 shrink-0 ${activeTab === 'usage' ? 'text-white' : 'text-blue-500'}`} />
              <span>Water Usage Logs</span>
              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                activeTab === 'usage' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
              }`}>{filteredLogs.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'billing'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 border border-emerald-400/30 scale-[1.02]'
                  : 'text-text-muted hover:text-text hover:bg-surface/60'
              }`}
              title="Click to view Customer Billing Records"
            >
              <Receipt className={`w-4 h-4 shrink-0 ${activeTab === 'billing' ? 'text-white' : 'text-emerald-500'}`} />
              <span>Billing Records</span>
              <span className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                activeTab === 'billing' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>{filteredBills.length}</span>
            </button>
          </div>

          {/* Grouping View Switcher (Date vs Community Hierarchy) - Super Admin Only */}
          {isSuperAdmin && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Grouping:
              </span>
              <div className="flex items-center gap-1 bg-surface-lighter/90 border border-border/80 p-1 rounded-2xl shrink-0 w-full sm:w-auto shadow-xs">
                <button
                  onClick={() => setGroupByHierarchy(false)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    !groupByHierarchy
                      ? 'bg-surface text-text shadow-xs border border-border'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  By Date
                </button>
                <button
                  onClick={() => setGroupByHierarchy(true)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    groupByHierarchy
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-300" />
                  By Community & Building
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel Row 2: Search Input, Community Filter, Building Filter & Sort */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <MicSearchBox
              value={searchQ}
              onChange={setSearchQ}
              onClear={() => setSearchQ('')}
              placeholder={activeTab === 'usage' ? 'Search house, block, liters…' : 'Search house, amount, status…'}
            />
          </div>

          {/* Dropdown Filters Strip */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Colony & Building Filters (Super Admin Only) */}
            {isSuperAdmin && (
              <>
                {/* Colony Filter */}
                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex-1 sm:flex-none min-w-[170px]">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-text-muted text-xs shrink-0 font-medium">Community:</span>
                  <select
                    value={colonyFilter}
                    onChange={(e) => {
                      setColonyFilter(e.target.value);
                      setBuildingFilter('ALL');
                    }}
                    className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm"
                  >
                    <option value="ALL" className="bg-surface text-text">All Communities</option>
                    {availableColonies.map(col => (
                      <option key={col} value={col} className="bg-surface text-text">{col}</option>
                    ))}
                  </select>
                </div>

                {/* Building Filter */}
                <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold flex-1 sm:flex-none min-w-[150px]">
                  <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
                  <span className="text-text-muted text-xs shrink-0 font-medium">Building:</span>
                  <select
                    value={buildingFilter}
                    onChange={(e) => setBuildingFilter(e.target.value)}
                    className="bg-transparent text-text font-bold focus:outline-none cursor-pointer w-full text-xs sm:text-sm"
                  >
                    <option value="ALL" className="bg-surface text-text">All Buildings</option>
                    {availableBuildings.map(bldg => (
                      <option key={bldg} value={bldg} className="bg-surface text-text">{bldg}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Touch-Friendly Mobile & Desktop Sort Direction Toggle */}
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              className="w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2.5 px-3.5 py-2.5 bg-gradient-to-r from-blue-500/15 via-cyan-500/10 to-blue-500/15 hover:from-blue-500/25 hover:to-cyan-500/20 border border-blue-500/30 rounded-xl text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-300 shadow-xs active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Toggle Sort Order (Newest / Oldest)"
            >
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-text-muted font-medium text-xs">Sort:</span>
                <strong className="text-blue-600 dark:text-blue-300 font-bold">{sortDir === 'desc' ? 'Newest First' : 'Oldest First'}</strong>
              </span>
              <span className="flex items-center gap-1 bg-blue-500/20 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black text-blue-500 uppercase tracking-wider">
                {sortDir === 'desc' ? 'DESC ↓' : 'ASC ↑'}
              </span>
            </button>

            {/* Clear Filters (If active) */}
            {(colonyFilter !== 'ALL' || buildingFilter !== 'ALL' || searchQ) && (
              <button
                onClick={() => { setColonyFilter('ALL'); setBuildingFilter('ALL'); setSearchQ(''); }}
                className="px-2.5 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 shrink-0"
                title="Reset all filters"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
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
                  <p className="font-medium">No usage logs found matching your filters</p>
                </div>
              ) : groupByHierarchy ? (
                /* ===== HIERARCHY GROUPED VIEW (Usage Logs) ===== */
                <div className="space-y-6">
                  {Object.entries(getHierarchyGroupedData(filteredLogs)).map(([colonyName, bldgObj]) => (
                    <div key={colonyName} className="space-y-4 bg-surface border border-blue-500/20 p-4 sm:p-5 rounded-2xl shadow-xs">
                      {/* Community Header */}
                      <div className="flex items-center justify-between gap-3 border-b border-blue-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-blue-500 shrink-0" />
                          <h3 className="text-base sm:text-lg font-extrabold text-text">
                            Community: <span className="text-blue-600 dark:text-blue-400">{colonyName}</span>
                          </h3>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 rounded-full">
                          {Object.values(bldgObj).flat().length} Log(s)
                        </span>
                      </div>

                      {/* Buildings under this Colony */}
                      <div className="space-y-5">
                        {Object.entries(bldgObj).map(([bldgName, bldgLogs]) => {
                          const bldgLiters = bldgLogs.reduce((s, l) => s + (l.readingLiters || 0), 0);
                          return (
                            <div key={bldgName} className="space-y-3">
                              <div className="flex items-center justify-between gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                  <span className="font-bold text-xs sm:text-sm text-text">
                                    Building: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{bldgName}</span>
                                  </span>
                                </div>
                                <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                                  Total: {bldgLiters.toLocaleString()} L
                                </span>
                              </div>

                              {/* Table for this Building */}
                              <div className="bg-surface-lighter/30 border border-border rounded-xl overflow-hidden shadow-xs">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-border bg-surface-lighter/70">
                                        {['Resident', 'House #', 'Reading (L)', 'Type', 'Date', 'Actions'].map(h => (
                                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {bldgLogs.map(log => {
                                        const billed = isLogBilled(log);
                                        return (
                                          <tr key={log.id} className="hover:bg-surface-lighter/50 transition-colors">
                                            <td className="px-4 py-2.5 font-semibold text-text">{getUserName(log.houseNumber, log.apartmentBlock)}</td>
                                            <td className="px-4 py-2.5 font-semibold text-text">{log.houseNumber}</td>
                                            <td className={`px-4 py-2.5 font-bold ${billed ? 'text-emerald-400' : 'text-blue-400'}`}>{log.readingLiters} L</td>
                                            <td className="px-4 py-2.5">
                                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${logTypeColor(log.logType)}`}>
                                                {log.logType || 'DAILY'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                                              {log.readingDate ? new Date(log.readingDate).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td className="px-4 py-2.5">
                                              {billed ? (
                                                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                                  <CheckCircle2 className="w-3 h-3" /> Billed
                                                </span>
                                              ) : (
                                                <div className="flex items-center gap-1">
                                                  <button onClick={() => setEditingLog(log)} className="p-1 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                                  <button onClick={() => deleteLog(log.id)} className="p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ===== STANDARD MONTHLY VIEW (Usage Logs) ===== */
                <div className="space-y-6">
                  {monthlyLogsGrouped.map(group => (
                    <div key={group.month} className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-primary/10 border border-primary/20 px-4 sm:px-5 py-3 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-text text-xs sm:text-sm flex items-center gap-2">
                          <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-primary shrink-0" />
                          {group.month}
                        </h3>
                        <span className="text-[10px] sm:text-xs font-extrabold text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/20 w-fit whitespace-nowrap">
                          Cumulative Usage: {group.totalLiters.toLocaleString()} L
                        </span>
                      </div>

                      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-surface-lighter/50">
                                {['Resident', 'House #', 'Community / Colony', 'Building', ...(isSuperAdmin ? ['Community Admin'] : []), 'Reading (L)', 'Type', 'Date', 'Actions'].map(h => (
                                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {group.logs.map(log => {
                                const billed = isLogBilled(log);
                                const colony = getColonyForRecord(log);
                                return (
                                  <tr key={log.id} className={`transition-colors ${
                                    billed
                                      ? 'bg-emerald-500/5 border-l-2 border-l-emerald-500/40'
                                      : 'hover:bg-surface-lighter/30'
                                  }`}>
                                    <td className="px-4 py-3 font-semibold text-text">{getUserName(log.houseNumber, log.apartmentBlock)}</td>
                                    <td className="px-4 py-3 font-semibold text-text">{log.houseNumber}</td>
                                    <td className="px-4 py-3">
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 whitespace-nowrap flex items-center gap-1 w-fit">
                                        <MapPin className="w-3 h-3 text-blue-500" />
                                        {colony}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 whitespace-nowrap flex items-center gap-1 w-fit">
                                        <Building2 className="w-3 h-3 text-purple-500" />
                                        {log.apartmentBlock}
                                      </span>
                                    </td>
                                    {isSuperAdmin && (
                                      <td className="px-4 py-3">
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border text-violet-400 bg-violet-500/10 border-violet-500/20 whitespace-nowrap">
                                          {getAdminForBlock(log.apartmentBlock)}
                                        </span>
                                      </td>
                                    )}
                                    <td className={`px-4 py-3 font-bold ${billed ? 'text-emerald-400' : 'text-blue-400'}`}>{log.readingLiters} L</td>
                                    <td className="px-4 py-3">
                                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${logTypeColor(log.logType)}`}>
                                        {log.logType || 'DAILY'}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                                      {log.readingDate ? new Date(log.readingDate).toLocaleDateString('en-IN') : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                      {billed ? (
                                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                          <CheckCircle2 className="w-3 h-3" /> Billed
                                        </span>
                                      ) : (
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
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="px-4 py-3 border border-border bg-surface-lighter/10 rounded-xl text-xs text-text-muted">
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
                  <p className="font-medium">No bills found matching your filters</p>
                </div>
              ) : groupByHierarchy ? (
                /* ===== HIERARCHY GROUPED VIEW (Billing Records) ===== */
                <div className="space-y-6">
                  {Object.entries(getHierarchyGroupedData(filteredBills)).map(([colonyName, bldgObj]) => (
                    <div key={colonyName} className="space-y-4 bg-surface border border-emerald-500/20 p-4 sm:p-5 rounded-2xl shadow-xs">
                      {/* Community Header */}
                      <div className="flex items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-emerald-500 shrink-0" />
                          <h3 className="text-base sm:text-lg font-extrabold text-text">
                            Community: <span className="text-emerald-600 dark:text-emerald-400">{colonyName}</span>
                          </h3>
                        </div>
                        <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20 rounded-full">
                          {Object.values(bldgObj).flat().length} Bill(s)
                        </span>
                      </div>

                      {/* Buildings under this Colony */}
                      <div className="space-y-5">
                        {Object.entries(bldgObj).map(([bldgName, bldgBills]) => {
                          const bldgAmount = bldgBills.reduce((s, b) => s + (b.amount || 0), 0);
                          return (
                            <div key={bldgName} className="space-y-3">
                              <div className="flex items-center justify-between gap-2 bg-purple-500/10 border border-purple-500/20 px-4 py-2.5 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                  <span className="font-bold text-xs sm:text-sm text-text">
                                    Building: <span className="text-purple-600 dark:text-purple-400 font-extrabold">{bldgName}</span>
                                  </span>
                                </div>
                                <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                  Total: ₹{bldgAmount.toLocaleString('en-IN')}
                                </span>
                              </div>

                              {/* Table for this Building */}
                              <div className="bg-surface-lighter/30 border border-border rounded-xl overflow-hidden shadow-xs">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-border bg-surface-lighter/70">
                                        {['Resident', 'House #', 'Amount', 'Status', 'Due Date', 'Generated', 'Actions'].map(h => (
                                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {bldgBills.map(bill => (
                                        <tr key={bill.id} className="hover:bg-surface-lighter/50 transition-colors">
                                          <td className="px-4 py-2.5 font-semibold text-text">{getUserName(bill.houseNumber, bill.apartmentBlock)}</td>
                                          <td className="px-4 py-2.5 font-semibold text-text">{bill.houseNumber}</td>
                                          <td className="px-4 py-2.5 font-bold text-emerald-400">₹{bill.amount}</td>
                                          <td className="px-4 py-2.5">
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColor(bill.status)}`}>
                                              {bill.status}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                                            {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : '—'}
                                          </td>
                                          <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                                            {bill.generatedDate ? new Date(bill.generatedDate).toLocaleDateString('en-IN') : '—'}
                                          </td>
                                          <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1">
                                              {bill.status !== 'PAID' && (
                                                <>
                                                  <button onClick={() => setPayQrModalBill(bill)} className="p-1 text-text-muted hover:text-blue-400 hover:bg-blue-500/10 rounded cursor-pointer" title="Collect Payment"><QrCode className="w-3.5 h-3.5" /></button>
                                                  <button onClick={() => markPaid(bill.id)} className="p-1 text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer" title="Mark Paid"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                                  <button onClick={() => deleteBill(bill.id)} className="p-1 text-text-muted hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </>
                                              )}
                                              {bill.status === 'PAID' && (
                                                <span className="p-1 text-text-muted/30 cursor-not-allowed" title="Protected"><Trash2 className="w-3.5 h-3.5" /></span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ===== STANDARD MONTHLY VIEW (Billing Records) ===== */
                <div className="space-y-6">
                  {monthlyBillsGrouped.map(group => (
                    <div key={group.month} className="space-y-3">
                      <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-5 py-3 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-text text-sm flex items-center gap-2">
                          <Calendar className="w-4.5 h-4.5 text-emerald-400" />
                          {group.month}
                        </h3>
                        <span className="text-xs font-black text-emerald-950 dark:text-emerald-200 bg-emerald-500/20 px-3 py-1 rounded-full border border-transparent">
                          Total Billed: ₹{group.totalAmount.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border bg-surface-lighter/50">
                                {['Resident', 'House #', 'Community / Colony', 'Building', ...(isSuperAdmin ? ['Community Admin'] : []), 'Amount', 'Status', 'Due Date', 'Generated', 'Actions'].map(h => (
                                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                              {group.bills.map(bill => {
                                const colony = getColonyForRecord(bill);
                                return (
                                  <tr key={bill.id} className="hover:bg-surface-lighter/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-text">{getUserName(bill.houseNumber, bill.apartmentBlock)}</td>
                                    <td className="px-4 py-3 font-semibold text-text">{bill.houseNumber}</td>
                                    <td className="px-4 py-3">
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 whitespace-nowrap flex items-center gap-1 w-fit">
                                        <MapPin className="w-3 h-3 text-blue-500" />
                                        {colony}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 whitespace-nowrap flex items-center gap-1 w-fit">
                                        <Building2 className="w-3 h-3 text-purple-500" />
                                        {bill.apartmentBlock}
                                      </span>
                                    </td>
                                    {isSuperAdmin && (
                                       <td className="px-4 py-3">
                                         <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border text-violet-400 bg-violet-500/10 border-violet-500/20 whitespace-nowrap">
                                           {getAdminForBlock(bill.apartmentBlock)}
                                         </span>
                                       </td>
                                     )}
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
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="px-4 py-3 border border-border bg-surface-lighter/10 rounded-xl flex items-center justify-between text-xs text-text-muted">
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
                <p className="text-[11px] text-primary mt-1.5 font-bold">
                  Billing Cycle: <span className="text-text">{getBillingMonthLabel(editingLog.readingDate)}</span>
                </p>
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
                <button type="submit" disabled={editLoading} className="px-6 py-2 bg-primary text-white hover:bg-primary/95 disabled:opacity-50 rounded-xl text-sm font-bold transition-colors cursor-pointer">
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* PDF Date & Month Range Options Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative"
          >
            <button
              onClick={() => setShowPdfModal(false)}
              className="absolute top-4 right-4 text-text hover:text-text cursor-pointer p-1.5 rounded-lg hover:bg-surface-lighter transition-colors"
            >
              <X className="w-5 h-5 text-text" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-text">Export PDF Report</h3>
                <p className="text-xs font-semibold text-text-muted">
                  {activeTab === 'usage' ? 'Water Usage Logs' : 'Billing Records'} Report Options
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Date Filter Mode Switcher */}
              <div>
                <label className="text-xs font-bold text-text uppercase tracking-wider mb-2 block">
                  Select Date Range Filter
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-surface-lighter p-1.5 rounded-xl border border-border text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPdfDateMode('ALL')}
                    className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                      pdfDateMode === 'ALL'
                        ? 'bg-emerald-600 text-white shadow-md font-black'
                        : 'text-text hover:text-text hover:bg-surface'
                    }`}
                  >
                    All Records
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfDateMode('RANGE')}
                    className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                      pdfDateMode === 'RANGE'
                        ? 'bg-emerald-600 text-white shadow-md font-black'
                        : 'text-text hover:text-text hover:bg-surface'
                    }`}
                  >
                    Date Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfDateMode('MONTH')}
                    className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                      pdfDateMode === 'MONTH'
                        ? 'bg-emerald-600 text-white shadow-md font-black'
                        : 'text-text hover:text-text hover:bg-surface'
                    }`}
                  >
                    Specific Month
                  </button>
                </div>
              </div>

              {/* Mode 1: Custom Date Range (From - To) */}
              {pdfDateMode === 'RANGE' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 bg-surface-lighter p-4 rounded-xl border border-border">
                  <div>
                    <label className="text-xs font-bold text-text mb-1 block">From Date</label>
                    <input
                      type="date"
                      value={pdfStartDate}
                      onChange={e => setPdfStartDate(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text mb-1 block">To Date</label>
                    <input
                      type="date"
                      value={pdfEndDate}
                      onChange={e => setPdfEndDate(e.target.value)}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    />
                  </div>
                </motion.div>
              )}

              {/* Mode 2: Specific Month Selector */}
              {pdfDateMode === 'MONTH' && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-lighter p-4 rounded-xl border border-border">
                  <label className="text-xs font-bold text-text mb-1 block">Select Month & Year</label>
                  <input
                    type="month"
                    value={pdfMonth}
                    onChange={e => setPdfMonth(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </motion.div>
              )}

              {/* Mode 3: All Records note */}
              {pdfDateMode === 'ALL' && (
                <div className="bg-emerald-500/15 border border-emerald-500/40 p-3.5 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-start gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">ℹ️</span>
                  <span>The exported PDF will include all available history records matching current search criteria.</span>
                </div>
              )}

              {/* Download Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center sm:justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-surface-lighter border border-border text-text hover:bg-surface rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={downloadPDFReport}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Generate & Download PDF
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
