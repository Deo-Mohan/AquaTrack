import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, Activity, AlertTriangle } from 'lucide-react';
import api from '../api';

export default function UsageHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const houseNumber = localStorage.getItem('houseNumber');
          if (!houseNumber) { setLoading(false); return; }
          const res = await api.get(`/usage/household/${houseNumber}`);
          
          // Sort by date descending
          const sortedLogs = res.data.sort((a, b) => 
            new Date(b.readingDate) - new Date(a.readingDate)
          );
          setLogs(sortedLogs);
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
        <div className="p-6 border-b border-border flex items-center gap-3">
          <History className="w-5 h-5 text-text-muted" />
          <h3 className="font-semibold text-text">Meter Readings Log</h3>
        </div>
        
        {loading ? (
          <div className="p-6 space-y-4">
            <div className="h-10 w-full rounded-lg skeleton-pulse" />
            <div className="h-12 w-full rounded-lg skeleton-pulse" />
            <div className="h-12 w-full rounded-lg skeleton-pulse" />
            <div className="h-12 w-full rounded-lg skeleton-pulse" />
            <div className="h-12 w-full rounded-lg skeleton-pulse" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-text-muted flex flex-col items-center">
            <Activity className="w-12 h-12 mb-3 opacity-20" />
            <p>No usage history found for your apartment.</p>
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
                {logs.map((log, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={log.id} 
                    className="border-b border-border/50 hover:bg-surface-lighter/30 transition-colors"
                  >
                    <td className="p-4 font-medium text-text">#{log.id.toString().padStart(5, '0')}</td>
                    <td className="p-4 text-text-muted">{new Date(log.readingDate).toLocaleDateString()}</td>
                    <td className="p-4 font-semibold text-text">{log.readingLiters.toLocaleString()} L</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(log.status)}`}>
                        {log.status === 'Overuse' && <AlertTriangle className="w-3 h-3" />}
                        {log.status || 'Normal'}
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
