import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Eye, EyeOff, Mail, AlertTriangle, Info, Calendar } from 'lucide-react';
import api from '../api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD
  const [selectedNotif, setSelectedNotif] = useState(null);

  const fetchNotifications = async () => {
    try {
      const username = localStorage.getItem('username');
      if (!username) { setLoading(false); return; }
      
      const endpoint = filter === 'UNREAD' 
        ? `/notifications/${username}/unread` 
        : `/notifications/${username}`;
      const res = await api.get(endpoint);
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const username = localStorage.getItem('username');
      if (!username) return;
      await api.put(`/notifications/${username}/read-all`);
      await fetchNotifications();
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications? This cannot be undone.")) return;
    try {
      const username = localStorage.getItem('username');
      if (!username) return;
      await api.delete(`/notifications/delete-all/${username}`);
      await fetchNotifications();
    } catch (err) {
      console.error("Error deleting all notifications:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      await fetchNotifications();
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'BILL_GENERATED':
        return <Mail className="w-5 h-5 text-indigo-400" />;
      case 'ANOMALY':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type, isRead) => {
    if (isRead) return 'bg-surface-light border-border/50';
    switch (type) {
      case 'ANOMALY':
        return 'bg-red-500/10 border-red-500/25';
      case 'BILL_GENERATED':
        return 'bg-indigo-500/10 border-indigo-500/25';
      default:
        return 'bg-primary/10 border-primary/25';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Notifications</h1>
          <p className="text-text-muted mt-1">Stay updated with your consumption reports and bills.</p>
        </div>
        <div className="flex items-center gap-3">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 hover:bg-primary/25 text-primary rounded-xl text-sm font-semibold transition-all cursor-pointer border border-primary/25"
            >
              <Check className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-xl text-sm font-semibold transition-all cursor-pointer border border-red-500/25"
            >
              <Trash2 className="w-4 h-4" />
              Delete all
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${filter === 'ALL' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${filter === 'UNREAD' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
        >
          Unread
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center text-text-muted flex flex-col items-center glass-card">
          <Bell className="w-12 h-12 mb-3 opacity-20 text-primary" />
          <p>No notifications found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:shadow-lg ${getBgColor(notif.notificationType, notif.isRead)}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2.5 rounded-lg bg-surface flex-shrink-0 mt-0.5 border border-border/40">
                    {getIcon(notif.notificationType)}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedNotif(notif); if (!notif.isRead) handleMarkAsRead(notif.id); }}>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm truncate text-text ${!notif.isRead ? 'font-bold' : 'font-medium'}`}>
                        {notif.title}
                      </h3>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-text-muted truncate mt-0.5">{notif.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      title="Mark as read"
                      className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    title="Delete"
                    className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-red-400 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Selected notification details modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
            <button onClick={() => setSelectedNotif(null)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"><Trash2 className="hidden" /><Check className="hidden" />Close</button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-surface-lighter border border-border/50">
                {getIcon(selectedNotif.notificationType)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-text">{selectedNotif.title}</h3>
                <span className="text-xs text-text-muted font-medium flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(selectedNotif.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-surface-lighter rounded-xl p-4 border border-border/30 text-sm text-text-muted leading-relaxed">
              {selectedNotif.message}
            </div>

            <button
              onClick={() => setSelectedNotif(null)}
              className="mt-5 w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all cursor-pointer text-sm"
            >
              Done
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
