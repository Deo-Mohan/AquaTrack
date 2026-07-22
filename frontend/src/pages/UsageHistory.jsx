import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Activity, AlertTriangle, Filter, ArrowUpDown } from 'lucide-react';
import api from '../api';

export default function UsageHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Sort States
  const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, vol-desc, vol-asc
  const [filterStatus, setFilterStatus] = useState('all'); // all, normal, overuse
  const [filterMonth, setFilterMonth] = useState('all'); // all, 1-12
  const [filterYear, setFilterYear] = useState('all'); // all, years...

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const houseNumber = localStorage.getItem('houseNumber');
          if (!houseNumber) { setLoading(false); return; }
          const res = await api.get(`/usage/household/${houseNumber}`);
          setLogs(res.data || []);
        }
      } catch (err) {
        console.error("Error fetching usage history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getStatusColor = (status) => {
    if (status === 'Overuse' || status === 'OVERUSE') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  };

  // Derive unique years dynamically from logs
  const availableYears = Array.from(
    new Set(logs.map(log => new Date(log.readingDate).getFullYear()))
  ).sort((a, b) => b - a);

  // Derived state: Filtered & Sorted Logs
  const filteredAndSortedLogs = logs
    .filter(log => {
      const d = new Date(log.readingDate);
      const matchesStatus = filterStatus === 'all' || 
        (log.status ? log.status.toLowerCase() : 'normal') === filterStatus.toLowerCase();
      const matchesMonth = filterMonth === 'all' || 
        (d.getMonth() + 1) === parseInt(filterMonth, 10);
      const matchesYear = filterYear === 'all' || 
        d.getFullYear() === parseInt(filterYear, 10);
      return matchesStatus && matchesMonth && matchesYear;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.readingDate) - new Date(a.readingDate);
      }
      if (sortBy === 'date-asc') {
        return new Date(a.readingDate) - new Date(b.readingDate);
      }
      if (sortBy === 'vol-desc') {
        return b.readingLiters - a.readingLiters;
      }
      if (sortBy === 'vol-asc') {
        return a.readingLiters - b.readingLiters;
      }
      return 0;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Usage History</h1>
          <p className="text-text-muted mt-1">Detailed breakdown of your daily water consumption.</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-text-muted" />
            <h3 className="font-semibold text-text">Meter Readings Log</h3>
          </div>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            Total Logs: {filteredAndSortedLogs.length}
          </span>
        </div>

        {/* Filter Controls Row */}
        <div className="p-6 border-b border-border bg-surface-lighter/20 grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-primary" /> Filter by Month
            </label>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold shadow-sm"
            >
              <option value="all">All Months</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((mName, idx) => (
                <option key={mName} value={idx + 1}>{mName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-primary" /> Filter by Year
            </label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold shadow-sm"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-primary" /> Status Filter
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="normal">Normal</option>
              <option value="overuse">Overuse</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-text-muted mb-1.5 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-primary" /> Sort Order
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer font-bold shadow-sm"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="vol-desc">Highest Usage</option>
              <option value="vol-asc">Lowest Usage</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <div className="p-6 space-y-4">
            <div className="h-10 w-full rounded-lg skeleton-pulse" />
            <div className="h-12 w-full rounded-lg skeleton-pulse" />
            <div className="h-12 w-full rounded-lg skeleton-pulse" />
          </div>
        ) : filteredAndSortedLogs.length === 0 ? (
          <div className="p-12 text-center text-text-muted flex flex-col items-center">
            <Activity className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-bold text-sm">No usage history matches the selected filters.</p>
            <p className="text-xs text-text-muted mt-1">Try resetting the dropdown filters to see all readings.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-lighter/50 border-b border-border text-sm text-text-muted">
                  <th className="p-4 font-medium">Log ID</th>
                  <th className="p-4 font-medium">Reading Date</th>
                  <th className="p-4 font-medium">Volume (Liters)</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedLogs.map((log, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.5) }}
                    key={log.id} 
                    className="border-b border-border/50 hover:bg-surface-lighter/30 transition-colors"
                  >
                    <td className="p-4 font-medium text-text">#{log.id.toString().padStart(5, '0')}</td>
                    <td className="p-4 text-text-muted">
                      {new Date(log.readingDate).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="p-4 font-semibold text-text">{log.readingLiters.toLocaleString()} L</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(log.status)}`}>
                        {(log.status === 'Overuse' || log.status === 'OVERUSE') && <AlertTriangle className="w-3 h-3" />}
                        {log.status === 'Overuse' || log.status === 'OVERUSE' ? 'Overuse' : 'Normal'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
