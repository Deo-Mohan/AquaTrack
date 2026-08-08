import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Eye, EyeOff, Mail, AlertTriangle, Info, Calendar, X } from 'lucide-react';
import api from '../api';

import { groupNotificationsByDate, formatNotificationTime } from '../utils/dateGrouper';

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
    if (isRead) return 'bg-white/90 dark:bg-slate-900/90 border-2 border-slate-200 dark:border-slate-800 opacity-75 shadow-sm hover:border-primary/50';
    const sev = getSeverity(type, title);
    switch (sev) {
      case 'danger':
        return 'bg-white dark:bg-slate-900 border-2 border-red-500/60 dark:border-red-500/50 shadow-md shadow-red-500/10 hover:border-red-500';
      case 'success':
        return 'bg-white dark:bg-slate-900 border-2 border-emerald-500/60 dark:border-emerald-500/50 shadow-md shadow-emerald-500/10 hover:border-emerald-500';
      case 'billing':
        return 'bg-white dark:bg-slate-900 border-2 border-indigo-500/60 dark:border-indigo-500/50 shadow-md shadow-indigo-500/10 hover:border-indigo-500';
      default:
        return 'bg-white dark:bg-slate-900 border-2 border-sky-500/60 dark:border-sky-500/50 shadow-md shadow-sky-500/10 hover:border-sky-500';
    }
  };

  const getIconContainerClass = (type, title, isRead) => {
    if (isRead) return 'p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700';
    const sev = getSeverity(type, title);
    switch (sev) {
      case 'danger':
        return 'p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 flex-shrink-0 mt-0.5';
      case 'success':
        return 'p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex-shrink-0 mt-0.5';
      case 'billing':
        return 'p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 flex-shrink-0 mt-0.5';
      default:
        return 'p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 flex-shrink-0 mt-0.5';
    }
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">Notifications</h1>
          <p className="text-text-muted mt-1 text-xs sm:text-sm">Stay updated with your consumption reports and bills.</p>
        </div>
        
        {/* Responsive action buttons toolbar for mobile & desktop */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-primary/15 hover:bg-primary/25 active:scale-95 text-primary rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border border-primary/30 shadow-sm whitespace-nowrap"
            >
              <Check className="w-4 h-4 shrink-0 font-bold" />
              <span>Mark all read</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-red-500/15 hover:bg-red-500/25 active:scale-95 text-red-700 dark:text-red-300 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border border-red-500/30 shadow-sm whitespace-nowrap"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Delete all</span>
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
        <div className="space-y-6">
          {groupedNotifications.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-3">
              {/* WhatsApp Style Date Section Header */}
              <div className="sticky top-0 z-10 flex items-center gap-3 py-1">
                <span className="px-3.5 py-1 rounded-full text-xs font-black bg-primary/15 text-primary border border-primary/30 shadow-sm backdrop-blur-md">
                  {group.dateLabel}
                </span>
                <div className="flex-1 h-px bg-border/40" />
              </div>

              <div className="space-y-2.5">
                <AnimatePresence>
                  {group.items.map((notif, index) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: index * 0.03 }}
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
                          <span className="text-[10px] text-text-muted font-bold block mt-1">
                            {formatNotificationTime(notif.createdAt)}
                          </span>
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
            </div>
          ))}
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

              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 sm:gap-4 pt-5 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deletingAll}
                  className="w-full sm:flex-1 py-3 px-5 rounded-2xl border border-border text-sm font-bold text-text-muted hover:text-text hover:bg-surface-lighter active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteAll}
                  disabled={deletingAll}
                  className="w-full sm:flex-1 py-3 px-5 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-2xl text-sm font-extrabold transition-all cursor-pointer shadow-lg shadow-red-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 15 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 15 }}
            className="bg-surface border border-primary/30 w-full max-w-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative my-auto overflow-hidden"
          >
            <button 
              onClick={() => setSelectedNotif(null)} 
              className="absolute top-5 right-5 text-text-muted hover:text-text cursor-pointer p-1.5 rounded-xl hover:bg-surface-lighter transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-start gap-4 mb-6 pr-8">
              <div className={getIconContainerClass(selectedNotif.notificationType, selectedNotif.title, false)}>
                {getIcon(selectedNotif.notificationType, selectedNotif.title)}
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 inline-block mb-1.5">
                  {selectedNotif.notificationType || 'NOTIFICATION'}
                </span>
                <h3 className="text-xl font-extrabold text-text leading-snug">{selectedNotif.title}</h3>
                <span className="text-xs text-text-muted font-bold flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {new Date(selectedNotif.createdAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                </span>
              </div>
            </div>

            {/* Notification Body / Summary */}
            <div className="space-y-4">
              <div className="bg-surface-lighter rounded-2xl p-4 sm:p-5 border border-border/50">
                <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2">Message Details</h4>
                <p className="text-sm text-text font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedNotif.message}
                </p>
              </div>

              {/* Data Breakdown Cards (Parses list/key-value metrics inside bulk uploads or report notifications) */}
              {(() => {
                const message = selectedNotif.message || '';
                // Check if message contains comma/colon key-value metrics like "Imported: 1, Failed: 3..."
                if (message.includes(':')) {
                  const items = message.split(/(?:,|\.)\s+/).filter(part => part.includes(':'));
                  if (items.length > 0) {
                    return (
                      <div className="bg-surface-lighter/60 rounded-2xl p-4 border border-border/40 space-y-2.5">
                        <h4 className="text-xs font-black text-text-muted uppercase tracking-wider">Extracted Data Summary</h4>
                        <div className="grid grid-cols-2 gap-2.5">
                          {items.map((item, idx) => {
                            const [key, ...valParts] = item.split(':');
                            const val = valParts.join(':').trim();
                            if (!key || !val) return null;
                            return (
                              <div key={idx} className="bg-surface p-3 rounded-xl border border-border/40">
                                <span className="text-[11px] font-bold text-text-muted block uppercase tracking-wider">{key.trim()}</span>
                                <span className="text-sm font-extrabold text-text mt-0.5 block">{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Raw Notification Metadata */}
              <div className="rounded-2xl border border-border/40 p-4 bg-surface-lighter/30 space-y-2 text-xs">
                <div className="flex justify-between items-center text-text-muted font-medium">
                  <span>Notification ID</span>
                  <span className="font-mono text-text font-bold">#{selectedNotif.id}</span>
                </div>
                <div className="flex justify-between items-center text-text-muted font-medium">
                  <span>Recipient</span>
                  <span className="font-bold text-text">{selectedNotif.recipientUsername || localStorage.getItem('username')}</span>
                </div>
                <div className="flex justify-between items-center text-text-muted font-medium">
                  <span>Read Status</span>
                  <span className={`font-black px-2.5 py-0.5 rounded-full text-[11px] ${selectedNotif.isRead ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-500/40'}`}>
                    {selectedNotif.isRead ? '✓ Read' : 'Unread'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedNotif(null)}
              className="mt-6 w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all cursor-pointer text-sm shadow-lg shadow-primary/25"
            >
              Close Details
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
