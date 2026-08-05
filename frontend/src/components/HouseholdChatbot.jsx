import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { getBcp47Locale } from '../utils/languages';

const WaterLogFormWidget = ({ parsedLiters, onLogged }) => {
  const [residents, setResidents] = useState([]);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedResident, setSelectedResident] = useState(null);
  const [readingDate, setReadingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [readingLiters, setReadingLiters] = useState(parsedLiters ? String(parsedLiters) : '');
  const [logType, setLogType] = useState('MONTHLY');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const block = localStorage.getItem('apartmentBlock') || 'Block A';
  const callerRole = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        const res = await api.get(`/admin/users?callerRole=${callerRole}&callerBlock=${encodeURIComponent(block)}`);
        if (res.data && Array.isArray(res.data)) {
          setResidents(res.data);
          if (res.data.length > 0) {
            setSelectedResident(res.data[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching residents for chatbot widget:", err);
      } finally {
        setLoadingResidents(false);
      }
    };
    fetchResidents();
  }, [block, callerRole]);

  const filteredResidents = residents.filter(r => {
    const term = search.toLowerCase();
    const house = (r.houseNumber || '').toLowerCase();
    const name = (r.fullName || r.username || '').toLowerCase();
    return house.includes(term) || name.includes(term);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedResident) {
      setErrorMsg("Please select a household resident.");
      return;
    }
    if (!readingLiters || isNaN(readingLiters) || parseFloat(readingLiters) < 0) {
      setErrorMsg("Please enter a valid water reading in liters.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }

      await api.post(`/usage/log?callerRole=${callerRole}`, {
        houseNumber: selectedResident.houseNumber,
        apartmentBlock: selectedResident.apartmentBlock || block,
        readingDate: readingDate,
        readingLiters: parseFloat(readingLiters),
        logType: logType,
        source: 'MANUAL'
      });

      setSuccessMsg({
        house: selectedResident.houseNumber,
        name: selectedResident.fullName || selectedResident.username,
        liters: readingLiters,
        date: readingDate,
        logType: logType
      });
      if (onLogged) onLogged();
    } catch (err) {
      const errorText = err.response?.data?.message || err.response?.data || "Failed to log water reading. Please check if billing month is already locked.";
      setErrorMsg(typeof errorText === 'string' ? errorText : "Failed to log water reading.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successMsg) {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border-2 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 shadow-md animate-fade-in">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm mb-2">
          <span>✅</span>
          <span>Water Meter Reading Successfully Logged!</span>
        </div>
        <div className="text-xs space-y-1 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-500/20 font-medium">
          <p>• <strong>Household:</strong> {successMsg.house} ({successMsg.name})</p>
          <p>• <strong>Volume Logged:</strong> <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{successMsg.liters} Liters</strong> ({successMsg.logType})</p>
          <p>• <strong>Reading Date:</strong> {successMsg.date}</p>
          <p>• <strong>Status:</strong> Saved to Database & Resident Notified 🔔</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/90 dark:from-slate-900/90 dark:to-indigo-950/90 border-2 border-indigo-300 dark:border-indigo-700/60 shadow-lg text-slate-800 dark:text-slate-100 text-xs select-text">
      <div className="flex items-center gap-1.5 font-extrabold text-indigo-950 dark:text-indigo-200 text-xs mb-2.5">
        <span className="text-base">💧</span>
        <span>Quick In-Chat Meter Log Workstation</span>
      </div>

      {errorMsg && (
        <div className="mb-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Step 1: Resident Search & Select */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
              1. Search & Select Resident:
            </label>
            <span className="text-[10px] text-slate-500 font-semibold">
              Showing {filteredResidents.length} of {residents.length}
            </span>
          </div>

          <div className="relative mb-1.5">
            <input
              type="text"
              placeholder="🔍 Search by Name, House No, Meter ID (e.g. MTR-113)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {loadingResidents ? (
            <p className="text-[10px] text-slate-500 animate-pulse italic">Loading block residents...</p>
          ) : filteredResidents.length > 0 ? (
            <div className="max-h-36 overflow-y-auto space-y-1 bg-white/80 dark:bg-slate-800/80 p-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-inner custom-scrollbar">
              {filteredResidents.map((res) => {
                const isSelected = selectedResident?.id === res.id;
                const meterIdDisplay = res.meterId || res.meterNo || res.waterMeterId || `MTR-${res.id || 100}`;
                return (
                  <button
                    key={res.id || res.username}
                    type="button"
                    onClick={() => setSelectedResident(res)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between text-[11px] cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'hover:bg-indigo-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>🏠 <strong>House #{res.houseNumber || '???'}</strong> — {res.fullName || res.username}</span>
                      <span className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-400'}`}>
                        Meter ID: {meterIdDisplay} {res.apartmentBlock ? `• ${res.apartmentBlock}` : ''}
                      </span>
                    </div>
                    {isSelected && <span className="font-extrabold text-sm">✓</span>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
              ⚠️ No matching resident found for "{search}". Try searching by Meter ID (e.g. MTR-113) or House Number.
            </div>
          )}
        </div>

        {/* Step 2: Log Type, Reading Date & Volume */}
        <div>
          <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
            2. Log Frequency / Type:
          </label>
          <div className="grid grid-cols-3 gap-1 mb-2">
            {[
              { id: 'DAILY', label: '📅 Daily' },
              { id: 'WEEKLY', label: '📊 Weekly' },
              { id: 'MONTHLY', label: '🗓️ Monthly' }
            ].map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setLogType(type.id)}
                className={`py-1 px-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer border ${
                  logType === type.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                3. Reading Date:
              </label>
              <input
                type="date"
                value={readingDate}
                onChange={(e) => setReadingDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                4. Water Log (Liters):
              </label>
              <input
                type="number"
                placeholder="e.g. 250"
                value={readingLiters}
                onChange={(e) => setReadingLiters(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-extrabold text-indigo-600 dark:text-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Submit Action Button */}
        {(() => {
          const parsedVal = parseFloat(readingLiters);
          const isValidLiters = !isNaN(parsedVal) && parsedVal > 0;
          const isDisabled = submitting || !selectedResident || !isValidLiters;

          return (
            <button
              type="submit"
              disabled={isDisabled}
              className={`w-full py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md ${
                isDisabled
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20 active:scale-98 cursor-pointer'
              }`}
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Logging Reading...</span>
                </>
              ) : !isValidLiters ? (
                <span>⚠️ Enter Liters (&gt; 0) to Enable Logging</span>
              ) : (
                <span>💧 Log {readingLiters} Liters for House #{selectedResident?.houseNumber}</span>
              )}
            </button>
          );
        })()}
      </form>
    </div>
  );
};

const ReportGeneratorWidget = () => {
  const [reportType, setReportType] = useState('PNL'); // 'PNL' | 'BILLING' | 'OUTFLOW'
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const m = ['January','February','March','April','May','June','July','August','September','October','November','December'][d.getMonth()];
    return `${m} ${d.getFullYear()}`;
  });
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);

  const block = localStorage.getItem('apartmentBlock') || 'Block A';
  const callerRole = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';
  const adminName = localStorage.getItem('fullName') || localStorage.getItem('username') || 'Community Admin';

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setSuccess(false);

    try {
      const token = localStorage.getItem('token');
      if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      let printableHTML = '';
      const nowStr = new Date().toLocaleString();

      if (reportType === 'PNL') {
        const [purchaseRes, usageRes] = await Promise.allSettled([
          api.get(`/bulk-purchases?adminUsername=${localStorage.getItem('username') || ''}&billingMonth=${encodeURIComponent(month)}`),
          api.get(`/usage/block-summary?apartmentBlock=${encodeURIComponent(block)}&callerRole=${callerRole}&billingMonth=${encodeURIComponent(month)}`)
        ]);

        const purchases = (purchaseRes.status === 'fulfilled' && purchaseRes.value.data) ? purchaseRes.value.data : [];
        const usageData = (usageRes.status === 'fulfilled' && usageRes.value.data) ? usageRes.value.data : {};

        const totalInflowCost = purchases.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
        const totalPurchasedVolume = purchases.reduce((sum, item) => sum + (Number(item.purchasedVolumeLiters) || 0), 0);
        const totalResidentConsumption = Number(usageData.totalVolumeLiters || 0);
        const totalInflowRevenue = Number(usageData.totalBilledAmount || 0);
        const netPnlVal = totalInflowRevenue - totalInflowCost;
        const isProf = netPnlVal >= 0;

        const purchaseRowsHTML = purchases.length > 0 ? purchases.map(p => `
          <tr>
            <td>${p.purchaseDate || '—'}</td>
            <td><strong>${p.sourceType || 'TANKER'}</strong></td>
            <td>${p.vendorName || 'N/A'}</td>
            <td style="font-weight:700;">${(p.purchasedVolumeLiters || 0).toLocaleString()} L</td>
            <td>₹${Number(p.unitRatePerLiter || 0).toFixed(4)}</td>
            <td style="font-weight:700; color:#0284c7;">₹${Number(p.totalCost || 0).toFixed(2)}</td>
            <td>${p.notes || '—'}</td>
          </tr>
        `).join('') : `<tr><td colspan="7" style="text-align:center; color:#64748b; padding:12px;">No water purchases logged for ${month}</td></tr>`;

        printableHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Water Purchase & P&L Statement - ${month}</title>
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1e293b; font-size: 12px; }
                .header { border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
                .title { font-size: 20px; font-weight: 800; color: #0369a1; }
                .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                .kpi-box { padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .kpi-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
                .kpi-val { font-size: 16px; font-weight: 800; margin-top: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background: #0284c7; color: white; font-size: 11px; }
                .footer { border-top: 1.5px solid #cbd5e1; margin-top: 24px; padding-top: 10px; text-align: center; font-size: 10px; color: #64748b; }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="title">AquaTrack Water Acquisition & P&L Report</div>
                  <div style="font-[600]; color:#64748b;">Community Block: ${block} &bull; Period: ${month}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:700;">Generated via Buddy AI</div>
                  <div style="color:#64748b;">Date: ${nowStr}</div>
                </div>
              </div>
              <div class="grid">
                <div class="kpi-box" style="background:#f0f9ff;"><div class="kpi-title">Purchased Volume</div><div class="kpi-val" style="color:#0284c7;">${totalPurchasedVolume.toLocaleString()} L</div></div>
                <div class="kpi-box" style="background:#fff1f2;"><div class="kpi-title">Acquisition Cost</div><div class="kpi-val" style="color:#e11d48;">₹${totalInflowCost.toFixed(2)}</div></div>
                <div class="kpi-box" style="background:#f0fdf4;"><div class="kpi-title">Resident Billed</div><div class="kpi-val" style="color:#16a34a;">₹${totalInflowRevenue.toFixed(2)}</div></div>
                <div class="kpi-box" style="background:${isProf ? '#ecfdf5' : '#fef2f2'};"><div class="kpi-title">Net P&L Result</div><div class="kpi-val" style="color:${isProf ? '#059669' : '#dc2626'};">${isProf ? '+' : ''}₹${netPnlVal.toFixed(2)}</div></div>
              </div>
              <h3>📦 Itemized Water Purchase Log (${month})</h3>
              <table>
                <thead>
                  <tr><th>Date</th><th>Source</th><th>Vendor</th><th>Volume (L)</th><th>Rate (₹/L)</th><th>Cost (₹)</th><th>Notes</th></tr>
                </thead>
                <tbody>${purchaseRowsHTML}</tbody>
              </table>
              <div class="footer">
                AquaTrack Water & Infrastructure System — Official Monthly Water Acquisition & Financial P&L Audit Statement
                <div style="margin-top: 5px; font-weight: 700; color: #475569;">Built with ❤️ by Krishna Mohan</div>
              </div>
              <script>window.onload = function() { window.print(); };</script>
            </body>
          </html>
        `;
      } else {
        const res = await api.get(`/admin/users?callerRole=${callerRole}&callerBlock=${encodeURIComponent(block)}`);
        const residents = (res.data && Array.isArray(res.data)) ? res.data : [];

        const tableRows = residents.map((r, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><strong>${r.fullName || r.username}</strong></td>
            <td>${r.houseNumber || 'H-???'}</td>
            <td>${block}</td>
            <td>AQ-USR-${String(r.id || idx + 1).padStart(6, '0')}</td>
            <td>${r.phoneNumber || 'N/A'}</td>
            <td><span style="color:#16a34a; font-weight:700;">ACTIVE</span></td>
          </tr>
        `).join('');

        printableHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>System Audit & Household Directory - ${block}</title>
              <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 25px; color: #1e293b; font-size: 12px; }
                .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
                .title { font-size: 20px; font-weight: 800; color: #1d4ed8; }
                table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background: #1e3a8a; color: white; font-size: 11px; }
                .footer { border-top: 1.5px solid #cbd5e1; margin-top: 24px; padding-top: 10px; text-align: center; font-size: 10px; color: #64748b; }
              </style>
            </head>
            <body>
              <div class="header">
                <div>
                  <div class="title">AquaTrack System Audit & Resident Directory</div>
                  <div style="font-weight:600; color:#64748b;">Community Block: ${block} &bull; Generated by Admin: ${adminName}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:700;">Official System Statement</div>
                  <div style="color:#64748b;">Date: ${nowStr}</div>
                </div>
              </div>
              <h3>👥 Registered Households Audit Log (${residents.length} Households)</h3>
              <table>
                <thead>
                  <tr><th>#</th><th>Resident Name</th><th>House #</th><th>Block</th><th>Consumer ID</th><th>Contact</th><th>Status</th></tr>
                </thead>
                <tbody>${tableRows}</tbody>
              </table>
              <div class="footer">
                AquaTrack Water & Infrastructure Monitoring Platform — Official System Audit PDF Document
                <div style="margin-top: 5px; font-weight: 700; color: #475569;">Built with ❤️ by Krishna Mohan</div>
              </div>
              <script>window.onload = function() { window.print(); };</script>
            </body>
          </html>
        `;
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printableHTML);
        printWindow.document.close();
      }
      setSuccess(true);
    } catch (err) {
      console.error("Report PDF generation error:", err);
      alert("Failed to compile system audit PDF statement.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-cyan-50/90 to-blue-50/90 dark:from-slate-900/90 dark:to-cyan-950/90 border-2 border-cyan-300 dark:border-cyan-700/60 shadow-lg text-slate-800 dark:text-slate-100 text-xs select-text">
      <div className="flex items-center gap-1.5 font-extrabold text-cyan-950 dark:text-cyan-200 text-xs mb-2.5">
        <span className="text-base">📄</span>
        <span>AI Admin Report PDF Generator</span>
      </div>

      {success && (
        <div className="mb-2 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
          <span>✅ PDF Report compiled & printable window launched!</span>
        </div>
      )}

      <form onSubmit={handleGenerateReport} className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-bold text-cyan-900 dark:text-cyan-300 mb-1">
            1. Select Report PDF Type:
          </label>
          <div className="grid grid-cols-2 gap-1 mb-2">
            {[
              { id: 'PNL', label: '📊 Water Purchase P&L' },
              { id: 'AUDIT', label: '👥 Resident Audit Log' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReportType(t.id)}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-extrabold transition-all cursor-pointer border ${
                  reportType === t.id
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-cyan-200 dark:border-cyan-700 hover:bg-cyan-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {reportType === 'PNL' ? (
          <div>
            <label className="block text-[11px] font-bold text-cyan-900 dark:text-cyan-300 mb-1">
              2. Select Target Billing Month:
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-700 text-xs font-bold text-cyan-700 dark:text-cyan-300 focus:outline-none cursor-pointer"
            >
              {(() => {
                const yr = new Date().getFullYear();
                return ['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                  <option key={m} value={`${m} ${yr}`}>{m} {yr}</option>
                ));
              })()}
            </select>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 italic bg-white/60 dark:bg-slate-800/60 p-2 rounded-xl border border-cyan-100 dark:border-cyan-900">
            Generates live resident roster audit log with house identifiers & consumer codes for {block}.
          </div>
        )}

        <button
          type="submit"
          disabled={generating}
          className={`w-full py-2 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
            generating
              ? 'bg-slate-400 text-white cursor-not-allowed opacity-60'
              : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-emerald-500/20 active:scale-98'
          }`}
        >
          {generating ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Compiling PDF Report...</span>
            </>
          ) : (
            <>
              <span>📥 Generate & Print {reportType === 'PNL' ? 'P&L Statement' : 'Audit Log'} PDF</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const HouseholdChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // TTS State & Controls - Default OFF (depends upon user action)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const speakingMsgIdRef = useRef(null);
  const [currentLang, setCurrentLang] = useState(() => localStorage.getItem('selectedLang') || 'en');

  // Speech Recognition (STT Voice Input)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          processUserQuery(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Brave.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        const activeLang = currentLang || localStorage.getItem('selectedLang') || 'en';
        recognitionRef.current.lang = getBcp47Locale(activeLang);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition start error:", err);
      }
    }
  };

  // Listen to instant language changes from Header
  useEffect(() => {
    const handleLangChange = (e) => {
      const newLang = e.detail?.lang || localStorage.getItem('selectedLang') || 'en';
      setCurrentLang(newLang);
    };
    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);



  // Web Speech API TTS helper with Language Matching & Gender Voice Inversion
  const speakText = (text, msgId) => {
    if (!('speechSynthesis' in window) || !ttsEnabled) return;

    window.speechSynthesis.cancel(); // Stop any current speech
    
    // Strip markdown formatting for natural voice output
    const cleanText = text
      .replace(/[*_~`#]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[^\w\s.,?!₹\-\n]/gi, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Detect active site language & set exact BCP 47 locale
    const activeLang = currentLang || localStorage.getItem('selectedLang') || 'en';
    const bcp47Locale = getBcp47Locale(activeLang);
    utterance.lang = bcp47Locale;

    // Retrieve user gender from localStorage
    const userGender = (localStorage.getItem('gender') || 'male').toLowerCase();
    const targetGender = userGender === 'male' ? 'female' : 'male';

    // Siri-like Acoustic Modulation:
    // Crisp pitch (1.05 for female Siri, 0.95 for male Siri), slightly elevated rate (1.05 for quick, natural cadence)
    utterance.pitch = targetGender === 'female' ? 1.05 : 0.95;
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    
    // Voice Selection Strategy (Siri-like Natural Acoustic Priority with Indian locale fallback):
    // 1. Target official Siri/Samantha/Karen/Rishi/Veena natural voices
    // 2. Target Indian voices with crisp acoustics (en-IN / hi-IN)
    let chosenVoice = voices.find(v => {
      const nameLower = v.name.toLowerCase();
      return nameLower.includes('siri') || nameLower.includes('samantha') || nameLower.includes('natural') || nameLower.includes('karen') || nameLower.includes('rishi');
    });

    if (!chosenVoice) {
      chosenVoice = voices.find(v => {
        const isIndianVoice = v.lang.toLowerCase().includes('in') || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('indian');
        const matchLang = v.lang.toLowerCase().includes(activeLang.toLowerCase()) || v.lang.toLowerCase().includes(bcp47Locale.toLowerCase());
        const nameLower = v.name.toLowerCase();
        const matchGender = targetGender === 'female' 
          ? (nameLower.includes('female') || nameLower.includes('veena') || nameLower.includes('heera') || nameLower.includes('neerja') || nameLower.includes('zira') || nameLower.includes('natural'))
          : (nameLower.includes('male') || nameLower.includes('prabhat') || nameLower.includes('rishi') || nameLower.includes('david') || nameLower.includes('alex'));
        return isIndianVoice && matchLang && matchGender;
      });
    }

    // Fallback 1: Any Indian voice matching language or English (en-IN)
    if (!chosenVoice) {
      chosenVoice = voices.find(v => 
        (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('hi-in') || v.name.toLowerCase().includes('india')) &&
        (bcp47Locale.startsWith('en') || bcp47Locale.startsWith('hi'))
      );
    }

    // Fallback 2: Any voice matching locale or active language
    if (!chosenVoice) {
      chosenVoice = voices.find(v => v.lang.toLowerCase().includes(bcp47Locale.toLowerCase()) || v.lang.toLowerCase().includes(activeLang.toLowerCase()));
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      speakingMsgIdRef.current = msgId;
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      speakingMsgIdRef.current = null;
    }
  };
  
  // Width Resizing logic (Expands Leftward by updating position.x)
  const [chatWidth, setChatWidth] = useState(430);
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const resizeStartRef = useRef({ startX: 0, startWidth: 430, startPosX: 0 });

  const handleResizeMouseDown = (e) => {
    if (e.cancelable && !e.touches) {
      e.preventDefault();
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;

    let curX = position.x;
    if (!hasCustomPosition && windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      curX = rect.left;
      setPosition({ x: rect.left, y: rect.top });
      setHasCustomPosition(true);
    }

    resizeStartRef.current = { startX: clientX, startWidth: chatWidth, startPosX: curX };
    setIsResizingWidth(true);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (isResizingWidth) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const deltaX = resizeStartRef.current.startX - clientX;
        const newWidth = Math.max(320, Math.min(850, resizeStartRef.current.startWidth + deltaX));
        
        // Calculate new X position to anchor right border
        const widthDiff = newWidth - resizeStartRef.current.startWidth;
        const newX = resizeStartRef.current.startPosX - widthDiff;

        setChatWidth(newWidth);
        setPosition(prev => ({ ...prev, x: newX }));
      }
    };
    const handleEnd = () => {
      if (isResizingWidth) setIsResizingWidth(false);
    };

    if (isResizingWidth) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isResizingWidth]);
  // Position state - defaulted to bottom-right fixed positioning
  const [position, setPosition] = useState({ x: 0, y: 0 }); 
  const [hasCustomPosition, setHasCustomPosition] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const windowRef = useRef(null);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, windowX: 0, windowY: 0 });
  const messagesEndRef = useRef(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve true User Profile Details & DB Information
  const storedName = localStorage.getItem('fullName') || localStorage.getItem('username') || localStorage.getItem('name') || '';
  const houseNo = localStorage.getItem('houseNumber') || localStorage.getItem('houseNo') || 'H-101';
  const role = localStorage.getItem('role') || 'ROLE_HOUSEHOLD_USER';

  // Role-based Chatbot Persona configuration (Title is always Buddy, emoji varies by role)
  let personaTitle = 'Buddy';
  let personaSubtitle = 'Your AI Water Assistant';
  let personaEmoji = '👤';

  if (role === 'ROLE_ADMIN') {
    personaSubtitle = 'System Executive Assistant';
    personaEmoji = '👑';
  } else if (role === 'ROLE_COMMUNITY_ADMIN') {
    personaSubtitle = 'Community Water Manager';
    personaEmoji = '🛡️';
  }

  const [dbData, setDbData] = useState({
    recentBill: null,
    totalConsumption: null,
    unreadTickets: 0
  });

  // Ultra-Smooth Screen Dragging Implementation (RAF throttled for 60fps performance)
  const animFrameIdRef = useRef(null);

  const handleMouseDown = (e) => {
    if (isMaximized) return;
    if (e.target.closest('button') || e.target.closest('input')) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let initialX = position.x;
    let initialY = position.y;

    if (!hasCustomPosition && windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      setPosition({ x: initialX, y: initialY });
      setHasCustomPosition(true);
    }

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      windowX: initialX,
      windowY: initialY
    };

    setIsDragging(true);
  };

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDragging) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }

      animFrameIdRef.current = requestAnimationFrame(() => {
        const deltaX = clientX - dragStartRef.current.mouseX;
        const deltaY = clientY - dragStartRef.current.mouseY;

        const windowWidth = windowRef.current ? windowRef.current.offsetWidth : 400;
        const windowHeight = windowRef.current ? windowRef.current.offsetHeight : 550;

        const newX = Math.max(10, Math.min(window.innerWidth - windowWidth - 10, dragStartRef.current.windowX + deltaX));
        const newY = Math.max(10, Math.min(window.innerHeight - windowHeight - 10, dragStartRef.current.windowY + deltaY));

        setPosition({ x: newX, y: newY });
      });
    };

    const handleEnd = () => {
      if (isDragging) {
        if (animFrameIdRef.current) {
          cancelAnimationFrame(animFrameIdRef.current);
        }
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // Fetch real database records (Bills, Usage, Support) for household user
  useEffect(() => {
    const fetchHouseholdDbInfo = async () => {
      if (!houseNo || role !== 'ROLE_HOUSEHOLD_USER') return;
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const [billRes, statsRes] = await Promise.allSettled([
            api.get(`/bills/household/${houseNo}`),
            api.get(`/dashboard/household/${houseNo}`)
          ]);

          let latestBill = null;
          if (billRes.status === 'fulfilled' && billRes.value.data && billRes.value.data.length > 0) {
            latestBill = billRes.value.data[0];
          }

          let stats = null;
          if (statsRes.status === 'fulfilled' && statsRes.value.data) {
            stats = statsRes.value.data;
          }

          setDbData({
            recentBill: latestBill,
            totalConsumption: stats?.currentMonthUsageLiters || stats?.totalConsumption || null,
            unreadTickets: stats?.pendingTickets || 0
          });
        }
      } catch (err) {
        console.error("Chatbot database sync error:", err);
      }
    };

    fetchHouseholdDbInfo();
  }, [houseNo, role]);

  const displayName = storedName ? storedName : 'Resident';

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Clear/Reset chat conversation history
  const handleClearChat = () => {
    stopSpeaking();
    let welcomeText = '';
    if (role === 'ROLE_ADMIN') {
      welcomeText = `Greetings **${displayName}**! 👑 Welcome to **Buddy** (Executive Assistant).\n\nHow can I assist you with platform revenue metrics, community admin oversight, or escalated tickets today?`;
    } else if (role === 'ROLE_COMMUNITY_ADMIN') {
      welcomeText = `Hello **${displayName}**! 🛡️ Welcome to **Buddy** (Community Water Manager).\n\nHow can I assist you with meter workstation uploads, block unpaid dues, tariff settings, or resident support tickets today?`;
    } else {
      welcomeText = `Hello **${displayName}**! 👤 I'm **Buddy**, your AI assistant for House **${houseNo}**.\n\n`;
      if (dbData.recentBill) {
        const amt = dbData.recentBill.amount ? dbData.recentBill.amount.toFixed(2) : '0.00';
        const status = dbData.recentBill.status || 'UNPAID';
        welcomeText += `• **Latest Bill**: ₹${amt} (${status})\n`;
      }
      welcomeText += `How can I assist you with your water usage, billing, or support tickets today?`;
    }

    setMessages([
      {
        id: Date.now(),
        sender: 'bot',
        text: welcomeText,
        actions: getContextualActions(location.pathname),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Welcome message with actual Resident Name & Household Database status
  useEffect(() => {
    if (messages.length === 0) {
      handleClearChat();
    }
  }, [displayName, houseNo, dbData.recentBill, role]);

  function getContextualPills(path) {
    if (role === 'ROLE_ADMIN') {
      return [
        'Generate executive system PDF report',
        'What is total platform revenue & pending collection?',
        'Show all escalated support tickets for Super Admin',
        'How many total communities and admins are registered?',
        'What are the current global system tariff defaults?'
      ];
    } else if (role === 'ROLE_COMMUNITY_ADMIN') {
      return [
        '📄 Generate P&L and audit PDF report',
        '💧 Add new water meter reading for household',
        '💰 What is the total unpaid collection in my block?',
        '📂 How to upload bulk CSV meter readings?',
        '🏠 Which households have unpaid bills in my block?',
        '⚙️ How to update base limit & late fee penalty?',
        '🎧 Show open resident support tickets for my block',
        '📩 How to send registration invites to new residents?',
        '📊 How is monthly profit & loss calculated?',
        '🔐 How to lock or unlock monthly resident billing cycle?',
        '🏷️ What is the current base tier tariff rate per KL?'
      ];
    }

    switch (path) {
      case '/bills':
      case '/invoices':
        return [
          'What are my current tariff rates?',
          'How is my monthly bill calculated?',
          'What is my total pending bill amount?',
          'Show bill details for March month',
          'What payment methods are supported?',
          'What is the late fee penalty rate?'
        ];
      case '/tips':
        return [
          'Give me top 3 household water-saving tips',
          'How to detect silent toilet leaks?',
          'Tips to lower excess water charge',
          'What are peak water usage hours?',
          'How faucet aerators save water'
        ];
      case '/support':
        return [
          'How do I check my ticket status?',
          'Report an urgent pipe leakage',
          'Who is my community admin?',
          'How to escalate ticket to Super Admin?',
          'Support response timeframe'
        ];
      case '/usage':
      case '/history':
        return [
          'Show my peak water consumption hours',
          'How is excess water tariff calculated?',
          'What is my monthly base water limit?',
          'How to buy extra top-up water?',
          'What is my daily average consumption?'
        ];
      case '/water-purchase':
        return [
          'How to purchase extra water quota?',
          'What is the cost per liter for top-up?',
          'When does extra water get credited?'
        ];
      default:
        return [
          'What are my current tariff rates?',
          'How is my monthly bill calculated?',
          'What is my total pending bill amount?',
          'Show bill details for March month',
          'How to buy extra top-up water?',
          'Who is my community admin?',
          'Report an urgent pipe leakage',
          'Give me top 3 household water-saving tips',
          'Show my peak water consumption hours',
          'How is excess water tariff calculated?',
          'What is my monthly base water limit?'
        ];
    }
  }

  function getContextualActions(path) {
    if (role === 'ROLE_ADMIN') {
      return [
        { label: '📊 Executive Dashboard', action: 'nav', path: '/admin-dashboard', type: 'primary' },
        { label: '🏛️ Escalated Tickets', action: 'nav', path: '/super-admin-tickets', type: 'secondary' },
        { label: '👥 User Directory', action: 'nav', path: '/user-directory', type: 'secondary' }
      ];
    } else if (role === 'ROLE_COMMUNITY_ADMIN') {
      return [
        { label: '📊 Meter Workstation', action: 'nav', path: '/meter-workstation', type: 'primary' },
        { label: '📋 Tariff Settings', action: 'nav', path: '/tariff-settings', type: 'secondary' },
        { label: '🛠️ Ticket Management', action: 'nav', path: '/support-ticket-management', type: 'danger' }
      ];
    } else {
      if (path === '/bills') {
        return [
          { label: '💡 Water Saving Tips', action: 'nav', path: '/tips', type: 'secondary' },
          { label: '🎧 Support Desk', action: 'nav', path: '/support', type: 'secondary' }
        ];
      } else if (path === '/tips') {
        return [
          { label: '💳 Pay Water Bill', action: 'nav', path: '/bills', type: 'primary' },
          { label: '📊 View Usage History', action: 'nav', path: '/usage', type: 'secondary' }
        ];
      } else {
        return [
          { label: '💳 Pay Water Bill', action: 'nav', path: '/bills', type: 'primary' },
          { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'secondary' },
          { label: '🛠️ Report Issue', action: 'nav', path: '/support', type: 'danger' }
        ];
      }
    }
  }

  const processUserQuery = async (queryText) => {
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const lower = queryText.toLowerCase().trim();

    // 1. Immediate Custom Action Handling
    if ((lower.includes('pdf') || lower.includes('report') || lower.includes('download report') || lower.includes('print report') || lower.includes('export pdf') || lower.includes('pnl')) &&
        (role === 'ROLE_COMMUNITY_ADMIN' || role === 'ROLE_ADMIN')) {
      const botMsgId = Date.now() + 1;
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: "Certainly! I have compiled the official PDF report generator for your administrative block. 📄✨\n\nPlease select the PDF report type and target month below:",
        widget: "REPORT_GENERATOR",
        actions: getContextualActions(location.pathname),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      speakText(botMsg.text, botMsgId);
      return;
    }

    const monthAliases = [
      { month: 1, name: 'January', keys: ['january', 'jan', 'janauary', 'januery', 'janiary', 'janvar'] },
      { month: 2, name: 'February', keys: ['february', 'feb', 'febuary', 'febrary', 'februery'] },
      { month: 3, name: 'March', keys: ['march', 'mar', 'marh', 'marchh', 'murch'] },
      { month: 4, name: 'April', keys: ['april', 'apr', 'april', 'apil', 'aprel'] },
      { month: 5, name: 'May', keys: ['may', 'mai', 'mey'] },
      { month: 6, name: 'June', keys: ['june', 'jun', 'june', 'junee', 'junei'] },
      { month: 7, name: 'July', keys: ['july', 'jul', 'jully', 'julyy'] },
      { month: 8, name: 'August', keys: ['august', 'aug', 'agust', 'augst', 'augustt'] },
      { month: 9, name: 'September', keys: ['september', 'sep', 'sept', 'septmber', 'septemberr'] },
      { month: 10, name: 'October', keys: ['october', 'oct', 'octber', 'octobre'] },
      { month: 11, name: 'November', keys: ['november', 'nov', 'novmber', 'novemberr'] },
      { month: 12, name: 'December', keys: ['december', 'dec', 'decmber', 'decembre'] }
    ];

    // Levenshtein distance for fuzzy typo tolerance
    const getLevenshteinDistance = (a, b) => {
      const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
      for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + cost
          );
        }
      }
      return matrix[a.length][b.length];
    };

    let standaloneMonth = null;
    let standaloneMonthName = "";

    // 1. Exact / Substring Matching for Months
    for (const item of monthAliases) {
      const match = item.keys.some(k => lower.includes(k) || getLevenshteinDistance(lower.split(' ')[0], k) <= 2);
      if (match) {
        standaloneMonth = item.month;
        standaloneMonthName = item.name;
        break;
      }
    }

    const lastBotMsg = messages.filter(m => m.sender === 'bot').slice(-1)[0]?.text || "";
    const isFollowUpToBillingQuestion = lastBotMsg.includes('billing month') || lastBotMsg.includes('finalize bills');

    const isFinalizeIntent = (
      lower.includes('finalize') || lower.includes('finalise') || lower.includes('finaliz') ||
      lower.includes('generate') || lower.includes('bulk bill') || lower.includes('bulk billing') ||
      lower.includes('create bill') || lower.includes('bill') || lower.includes('billing')
    );

    if (role === 'ROLE_COMMUNITY_ADMIN' && (
        (isFollowUpToBillingQuestion && standaloneMonth) ||
        (isFinalizeIntent && (lower.includes('bill') || lower.includes('bills') || lower.includes('billing') || lower.includes('cycle') || isFollowUpToBillingQuestion))
    )) {
      
      let foundMonth = standaloneMonth;
      let foundMonthName = standaloneMonthName;
      
      if (!foundMonth) {
        for (const item of monthAliases) {
          if (item.keys.some(k => lower.includes(k))) {
            foundMonth = item.month;
            foundMonthName = item.name;
            break;
          }
        }
      }

      const botMsgId = Date.now() + 1;
      let respText = "";
      let respActions = [];

      if (foundMonth) {
        // Calculate pending bills for target month
        const targetMonth = foundMonth;
        const currentYear = new Date().getFullYear();
        
        const userBlock = localStorage.getItem('apartmentBlock') || localStorage.getItem('block') || '';
        let blockLogs = [];
        let blockBills = [];
        let blockUsers = [];
        try {
          const logUrl = role === 'ROLE_ADMIN' || !userBlock ? '/usage/all' : `/usage/block/${userBlock}`;
          const billUrl = role === 'ROLE_ADMIN' || !userBlock ? '/bills/all' : `/bills/block/${userBlock}`;

          const [logRes, billRes, userRes] = await Promise.all([
            api.get(logUrl),
            api.get(billUrl),
            api.get('/admin/users', { params: { callerRole: role, callerBlock: userBlock } })
          ]);
          blockLogs = logRes.data || [];
          blockBills = billRes.data || [];
          blockUsers = userRes.data || [];

          if (blockLogs.length === 0) {
            const fallbackLogs = await api.get('/usage/all');
            blockLogs = fallbackLogs.data || [];
          }
          if (blockBills.length === 0) {
            const fallbackBills = await api.get('/bills/all');
            blockBills = fallbackBills.data || [];
          }
        } catch (e) {
          console.warn("Error fetching logs for chatbot check:", e);
        }

        const residentsList = blockUsers.filter(u => u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER');

        let pendingCount = 0;
        for (const u of (residentsList.length > 0 ? residentsList : Object.values(blockLogs.reduce((acc, l) => ({ ...acc, [l.houseNumber]: { houseNumber: l.houseNumber } }), {})))) {
          const targetMonthLogs = blockLogs.filter(l => {
            if (l.houseNumber !== u.houseNumber) return false;
            if (!l.readingDate) return false;
            const parts = l.readingDate.split('-');
            if (parts.length < 2) return false;
            return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === targetMonth;
          });

          if (targetMonthLogs.length === 0) continue;

          const alreadyBilled = blockBills.some(b => {
            if (b.houseNumber !== u.houseNumber) return false;
            const dateStr = b.generatedDate || b.createdAt;
            if (!dateStr) return false;
            const parts = dateStr.split('-');
            if (parts.length < 2) return false;
            return parseInt(parts[0], 10) === currentYear && parseInt(parts[1], 10) === targetMonth;
          });

          if (!alreadyBilled) {
            const totalL = targetMonthLogs.reduce((s, l) => s + (l.readingLiters || 0), 0);
            if (totalL > 0) pendingCount++;
          }
        }

        if (pendingCount === 0) {
          respText = `There are **no pending unbilled logs** or bills present for **${foundMonthName} ${currentYear}**. All household logs are up to date! ✅`;
          respActions = [
            { label: '📊 View Meter Workstation', action: 'nav', path: '/meter-workstation', type: 'secondary' }
          ];
        } else {
          respText = `Found **${pendingCount} pending resident bill${pendingCount > 1 ? 's' : ''}** ready to be finalized for **${foundMonthName} ${currentYear}**! ⚡\n\nClick the button below to open the **Bulk Billing Preview** window with full calculation breakdowns:`;
          respActions = [
            { label: `⚡ Finalize ${pendingCount} Bill${pendingCount > 1 ? 's' : ''} for ${foundMonthName}`, action: 'nav', path: `/meter-workstation?action=finalize_bulk&month=${foundMonth}`, type: 'primary' }
          ];
        }
      } else {
        respText = "Which **billing month** would you like to finalize bills for? Please specify or select a month below: 📅";
        respActions = [
          { label: 'January Bills', action: 'nav', path: '/meter-workstation?action=finalize_bulk&month=1', type: 'primary' },
          { label: 'February Bills', action: 'nav', path: '/meter-workstation?action=finalize_bulk&month=2', type: 'secondary' },
          { label: 'March Bills', action: 'nav', path: '/meter-workstation?action=finalize_bulk&month=3', type: 'secondary' },
          { label: 'April Bills', action: 'nav', path: '/meter-workstation?action=finalize_bulk&month=4', type: 'secondary' }
        ];
      }

      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: respText,
        actions: respActions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      speakText(respText, botMsgId);
      return;
    }

    // Client-Side Intent Interceptor for immediate & accurate response
    let clientBotResponseText = null;
    let clientBotActions = null;
    let clientBotWidget = null;
    let clientBotParsedLiters = null;

    // Extensive Typo Dictionaries & Fuzzy Intent Interceptor
    const identityKeys = ['who am i', 'whi i am', 'who i am', 'whu i am', 'tell about me', 'tell me about me', 'tell me about myself', 'tell about myself', 'about me', 'abt me', 'my profile', 'my details', 'my info', 'my informaton', 'who am i'];
    const usageKeys = ['usage', 'useage', 'usag', 'usge', 'log', 'logs', 'water log', 'water logs', 'loog', 'loogs', 'reading', 'readings', 'readng', 'consumption', 'consumtion', 'consumpion', 'history', 'hitory', 'histry'];
    const billKeys = ['bill', 'bills', 'bil', 'bils', 'billing', 'biling', 'biiling', 'pay', 'payment', 'paymnt', 'tariff', 'tarif', 'cost', 'amount', 'unpaid', 'due', 'dues', 'pending'];
    const leakKeys = ['leak', 'leek', 'pipe', 'pip', 'issue', 'isuue', 'support', 'suport', 'ticket', 'tikit', 'tckit', 'damage', 'breakage'];
    const tipKeys = ['tip', 'tips', 'save', 'saving', 'savng', 'reduce', 'reduse', 'excess', 'exces'];

    const matchesAnyKey = (keys) => keys.some(k => lower.includes(k) || getLevenshteinDistance(lower.split(' ')[0], k) <= 2);

    if (matchesAnyKey(identityKeys)) {
      const userBlock = localStorage.getItem('apartmentBlock') || localStorage.getItem('block') || 'Block A';
      const userEmail = localStorage.getItem('email') || 'Registered Resident';
      const roleTitle = role === 'ROLE_ADMIN' ? 'System Administrator' : role === 'ROLE_COMMUNITY_ADMIN' ? 'Community Water Manager' : 'Household Resident';
      
      clientBotResponseText = `Here are your profile details, **${displayName}**! 👤✨\n\n` +
        `• **Name**: ${displayName}\n` +
        `• **Role**: ${roleTitle}\n` +
        `• **House Number**: ${houseNo}\n` +
        `• **Apartment Block**: ${userBlock}\n` +
        `• **Contact Email**: ${userEmail}\n\n` +
        `You are registered on the **AquaTrack** smart water network! How can I assist you with your account today?`;
      clientBotActions = [
        { label: '📊 Usage Analytics', action: 'nav', path: '/usage', type: 'primary' },
        { label: '💳 My Bills', action: 'nav', path: '/bills', type: 'secondary' }
      ];
    } else if (matchesAnyKey(usageKeys)) {
      let monthNotice = standaloneMonthName ? ` for **${standaloneMonthName}**` : '';
      clientBotResponseText = `Here is your requested water usage information${monthNotice} for House **${houseNo}**! 📊\n\n` +
        `• **Recent Status**: Active daily telemetry logging\n` +
        `• **Total Recorded Usage**: ${dbData.totalConsumption != null ? `${dbData.totalConsumption} Liters` : 'Fetched live from smart meter'}\n\n` +
        `You can view your detailed daily chart, breakdown graphs, and peak hours under Usage Analytics.`;
      clientBotActions = [
        { label: '📊 Open Usage Analytics', action: 'nav', path: '/usage', type: 'primary' },
        { label: '💳 View Bills History', action: 'nav', path: '/bills', type: 'secondary' }
      ];
    } else if (matchesAnyKey(billKeys)) {
      let monthNotice = standaloneMonthName ? ` for **${standaloneMonthName}**` : '';
      let billInfo = dbData.recentBill 
        ? `Your bill details${monthNotice} for House **${houseNo}**: Amount: **₹${dbData.recentBill.amount?.toFixed(2)}** (Status: **${dbData.recentBill.status}**).`
        : `For House **${houseNo}**${monthNotice}, your water consumption up to standard limit is billed at base tariff rate, with excess billed at tier rate.`;
      clientBotResponseText = `${billInfo}\n\nYou can view complete month-wise billing history and make instant payments on the Billing page! 💳`;
      clientBotActions = [
        { label: '💳 Pay / View Bills', action: 'nav', path: '/bills', type: 'primary' },
        { label: '📊 Usage Breakdown', action: 'nav', path: '/usage', type: 'secondary' }
      ];
    } else if (matchesAnyKey(leakKeys)) {
      clientBotResponseText = `Hi **${displayName}**, if you notice an urgent leak or water supply issue in House **${houseNo}**:\n\n1. Turn off main stop-cock valve if necessary.\n2. Raise a high-priority ticket on the Support Desk for community maintenance.`;
      clientBotActions = [
        { label: '🛠️ Report Issue', action: 'nav', path: '/support', type: 'danger' },
        { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'secondary' }
      ];
    } else if (matchesAnyKey(tipKeys)) {
      clientBotResponseText = `Here are actionable ways to lower your monthly bill:\n\n• **Aerators**: Fit faucet aerators to save up to 30% water.\n• **Flush Leaks**: Check toilet tank flappers for hidden trickles.\n• **Track Usage**: Check daily graphs under My Usage.`;
      clientBotActions = [
        { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'primary' },
        { label: '💳 Bills History', action: 'nav', path: '/bills', type: 'secondary' }
      ];
    }

    // Client Cache & Rate-Limit Strategy (Zero unnecessary API / DB calls)
    if (!window._chatbotQueryCache) {
      window._chatbotQueryCache = new Map();
    }
    const cachedResponse = window._chatbotQueryCache.get(lower);
    if (cachedResponse) {
      const botMsgId = Date.now() + 1;
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: cachedResponse.text,
        widget: cachedResponse.widget || null,
        parsedLiters: cachedResponse.parsedLiters || null,
        actions: cachedResponse.actions || getContextualActions(location.pathname),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      speakText(cachedResponse.text, botMsgId);
      return;
    }

    if (clientBotResponseText) {
      // Store in memory cache to save future roundtrips
      window._chatbotQueryCache.set(lower, {
        text: clientBotResponseText,
        actions: clientBotActions || getContextualActions(location.pathname)
      });

      const botMsgId = Date.now() + 1;
      const botMsg = {
        id: botMsgId,
        sender: 'bot',
        text: clientBotResponseText,
        widget: clientBotWidget,
        parsedLiters: clientBotParsedLiters,
        actions: clientBotActions || getContextualActions(location.pathname),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      speakText(clientBotResponseText, botMsgId);
      return;
    }

    try {
      const res = await api.post('/chatbot/query', {
        query: queryText,
        houseNumber: houseNo,
        username: localStorage.getItem('username') || '',
        role: role,
        activePage: location.pathname
      });

      if (res.data && res.data.answer) {
        window._chatbotQueryCache.set(lower, {
          text: res.data.answer,
          widget: res.data.widget || null,
          parsedLiters: res.data.parsedLiters || null,
          actions: res.data.actions || getContextualActions(location.pathname)
        });

        const botMsgId = Date.now() + 1;
        const botMsg = {
          id: botMsgId,
          sender: 'bot',
          text: res.data.answer,
          widget: res.data.widget || null,
          parsedLiters: res.data.parsedLiters || null,
          actions: res.data.actions || getContextualActions(location.pathname),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
        speakText(res.data.answer, botMsgId);
        return;
      }
    } catch (err) {
      console.warn("Backend chatbot API fallback triggered:", err);
    }

    setTimeout(() => {
      let botResponseText = "";
      let botActions = [];
      let botWidget = null;
      let botParsedLiters = null;
      const lower = queryText.toLowerCase().trim();

      if (role === 'ROLE_COMMUNITY_ADMIN' && 
          (lower.includes('add') || lower.includes('log') || lower.includes('entry') || lower.includes('record')) && 
          (lower.includes('water') || lower.includes('reading') || lower.includes('liter') || lower.includes('meter') || lower.includes('log'))) {
        
        let parsed = null;
        const match = queryText.match(/(\d+(\.\d+)?)/);
        if (match) parsed = parseFloat(match[1]);

        botResponseText = "Certainly! It is my absolute pleasure to assist you with adding a new water log directly right here. 😊\n\nPlease select the household resident and verify the log details below:";
        botWidget = "WATER_LOG_FORM";
        botParsedLiters = parsed;
        botActions = getContextualActions(location.pathname);
      } else if (lower.startsWith('hi') || lower.startsWith('hello') || lower.startsWith('hey') || lower.startsWith('good morning')) {
        botResponseText = `Hello **${displayName}**! 👋 Welcome. How can I assist you with your water bills, usage, or maintenance tickets for House **${houseNo}** today?`;
        botActions = getContextualActions(location.pathname);
      } else if (
        lower.includes('who am i') || 
        lower.includes('tell about me') || 
        lower.includes('tell me about me') || 
        lower.includes('tell me about myself') || 
        lower.includes('tell about myself') || 
        lower.includes('about me') || 
        lower.includes('my profile') || 
        lower.includes('my details') || 
        lower.includes('my info')
      ) {
        const userBlock = localStorage.getItem('apartmentBlock') || localStorage.getItem('block') || 'Block A';
        const userEmail = localStorage.getItem('email') || 'Registered Resident';
        const roleTitle = role === 'ROLE_ADMIN' ? 'System Administrator' : role === 'ROLE_COMMUNITY_ADMIN' ? 'Community Water Manager' : 'Household Resident';
        
        botResponseText = `Here are your profile details, **${displayName}**! 👤✨\n\n` +
          `• **Name**: ${displayName}\n` +
          `• **Role**: ${roleTitle}\n` +
          `• **House Number**: ${houseNo}\n` +
          `• **Apartment Block**: ${userBlock}\n` +
          `• **Contact Email**: ${userEmail}\n\n` +
          `You are registered on the **AquaTrack** smart water network! How can I assist you with your account today?`;
        botActions = [
          { label: '📊 Usage Analytics', action: 'nav', path: '/usage', type: 'primary' },
          { label: '💳 My Bills', action: 'nav', path: '/bills', type: 'secondary' }
        ];
      } else if (lower.includes('who are you') || lower.includes('your name')) {
        botResponseText = `I'm **Buddy**, your AI assistant! ⚡\n\nI can help you track daily water usage, view & pay monthly bills, report leaks, and discover water-saving tips.`;
        botActions = getContextualActions(location.pathname);
      } else if (lower.includes('how are you')) {
        botResponseText = `I'm doing great and ready to assist you! How is everything with the water supply in House **${houseNo}**?`;
        botActions = getContextualActions(location.pathname);
      } else if (lower.includes('thank') || lower.includes('thanks')) {
        botResponseText = `You're very welcome! 😊 Feel free to ask if you need anything else.`;
        botActions = getContextualActions(location.pathname);
      } else if (lower.includes('log') || lower.includes('usage') || lower.includes('consumption') || lower.includes('reading') || lower.includes('history')) {
        let monthNotice = standaloneMonthName ? ` for **${standaloneMonthName}**` : '';
        botResponseText = `Here is your requested water usage information${monthNotice} for House **${houseNo}**! 📊\n\n` +
          `• **Recent Status**: Active daily telemetry logging\n` +
          `• **Total Recorded Usage**: ${dbData.totalConsumption != null ? `${dbData.totalConsumption} Liters` : 'Fetched live from smart meter'}\n\n` +
          `You can view your detailed daily chart, breakdown graphs, and peak hours under Usage Analytics.`;
        botActions = [
          { label: '📊 Open Usage Analytics', action: 'nav', path: '/usage', type: 'primary' },
          { label: '💳 View Bills History', action: 'nav', path: '/bills', type: 'secondary' }
        ];
      } else if (lower.includes('bill') || lower.includes('pay') || lower.includes('tariff') || lower.includes('cost') || lower.includes('amount') || lower.includes('unpaid')) {
        let monthNotice = standaloneMonthName ? ` for **${standaloneMonthName}**` : '';
        let billInfo = dbData.recentBill 
          ? `Your bill details${monthNotice} for House **${houseNo}**: Amount: **₹${dbData.recentBill.amount?.toFixed(2)}** (Status: **${dbData.recentBill.status}**).`
          : `For House **${houseNo}**${monthNotice}, your water consumption up to standard limit is billed at base tariff rate, with excess billed at tier rate.`;
        botResponseText = `${billInfo}\n\nYou can view complete month-wise billing history and make instant payments on the Billing page! 💳`;
        botActions = [
          { label: '💳 Pay / View Bills', action: 'nav', path: '/bills', type: 'primary' },
          { label: '📊 Usage Breakdown', action: 'nav', path: '/usage', type: 'secondary' }
        ];
      } else if (lower.includes('leak') || lower.includes('pipe') || lower.includes('issue') || lower.includes('support') || lower.includes('ticket')) {
        botResponseText = `Hi **${displayName}**, if you notice an urgent leak or water supply issue in House **${houseNo}**:\n\n1. Turn off main stop-cock valve if necessary.\n2. Raise a high-priority ticket on the Support Desk for community maintenance.`;
        botActions = [
          { label: '🛠️ Report Issue', action: 'nav', path: '/support', type: 'danger' },
          { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'secondary' }
        ];
      } else if (lower.includes('tip') || lower.includes('save') || lower.includes('reduce') || lower.includes('excess')) {
        botResponseText = `Here are actionable ways to lower your monthly bill:\n\n• **Aerators**: Fit faucet aerators to save up to 30% water.\n• **Flush Leaks**: Check toilet tank flappers for hidden trickles.\n• **Track Usage**: Check daily graphs under My Usage.`;
        botActions = [
          { label: '🌊 Water Tips', action: 'nav', path: '/tips', type: 'primary' },
          { label: '💳 Bills History', action: 'nav', path: '/bills', type: 'secondary' }
        ];
      } else {
        // Polite fallback for off-topic or irrelevant questions
        botResponseText = `I appreciate your question, **${displayName}**! 😊\n\nWhile I am specialized specifically as your **AquaTrack Water Assistant** for House **${houseNo}**, I'd be glad to help you with:\n\n` +
          `• 📊 **Water Usage Logs & History** (e.g. *"my water logs of January"*)\n` +
          `• 💳 **Current & Past Monthly Bills** (e.g. *"my current bill"* or *"bills for February"*)\n` +
          `• 🛠️ **Reporting Pipe Leaks & Support Tickets**\n` +
          `• 💧 **Water Consumption Limits & Conservation Tips**\n\n` +
          `How can I assist you with your water account today?`;
        botActions = getContextualActions(location.pathname);
      }

      const botMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: botResponseText,
          widget: botWidget,
          parsedLiters: botParsedLiters,
          actions: botActions,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsTyping(false);
      speakText(botResponseText, botMsgId);
    }, 600);
  };

  // Request Debouncing & Double-Submit Lock Guard
  const isProcessingRef = useRef(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    processUserQuery(input).finally(() => {
      isProcessingRef.current = false;
    });
  };

  const handleActionClick = (act) => {
    if (isProcessingRef.current) return;
    if (act.action === 'nav' && act.path) {
      navigate(act.path);
    }
  };

  // Render formatted markdown text
  const renderMessageContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      let formatted = line;
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-emerald-800 dark:text-emerald-300">$1</strong>');
      return (
        <p key={idx} className="mb-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatted }} />
      );
    });
  };

  return (
    <>
      {/* Floating Chat Container: Inspired by LexieLingua Neobrutal/Pastel AI Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0.85, y: 30, rotate: -1 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30, rotate: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={
              isMaximized
                ? { inset: '20px', position: 'fixed', zIndex: 9999, width: 'calc(100vw - 40px)', height: 'calc(100vh - 40px)' }
                : hasCustomPosition
                ? { left: `${position.x}px`, top: `${position.y}px`, position: 'fixed', zIndex: 9999, width: `${chatWidth}px` }
                : { right: '24px', bottom: '90px', position: 'fixed', zIndex: 9999, width: `${chatWidth}px` }
            }
            className={`${
              isMaximized ? '' : 'h-[540px] sm:h-[600px] max-h-[85vh] max-w-[calc(100vw-24px)]'
            } rounded-3xl bg-surface/95 backdrop-blur-2xl border-2 border-primary/40 shadow-[0_20px_50px_rgba(0,120,255,0.25)] flex flex-col overflow-hidden text-text select-none relative ${
              isDragging || isResizingWidth || hasCustomPosition ? 'transition-none' : 'transition-all duration-300'
            }`}
          >
            {/* Left Edge Resize Handle (Mouse & Touch Enabled) */}
            {!isMaximized && (
              <div
                onMouseDown={handleResizeMouseDown}
                onTouchStart={handleResizeMouseDown}
                className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-primary/30 z-50 flex items-center justify-center group touch-none"
                title="Drag or swipe to resize chatbot width"
              >
                <div className="w-1 h-8 rounded-full bg-slate-400/40 dark:bg-slate-500/40 group-hover:bg-primary transition-all"></div>
              </div>
            )}
            {/* Header: Adaptable Neumorphic Banner */}
            <div
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              className="px-5 py-4 bg-gradient-to-r from-[#c4b5fd] via-[#b8a5fe] to-[#a78bfa] dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 border-b-2 border-white/80 dark:border-indigo-900/40 flex items-center justify-between cursor-grab active:cursor-grabbing z-20 shadow-[0_4px_12px_rgba(109,40,217,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] touch-none"
            >
              <div className="flex items-center space-x-3 pointer-events-none">
                <div className="w-11 h-11 shrink-0 aspect-square rounded-full overflow-hidden border-2 border-white dark:border-indigo-500/50 shadow-[3px_3px_8px_rgba(109,40,217,0.25),-2px_-2px_6px_rgba(255,255,255,0.9)] dark:shadow-[0_0_12px_rgba(99,102,241,0.4)] flex items-center justify-center bg-slate-950 relative">
                  <img 
                    src="https://cdn.dribbble.com/userupload/17215135/file/original-d9010db81823243083723c4ff1e1b909.gif" 
                    alt="Buddy GIF" 
                    className="w-full h-full object-cover scale-[2.25] rounded-full"
                  />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight text-purple-950 dark:text-indigo-100 flex items-center gap-1.5 drop-shadow-xs">
                    {personaTitle} <span className="text-cyan-500 dark:text-cyan-400 animate-pulse">{personaEmoji}</span>
                  </h3>
                  <p className="text-[11px] text-purple-900/80 dark:text-indigo-300/80 font-bold">{personaSubtitle}</p>
                </div>
              </div>

              {/* Header Controls: Voice TTS Toggle, Minimize, Maximize, Close */}
              <div className="flex items-center space-x-2 z-30">
                {/* TTS Voice Toggle Button */}
                <button
                  onClick={() => {
                    if (isSpeaking) {
                      stopSpeaking();
                    }
                    setTtsEnabled(!ttsEnabled);
                  }}
                  className={`w-9 h-9 rounded-2xl border transition-all flex items-center justify-center cursor-pointer active:shadow-[inset_2px_2px_4px_rgba(160,154,170,0.5)] ${
                    ttsEnabled 
                      ? 'bg-cyan-500 text-white border-cyan-400 shadow-[3px_3px_6px_rgba(6,182,212,0.35),-2px_-2px_6px_rgba(255,255,255,0.8)] font-bold' 
                      : 'bg-[#e1d2f9] dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border-white/90 dark:border-slate-700 shadow-[3px_3px_6px_rgba(160,154,170,0.45),-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.05)]'
                  }`}
                  title={ttsEnabled ? "Voice Output Active (Click to Mute TTS)" : "Voice Output Muted (Click to Enable TTS)"}
                  aria-label="TTS Voice Toggle"
                >
                  {ttsEnabled ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 ${isSpeaking ? 'animate-bounce' : ''}`}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.287a5.25 5.25 0 010 7.426M12 6.75v10.5a.75.75 0 01-1.28.53l-4.72-4.72H4.5A2.25 2.25 0 012.25 10.8v-1.6c0-1.243 1.007-2.25 2.25-2.25h1.5l4.72-4.72a.75.75 0 011.28.53z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.84a.75.75 0 01-1.28.53l-4.72-4.72H4.5A2.25 2.25 0 012.25 13.2v-2.4c0-1.243 1.007-2.25 2.25-2.25h1.5z" />
                    </svg>
                  )}
                </button>

                {/* Clear / Refresh Chat Button */}
                <button
                  onClick={handleClearChat}
                  className="w-9 h-9 rounded-2xl bg-[#e1d2f9] dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-white/90 dark:border-slate-700 shadow-[3px_3px_6px_rgba(160,154,170,0.45),-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.05)] flex items-center justify-center transition-all cursor-pointer active:shadow-[inset_2px_2px_4px_rgba(160,154,170,0.5)] duration-300"
                  title="Clear Chat / Reset Conversation"
                  aria-label="Refresh Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>

                {/* Minimize Window Button */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsHovered(false);
                  }}
                  className="flex w-9 h-9 rounded-2xl bg-[#e1d2f9] dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-white/90 dark:border-slate-700 shadow-[3px_3px_6px_rgba(160,154,170,0.45),-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.05)] items-center justify-center transition-all cursor-pointer active:shadow-[inset_2px_2px_4px_rgba(160,154,170,0.5)]"
                  title="Minimize Window"
                  aria-label="Minimize Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Maximize / Restore Button (Hidden on smartphone view) */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="hidden sm:flex w-9 h-9 rounded-2xl bg-[#e1d2f9] dark:bg-slate-800 text-indigo-900 dark:text-indigo-200 border border-white/90 dark:border-slate-700 shadow-[3px_3px_6px_rgba(160,154,170,0.45),-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.05)] items-center justify-center transition-all cursor-pointer active:shadow-[inset_2px_2px_4px_rgba(160,154,170,0.5)]"
                  title={isMaximized ? "Restore Window" : "Maximize Window"}
                >
                  {isMaximized ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4.5 4.5m0 0H9m-4.5 0v4.5M15 9l4.5-4.5m0 0H15m4.5 0v4.5M9 15l-4.5 4.5m0 0H9m-4.5 0v-4.5M15 15l4.5 4.5m0 0H15m4.5 0v-4.5" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                  )}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsHovered(false);
                  }}
                  className="w-9 h-9 rounded-2xl bg-[#e1d2f9] dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-white/90 dark:border-slate-700 shadow-[3px_3px_6px_rgba(160,154,170,0.45),-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.4),-2px_-2px_5px_rgba(255,255,255,0.05)] flex items-center justify-center transition-all cursor-pointer active:shadow-[inset_2px_2px_4px_rgba(160,154,170,0.5)]"
                  title="Close Assistant"
                  aria-label="Close Chat"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages Container: SVG Pattern Wallpaper with Light & Dark Theme Adaptability */}
            <div 
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'%3E%3Cpath fill='%23a09aaa' fill-opacity='0.32' d='M192 15v2a11 11 0 0 0-11 11c0 1.94 1.16 4.75 2.53 6.11l2.36 2.36a6.93 6.93 0 0 1 1.22 7.56l-.43.84a8.08 8.08 0 0 1-6.66 4.13H145v35.02a6.1 6.1 0 0 0 3.03 4.87l.84.43c1.58.79 4 .4 5.24-.85l2.36-2.36a12.04 12.04 0 0 1 7.51-3.11 13 13 0 1 1 .02 26 12 12 0 0 1-7.53-3.11l-2.36-2.36a4.93 4.93 0 0 0-5.24-.85l-.84.43a6.1 6.1 0 0 0-3.03 4.87V143h35.02a8.08 8.08 0 0 1 6.66 4.13l.43.84a6.91 6.91 0 0 1-1.22 7.56l-2.36 2.36A10.06 10.06 0 0 0 181 164a11 11 0 0 0 11 11v2a13 13 0 0 1-13-13 12 12 0 0 1 3.11-7.53l2.36-2.36a4.93 4.93 0 0 0 .85-5.24l-.43-.84a6.1 6.1 0 0 0-4.87-3.03H145v35.02a8.08 8.08 0 0 1-4.13 6.66l-.84.43a6.91 6.91 0 0 1-7.56-1.22l-2.36-2.36A10.06 10.06 0 0 0 124 181a11 11 0 0 0-11 11h-2a13 13 0 0 1 13-13c2.47 0 5.79 1.37 7.53 3.11l2.36 2.36a4.94 4.94 0 0 0 5.24.85l.84-.43a6.1 6.1 0 0 0 3.03-4.87V145h-35.02a8.08 8.08 0 0 1-6.66-4.13l-.43-.84a6.91 6.91 0 0 1 1.22-7.56l2.36-2.36A10.06 10.06 0 0 0 107 124a11 11 0 0 0-22 0c0 1.94 1.16 4.75 2.53 6.11l2.36 2.36a6.93 6.93 0 0 1 1.22 7.56l-.43.84a8.08 8.08 0 0 1-6.66 4.13H49v35.02a6.1 6.1 0 0 0 3.03 4.87l.84.43c1.58.79 4 .4 5.24-.85l2.36-2.36a12.04 12.04 0 0 1 7.51-3.11A13 13 0 0 1 81 192h-2a11 11 0 0 0-11-11c-1.94 0-4.75 1.16-6.11 2.53l-2.36 2.36a6.93 6.93 0 0 1-7.56 1.22l-.84-.43a8.08 8.08 0 0 1-4.13-6.66V145H11.98a6.1 6.1 0 0 0-4.87 3.03l-.43.84c-.79 1.58-.4 4 .85 5.24l2.36 2.36a12.04 12.04 0 0 1 3.11 7.51A13 13 0 0 1 0 177v-2a11 11 0 0 0 11-11c0-1.94-1.16-4.75-2.53-6.11l-2.36-2.36a6.93 6.93 0 0 1-1.22-7.56l.43-.84a8.08 8.08 0 0 1 6.66-4.13H47v-35.02a6.1 6.1 0 0 0-3.03-4.87l-.84-.43c-1.59-.8-4-.4-5.24.85l-2.36 2.36A12 12 0 0 1 28 109a13 13 0 1 1 0-26c2.47 0 5.79 1.37 7.53 3.11l2.36 2.36a4.94 4.94 0 0 0 5.24.85l.84-.43A6.1 6.1 0 0 0 47 84.02V49H11.98a8.08 8.08 0 0 1-6.66-4.13l-.43-.84a6.91 6.91 0 0 1 1.22-7.56l2.36-2.36A10.06 10.06 0 0 0 11 28 11 11 0 0 0 0 17v-2a13 13 0 0 1 13 13c0 2.47-1.37 5.79-3.11 7.53l-2.36 2.36a4.94 4.94 0 0 0-.85 5.24l.43.84A6.1 6.1 0 0 0 11.98 47H47V11.98a8.08 8.08 0 0 1 4.13-6.66l.84-.43a6.91 6.91 0 0 1 7.56 1.22l2.36 2.36A10.06 10.06 0 0 0 68 11 11 11 0 0 0 79 0h2a13 13 0 0 1-13 13 12 12 0 0 1-7.53-3.11l-2.36-2.36a4.93 4.93 0 0 0-5.24-.85l-.84.43A6.1 6.1 0 0 0 49 11.98V47h35.02a8.08 8.08 0 0 1 6.66 4.13l.43.84a6.91 6.91 0 0 1-1.22 7.56l-2.36 2.36A10.06 10.06 0 0 0 85 68a11 11 0 0 0 22 0c0-1.94-1.16-4.75-2.53-6.11l-2.36-2.36a6.93 6.93 0 0 1-1.22-7.56l.43-.84a8.08 8.08 0 0 1 6.66-4.13H143V11.98a6.1 6.1 0 0 0-3.03-4.87l-.84-.43c-1.59-.8-4-.4-5.24.85l-2.36 2.36A12 12 0 0 1 124 13a13 13 0 0 1-13-13h2a11 11 0 0 0 11 11c1.94 0 4.75-1.16 6.11-2.53l2.36-2.36a6.93 6.93 0 0 1 7.56-1.22l.84.43a8.08 8.08 0 0 1 4.13 6.66V47h35.02a6.1 6.1 0 0 0 4.87-3.03l.43-.84c.8-1.59.4-4-.85-5.24l-2.36-2.36A12 12 0 0 1 179 28a13 13 0 0 1 13-13zM84.02 143a6.1 6.1 0 0 0 4.87-3.03l.43-.84c.8-1.59.4-4-.85-5.24l-2.36-2.36A12 12 0 0 1 83 124a13 13 0 1 1 26 0c0 2.47-1.37 5.79-3.11 7.53l-2.36 2.36a4.94 4.94 0 0 0-.85 5.24l.43.84a6.1 6.1 0 0 0 4.87 3.03H143v-35.02a8.08 8.08 0 0 1 4.13-6.66l.84-.43a6.91 6.91 0 0 1 7.56 1.22l2.36 2.36A10.06 10.06 0 0 0 164 107a11 11 0 0 0 0-22c-1.94 0-4.75-1.16-6.11-2.53l-2.36-2.36a6.93 6.93 0 0 1-7.56-1.22l.84.43a8.08 8.08 0 0 1-4.13 6.66V143h35.02z'%3E%3C/path%3E%3C/svg%3E")`
              }}
              className={`flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar select-text z-10 bg-[#e1d2f9] dark:bg-slate-900/90 dark:bg-blend-overlay ${isMaximized ? 'p-8 space-y-6 w-full' : ''}`}
            >
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 leading-relaxed transition-all relative ${
                      isMaximized ? 'text-base md:text-lg px-6 py-4 rounded-3xl' : 'text-xs'
                    } ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-blue-600 dark:to-indigo-600 text-white rounded-tr-none font-medium shadow-[6px_6px_12px_rgba(99,102,241,0.35),-3px_-3px_8px_rgba(255,255,255,0.4)] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.5)] border border-white/20'
                        : 'bg-white/95 dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-purple-200/80 dark:border-slate-800 shadow-[6px_6px_16px_rgba(147,112,219,0.25),-4px_-4px_10px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-md'
                    }`}
                  >
                    {renderMessageContent(msg.text)}

                    {/* Interactive In-Chat Water Log Widget for Community Admins */}
                    {msg.widget === "WATER_LOG_FORM" && (
                      <WaterLogFormWidget
                        parsedLiters={msg.parsedLiters}
                        onLogged={() => {
                          setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                      />
                    )}

                    {/* Interactive In-Chat Report PDF Generator Widget */}
                    {msg.widget === "REPORT_GENERATOR" && (
                      <ReportGeneratorWidget />
                    )}

                    {/* Styled Action Pill Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className={`mt-3 pt-2.5 border-t border-purple-300/40 dark:border-slate-800 flex flex-wrap gap-2 ${isMaximized ? 'mt-4 pt-3.5 gap-3' : ''}`}>
                        {msg.actions.map((act, i) => {
                          let btnStyle = "bg-[#f3ebff] dark:bg-slate-800 text-indigo-950 dark:text-purple-200 border border-purple-300/60 dark:border-slate-700 shadow-[3px_3px_6px_rgba(147,112,219,0.3)] dark:shadow-[2px_2px_5px_rgba(0,0,0,0.4)] font-bold";
                          
                          if (act.type === 'primary' || act.label.toLowerCase().includes('bill')) {
                            btnStyle = "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white border border-white/40 shadow-[4px_4px_8px_rgba(37,99,235,0.35)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.5)] font-extrabold";
                          } else if (act.label.toLowerCase().includes('tips') || act.label.toLowerCase().includes('usage')) {
                            btnStyle = "bg-gradient-to-r from-cyan-500 to-teal-500 text-white border border-white/40 shadow-[4px_4px_8px_rgba(6,182,212,0.35)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.5)] font-extrabold";
                          } else if (act.type === 'danger' || act.label.toLowerCase().includes('report') || act.label.toLowerCase().includes('issue')) {
                            btnStyle = "bg-gradient-to-r from-rose-500 to-amber-600 text-white border border-white/40 shadow-[4px_4px_8px_rgba(244,63,94,0.35)] dark:shadow-[2px_2px_6px_rgba(0,0,0,0.5)] font-extrabold";
                          }

                          return (
                            <motion.button
                              key={i}
                              whileHover={{ scale: 1.04, y: -1 }}
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleActionClick(act)}
                              className={`rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                                isMaximized ? 'px-5 py-2.5 text-sm md:text-base rounded-2xl gap-2' : 'px-3.5 py-1.5 text-[11px]'
                              } ${btnStyle}`}
                            >
                              <span>{act.label}</span>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={isMaximized ? "w-4 h-4" : "w-3 h-3"}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-purple-300/30 dark:border-slate-800">
                      {msg.sender === 'bot' && (
                        <button
                          onClick={() => {
                            if (isSpeaking && speakingMsgIdRef.current === msg.id) {
                              stopSpeaking();
                            } else {
                              speakText(msg.text, msg.id);
                            }
                          }}
                          className={`text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                            isMaximized ? 'text-xs gap-1.5' : 'text-[10px]'
                          }`}
                          title="Listen to message voice output"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`${isMaximized ? 'w-4 h-4' : 'w-3 h-3'} ${isSpeaking && speakingMsgIdRef.current === msg.id ? 'animate-pulse text-cyan-400' : ''}`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.287a5.25 5.25 0 010 7.426M12 6.75v10.5a.75.75 0 01-1.28.53l-4.72-4.72H4.5A2.25 2.25 0 012.25 10.8v-1.6c0-1.243 1.007-2.25 2.25-2.25h1.5l4.72-4.72a.75.75 0 011.28.53z" />
                          </svg>
                          <span>{isSpeaking && speakingMsgIdRef.current === msg.id ? 'Stop' : 'Listen'}</span>
                        </button>
                      )}
                      <span className={`font-medium ml-auto ${isMaximized ? 'text-xs' : 'text-[9px]'} ${msg.sender === 'user' ? 'text-white/80' : 'text-slate-600 dark:text-slate-400'}`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center space-x-2 bg-white/95 dark:bg-slate-900 border border-purple-200/80 dark:border-slate-800 px-4 py-3 rounded-2xl rounded-bl-none w-fit shadow-[4px_4px_12px_rgba(147,112,219,0.2),-3px_-3px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_12px_rgba(0,0,0,0.5)]"
                >
                  <span className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-pink-500 dark:bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Pills with Dark Mode Adaptability */}
            <div className={`bg-gradient-to-r from-[#d8c3f7] to-[#d1bbf5] dark:from-slate-900 dark:to-slate-950 border-t-2 border-white/80 dark:border-slate-800 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex items-center z-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] ${
              isMaximized ? 'px-6 py-3.5 space-x-3 w-full' : 'px-3.5 py-2.5 space-x-2'
            }`}>
              {getContextualPills(location.pathname).map((pill, idx) => (
                <motion.button
                  key={idx}
                  disabled={isTyping}
                  whileHover={isTyping ? {} : { scale: 1.04 }}
                  whileTap={isTyping ? {} : { scale: 0.96 }}
                  onClick={() => !isTyping && processUserQuery(pill)}
                  className={`font-bold rounded-full bg-[#f3ebff] dark:bg-slate-800 border border-white/90 dark:border-slate-700 text-purple-950 dark:text-purple-200 transition-all flex-shrink-0 shadow-[3px_3px_6px_rgba(147,112,219,0.35),-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[3px_3px_6px_rgba(0,0,0,0.5),-2px_-2px_5px_rgba(255,255,255,0.05)] active:shadow-[inset_2px_2px_4px_rgba(147,112,219,0.4),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] ${
                    isTyping ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                  } ${
                    isMaximized ? 'text-xs md:text-sm px-4 py-2' : 'text-[10px] px-3 py-1.5'
                  }`}
                >
                  {pill}
                </motion.button>
              ))}
            </div>

            {/* Input Bar with Dark Mode Adaptability */}
            <form onSubmit={handleSend} className={`bg-gradient-to-r from-[#d8c3f7] to-[#d1bbf5] dark:from-slate-900 dark:to-slate-950 border-t-2 border-white/80 dark:border-slate-800 flex items-center gap-1.5 sm:gap-2 z-10 ${
              isMaximized ? 'p-5 w-full gap-3' : 'p-2.5 sm:p-3'
            }`}>
              <input
                type="text"
                value={input}
                disabled={isTyping}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : isTyping ? "Buddy is thinking..." : "Ask Buddy a question..."}
                className={`flex-1 min-w-0 rounded-2xl border-2 transition-all focus:outline-none shadow-[inset_4px_4px_8px_rgba(147,112,219,0.35),inset_-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.6)] ${
                  isMaximized ? 'text-sm md:text-base px-5 py-3.5 rounded-3xl' : 'text-xs px-3 py-2 sm:px-4 sm:py-2.5'
                } ${
                  isListening 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/50 animate-pulse placeholder:text-rose-400 font-bold' 
                    : 'bg-[#f3ebff] dark:bg-slate-900 text-purple-950 dark:text-slate-100 border-white/90 dark:border-slate-700 focus:border-indigo-500 placeholder:text-purple-900/50 dark:placeholder:text-slate-400'
                }`}
              />

              {/* Voice Command Microphone Button */}
              <motion.button
                type="button"
                disabled={isTyping}
                whileHover={isTyping ? {} : { scale: 1.08 }}
                whileTap={isTyping ? {} : { scale: 0.92 }}
                onClick={toggleVoiceInput}
                className={`p-2.5 shrink-0 rounded-2xl transition-all flex items-center justify-center border ${
                  isTyping ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  isListening 
                    ? 'bg-rose-500 text-white border-rose-600 animate-bounce shadow-[4px_4px_10px_rgba(244,63,94,0.4)]' 
                    : 'bg-[#e1d2f9] dark:bg-slate-800 text-indigo-900 dark:text-indigo-300 border-white/90 dark:border-slate-700 shadow-[3px_3px_6px_rgba(160,154,170,0.45),-3px_-3px_6px_rgba(255,255,255,0.9)] dark:shadow-[3px_3px_6px_rgba(15,23,42,0.6),-2px_-2px_5px_rgba(30,41,59,0.5)]'
                }`}
                title={isListening ? "Listening... Click to stop" : "Speak Voice Command"}
                aria-label="Voice Command Mic"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 003-3V4.5a3 3 0 00-6 0v8.25a3 3 0 003 3z" />
                </svg>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 shrink-0 rounded-2xl bg-[#84cc16] hover:bg-[#65a30d] text-white disabled:opacity-40 transition-all shadow-md shadow-lime-600/30 cursor-pointer flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Launcher Button & Thought Cloud (Hidden when chat window is open) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-auto"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* High-Fidelity SVG AI Thought Cloud Bubble (Desktop only) */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, x: 25, y: 25 }}
                  animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, x: 25, y: 25 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className="hidden sm:flex absolute bottom-16 right-10 flex-col items-end pointer-events-none z-50 filter drop-shadow-[0_14px_35px_rgba(0,120,255,0.45)]"
                >
                  <div className="relative w-[340px] h-[150px]">
                    {/* SVG Cloud Speech Bubble Vector */}
                    <svg viewBox="0 0 310 135" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                      <defs>
                        <linearGradient id="cloudBgLight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
                          <stop offset="100%" stopColor="#f0f7ff" stopOpacity="0.96" />
                        </linearGradient>
                        <linearGradient id="cloudStrokeLight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#0078ff" />
                          <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                      {/* Cloud Main Bubble Path */}
                      <path
                        d="M 50 45 
                           C 40 25, 65 5, 95 18 
                           C 115 2, 155 0, 185 15 
                           C 210 2, 245 10, 260 30 
                           C 285 30, 298 55, 290 75 
                           C 305 95, 285 120, 260 115 
                           C 240 128, 200 130, 170 118 
                           C 145 130, 105 125, 85 110 
                           C 60 118, 35 105, 30 85 
                           C 15 65, 25 45, 50 45 Z"
                        fill="url(#cloudBgLight)"
                        stroke="url(#cloudStrokeLight)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        className="dark:fill-slate-900/95 dark:stroke-primary"
                      />
                      {/* 45-Degree Trailing Thought Circles */}
                      <circle cx="265" cy="118" r="6" fill="url(#cloudBgLight)" stroke="url(#cloudStrokeLight)" strokeWidth="2" className="dark:fill-slate-900 dark:stroke-primary" />
                      <circle cx="277" cy="126" r="4.5" fill="url(#cloudBgLight)" stroke="url(#cloudStrokeLight)" strokeWidth="1.5" className="dark:fill-slate-900 dark:stroke-primary" />
                      <circle cx="286" cy="132" r="3" fill="url(#cloudBgLight)" stroke="url(#cloudStrokeLight)" strokeWidth="1.5" className="dark:fill-slate-900 dark:stroke-primary" />
                    </svg>

                    {/* Text overlay strictly contained inside the SVG cloud center */}
                    <div className="absolute inset-0 top-3 left-7 right-9 bottom-7 flex items-center justify-center text-center px-4">
                      <p className="text-[13.5px] leading-relaxed font-bold text-slate-800 dark:text-slate-100 select-none">
                        <span className="font-extrabold text-blue-600 dark:text-cyan-300">AI Assistant:</span> How can I help you today, <strong className="font-black text-[#78350f] dark:text-[#f59e0b] drop-shadow-xs">{displayName}</strong>? 💭
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Launcher Button with Robot Icon */}
            <motion.button
              whileHover={{ scale: 1.15, rotate: [0, -4, 4, 0] }}
              whileTap={{ scale: 0.88 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ y: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } }}
              onClick={() => setIsOpen(true)}
              className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 shrink-0 aspect-square rounded-full bg-slate-950 border-2 border-primary shadow-[0_15px_40px_rgba(0,120,255,0.5)] cursor-pointer group overflow-hidden"
              aria-label="Open Assistant"
            >
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="/robo-ai.gif" 
                alt="AI Chatbot Animated Icon" 
                className="w-full h-full object-cover scale-[2.75] rounded-full"
              />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HouseholdChatbot;
