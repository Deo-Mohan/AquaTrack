import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Droplet, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Cell
} from 'recharts';
import api from '../api';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#06b6d4', '#6366f1', '#f97316'];

export default function MyUsage() {
  const [usageData, setUsageData] = useState([]);
  const [totalUsage, setTotalUsage] = useState(0);
  const [percentChange, setPercentChange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState('area'); // area, bar, line

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const houseNumber = localStorage.getItem('houseNumber');
          if (!houseNumber) { 
            setUsageData([]); 
            setTotalUsage(0); 
            setPercentChange(0);
            setLoading(false); 
            return; 
          }
          const res = await api.get(`/usage/household/${houseNumber}`);
          
          if (res.data && res.data.length > 0) {
            const sortedData = res.data.sort((a, b) => new Date(a.readingDate) - new Date(b.readingDate));
            
            const chartData = sortedData.map(log => ({
              name: new Date(log.readingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              usage: log.readingLiters
            }));
            setUsageData(chartData);

            // Calculate 30-day usage metrics dynamically
            const now = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);
            thirtyDaysAgo.setHours(0,0,0,0);

            const sixtyDaysAgo = new Date();
            sixtyDaysAgo.setDate(now.getDate() - 60);
            sixtyDaysAgo.setHours(0,0,0,0);

            let current30 = 0;
            let prev30 = 0;

            res.data.forEach(log => {
              const logDate = new Date(log.readingDate);
              if (logDate >= thirtyDaysAgo) {
                current30 += log.readingLiters;
              } else if (logDate >= sixtyDaysAgo && logDate < thirtyDaysAgo) {
                prev30 += log.readingLiters;
              }
            });

            setTotalUsage(current30);

            if (prev30 > 0) {
              const diff = ((current30 - prev30) / prev30) * 100;
              setPercentChange(Math.round(diff * 10) / 10);
            } else {
              setPercentChange(0);
            }
          } else {
            setUsageData([]);
            setTotalUsage(0);
            setPercentChange(0);
          }
        }
      } catch (err) {
        console.error("Error fetching usage data:", err);
        setUsageData([]);
        setTotalUsage(0);
        setPercentChange(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, []);

  const getFallbackData = () => [
    { name: 'Jul 1', usage: 120 },
    { name: 'Jul 2', usage: 132 },
    { name: 'Jul 3', usage: 101 },
    { name: 'Jul 4', usage: 145 },
    { name: 'Jul 5', usage: 90 },
    { name: 'Jul 6', usage: 180 },
    { name: 'Jul 7', usage: 75 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">My Usage Analysis</h1>
          <p className="text-text-muted mt-1">Deep dive into your water consumption trends.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-5 h-5 text-blue-400" />
              <h3 className="text-text-muted font-medium">Total Volume (30 Days)</h3>
            </div>
            <h2 className="text-4xl font-bold text-text mb-4">{totalUsage.toLocaleString()} <span className="text-xl text-text-muted font-normal">Liters</span></h2>
            
            {percentChange !== 0 ? (
              <div className="flex items-center gap-2 text-sm">
                <span className={`flex items-center px-2 py-1 rounded-full font-medium ${
                  percentChange < 0 
                    ? 'text-emerald-400 bg-emerald-500/10' 
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {percentChange < 0 ? (
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(percentChange)}%
                </span>
                <span className="text-text-muted">vs previous 30 days</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span>0% vs previous 30 days</span>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-border">
            <h4 className="text-sm font-medium text-text mb-3">Usage Distribution</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">Bathroom</span>
                  <span className="text-text">{totalUsage > 0 ? '45%' : '0%'}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: totalUsage > 0 ? '45%' : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">Kitchen</span>
                  <span className="text-text">{totalUsage > 0 ? '30%' : '0%'}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: totalUsage > 0 ? '30%' : '0%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text-muted">Laundry</span>
                  <span className="text-text">{totalUsage > 0 ? '25%' : '0%'}</span>
                </div>
                <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400 transition-all duration-300" style={{ width: totalUsage > 0 ? '25%' : '0%' }} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 lg:col-span-2 min-h-[400px] flex flex-col"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="font-semibold text-text">Daily Consumption Trend</h3>
            <div className="flex gap-3">
              <select className="bg-surface-lighter border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary/50 cursor-pointer">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="bg-surface-lighter border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary/50 cursor-pointer"
              >
                <option value="area">Area Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
              </select>
            </div>
          </div>
          <div className="flex-1 w-full min-h-[300px] flex items-center justify-center">
            {loading ? (
              <div className="w-full h-[300px] flex flex-col gap-4 p-2">
                <div className="flex-1 w-full flex items-end gap-3">
                  <div className="w-full h-1/3 rounded-t-lg skeleton-pulse" />
                  <div className="w-full h-2/3 rounded-t-lg skeleton-pulse" />
                  <div className="w-full h-1/2 rounded-t-lg skeleton-pulse" />
                  <div className="w-full h-3/4 rounded-t-lg skeleton-pulse" />
                  <div className="w-full h-5/6 rounded-t-lg skeleton-pulse" />
                  <div className="w-full h-2/5 rounded-t-lg skeleton-pulse" />
                  <div className="w-full h-2/3 rounded-t-lg skeleton-pulse" />
                </div>
                <div className="h-4 w-full rounded-md skeleton-pulse" />
              </div>
            ) : usageData.length === 0 ? (
              <div className="text-center p-6 space-y-2">
                <Droplet className="w-12 h-12 text-text-muted/40 mx-auto animate-pulse" />
                <p className="text-text font-medium">No usage data logged yet</p>
                <p className="text-xs text-text-muted max-w-sm">Contact your Community Administrator to log meter readings for your household.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  if (chartType === 'bar') {
                    return (
                      <BarChart data={usageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                          labelStyle={{ color: '#f8fafc' }}
                          itemStyle={{ color: '#cbd5e1' }}
                        />
                        <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                          {usageData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    );
                  }
                  if (chartType === 'line') {
                    return (
                      <LineChart data={usageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                    <AreaChart data={usageData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUsageBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
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
                      <Area type="monotone" dataKey="usage" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsageBlue)" />
                    </AreaChart>
                  );
                })()}
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
