import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReportGeneratorWidget = ({ onGenerated }) => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('ALL');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);

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

  const handleGenerate = () => {
    navigate(`/reports?autoExport=true&type=${reportType}&month=${month}`);
    if (onGenerated) onGenerated();
  };

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-cyan-50/90 to-blue-50/90 dark:from-slate-900/90 dark:to-cyan-950/90 border-2 border-cyan-300 dark:border-cyan-700/60 shadow-lg text-slate-800 dark:text-slate-100 text-xs select-text">
      <div className="flex items-center gap-1.5 font-extrabold text-cyan-950 dark:text-cyan-200 text-xs mb-2.5">
        <span className="text-base">📄</span>
        <span>Quick In-Chat PDF Report Generator</span>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-bold text-cyan-900 dark:text-cyan-300 mb-1">
            1. Select Report Category:
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-semibold"
          >
            <option value="ALL">🌐 Master Executive Report (P&L, Dues, Usage & Tickets)</option>
            <option value="PNL">💰 Financial Profit & Loss Audit</option>
            <option value="DUES">💳 Block Unpaid Clearance Audit</option>
            <option value="USAGE">📊 Meter Reading Telemetry</option>
            <option value="TICKETS">🛠️ Support Ticket Resolution Log</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-cyan-900 dark:text-cyan-300 mb-1">
            2. Target Billing Month:
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-cyan-200 dark:border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs font-semibold"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1"
        >
          <span>🚀 Launch PDF Generator Engine</span>
        </button>
      </div>
    </div>
  );
};

export default ReportGeneratorWidget;
