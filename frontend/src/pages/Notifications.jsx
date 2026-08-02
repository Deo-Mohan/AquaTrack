import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Eye, EyeOff, Mail, AlertTriangle, Info, Calendar } from 'lucide-react';
import api from '../api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, UNREAD
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

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

  const confirmDeleteAll = async () => {
    try {
      setDeletingAll(true);
      const username = localStorage.getItem('username');
      if (!username) return;
      await api.delete(`/notifications/delete-all/${username}`);
      setShowDeleteConfirm(false);
      await fetchNotifications();
    } catch (err) {
      console.error("Error deleting all notifications:", err);
    } finally {
      setDeletingAll(false);
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

  const getSeverity = (type, title = '') => {
    const t = type ? type.toUpperCase() : '';
    const name = title ? title.toLowerCase() : '';

    if (t === 'ANOMALY' || t === 'ALERT' || t === 'LEAK' || name.includes('high') || name.includes('overuse') || name.includes('leak') || name.includes('alert') || name.includes('expired')) {
      return 'danger';
    }
    if (t === 'VERIFIED' || t === 'INVITATION_ACCEPTED' || name.includes('verified') || name.includes('approved') || name.includes('accepted') || name.includes('success')) {
      return 'success';
    }
    if (t === 'BILL_GENERATED' || t === 'BILL' || name.includes('bill') || name.includes('invoice') || name.includes('payment')) {
      return 'billing';
    }
    return 'info';
  };

  const getIcon = (type, title) => {
    const sev = getSeverity(type, title);
    switch (sev) {
      case 'danger':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'success':
        return <Check className="w-5 h-5 text-emerald-400 font-bold" />;
      case 'billing':
        return <Mail className="w-5 h-5 text-indigo-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = (type, title, isRead) => {
    if (isRead) return 'bg-surface-light/40 dark:bg-surface-light/10 border-2 border-slate-300/80 dark:border-slate-700/80 opacity-80 hover:border-primary/60';
    const sev = getSeverity(type, title);
    switch (sev) {
      case 'danger':
        return 'bg-red-500/10 dark:bg-red-500/15 border-2 border-red-500/50 dark:border-red-500/40 shadow-sm shadow-red-500/10 hover:border-red-500';
      case 'success':
        return 'bg-emerald-500/10 dark:bg-emerald-500/15 border-2 border-emerald-500/50 dark:border-emerald-500/40 shadow-sm shadow-emerald-500/10 hover:border-emerald-500';
      case 'billing':
        return 'bg-indigo-500/10 dark:bg-indigo-500/15 border-2 border-indigo-500/50 dark:border-indigo-500/40 shadow-sm shadow-indigo-500/10 hover:border-indigo-500';
      default:
        return 'bg-blue-500/10 dark:bg-blue-500/15 border-2 border-blue-500/50 dark:border-blue-500/40 shadow-sm shadow-blue-500/10 hover:border-blue-500';
    }
  };

  const getIconContainerClass = (type, title, isRead) => {
    if (isRead) return 'p-2.5 rounded-xl bg-surface flex-shrink-0 mt-0.5 border border-border/70';
    const sev = getSeverity(type, title);
    switch (sev) {
      case 'danger':
        return 'p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 flex-shrink-0 mt-0.5';
      case 'success':
        return 'p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex-shrink-0 mt-0.5';
      case 'billing':
        return 'p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex-shrink-0 mt-0.5';
      default:
        return 'p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/40 flex-shrink-0 mt-0.5';
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
              onClick={() => setShowDeleteConfirm(true)}
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
        <div className="p-12 sm:p-16 text-center flex flex-col items-center justify-center glass-card min-h-[440px]">
          <motion.img 
            src="/empty_state_notifications.svg" 
            alt="No Notifications" 
            className="w-64 sm:w-80 md:w-96 object-contain mb-6 opacity-90"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          />
          <h3 className="text-text font-black text-xl mb-1.5">No notifications found</h3>
          <p className="text-text-muted text-sm max-w-md font-medium leading-relaxed">You're all caught up! Updates regarding bills, meter logs, and alerts will appear here.</p>
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
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:shadow-lg ${getBgColor(notif.notificationType, notif.title, notif.isRead)}`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={getIconContainerClass(notif.notificationType, notif.title, notif.isRead)}>
                    {getIcon(notif.notificationType, notif.title)}
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

      {/* Custom Delete All Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="bg-surface border border-red-500/30 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-start gap-5 mb-6">
                <div className="p-4 rounded-2xl bg-red-500/15 text-red-500 border border-red-500/30 shrink-0">
                  <AlertTriangle className="w-8 h-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-text">Delete All Notifications?</h3>
                  <p className="text-sm text-text-muted mt-1.5 leading-relaxed font-medium">
                    Are you sure you want to delete all notifications? This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-5 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingAll}
                  className="flex-1 py-3 px-5 rounded-2xl border border-border text-sm font-bold text-text-muted hover:text-text hover:bg-surface-lighter transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAll}
                  disabled={deletingAll}
                  className="flex-1 py-3 px-5 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deletingAll ? 'Deleting...' : 'Yes, Delete All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
