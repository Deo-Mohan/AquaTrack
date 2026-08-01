import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Plus, AlertTriangle, CheckCircle2, Clock, 
  Send, ShieldAlert, ArrowUpRight, Filter, User, HelpCircle, 
  Loader2, Mail, Shield, Check, X, RefreshCw, Sparkles, LifeBuoy, Image, Paperclip
} from 'lucide-react';
import api from '../api';

export default function Support() {
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'contacts'
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Modals & Form states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [escalationReason, setEscalationReason] = useState('');
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [escalating, setEscalating] = useState(false);

  // New ticket form data
  const [ticketForm, setTicketForm] = useState({
    title: '',
    category: 'BILLING',
    priority: 'MEDIUM',
    description: '',
    screenshotUrl: ''
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please upload a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTicketForm(prev => ({ ...prev, screenshotUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter state
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);

  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role') || 'ROLE_RESIDENT';

  // Read status state for unread replies count
  const [readTicketCounts, setReadTicketCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('aquatrack_read_reply_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const markTicketAsRead = (ticket) => {
    if (!ticket) return;
    const replyCount = ticket.replies ? ticket.replies.length : 0;
    setReadTicketCounts(prev => {
      const updated = { ...prev, [ticket.id]: replyCount };
      localStorage.setItem('aquatrack_read_reply_counts', JSON.stringify(updated));
      return updated;
    });
  };

  const isResident = role === 'ROLE_RESIDENT';
  const isCommunityAdmin = role === 'ROLE_COMMUNITY_ADMIN';
  const isSuperAdmin = role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_ADMIN';

  // Fetch Tickets
  const fetchTickets = async () => {
    try {
      setError('');
      const res = await api.get(`/tickets?callerUsername=${username}`);
      const data = res.data || [];
      setTickets(data);

      if (selectedTicket) {
        const updated = data.find(t => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error('Error fetching support tickets', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Contacts
  const fetchContacts = async () => {
    try {
      setContactsLoading(true);
      const res = await api.get(`/users/contacts/${username}`);
      let fetchedContacts = res.data || [];
      if (role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN') {
        fetchedContacts.push({
          id: 'developer_contact',
          username: 'Krishna Mohan Kumar',
          email: 'krishnamohan813101@gmail.com',
          role: 'DEVELOPER',
          apartmentBlock: 'System Core',
          colonyName: 'Dev Team'
        });
      }
      setContacts(fetchedContacts);
    } catch (err) {
      console.error('Error fetching contacts', err);
    } finally {
      setContactsLoading(false);
    }
  };

  // Real-Time Polling for live updates (4 seconds interval)
  useEffect(() => {
    if (username) {
      fetchTickets();
      fetchContacts();

      const interval = setInterval(() => {
        fetchTickets();
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [username]);

  const handleMailTo = (email) => {
    window.location.href = `mailto:${email}`;
  };

  // Create Ticket Handler
  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) return;

    try {
      setCreatingTicket(true);
      const payload = {
        ...ticketForm,
        callerUsername: username
      };
      await api.post(`/tickets/create?callerUsername=${username}`, payload);
      setShowCreateModal(false);
      setTicketForm({ title: '', category: 'BILLING', priority: 'MEDIUM', description: '', screenshotUrl: '' });
      await fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create support ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  // Reply Handler
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      setSubmittingReply(true);
      const res = await api.post(`/tickets/${selectedTicket.id}/reply?callerUsername=${username}`, {
        message: replyText
      });
      setSelectedTicket(res.data);
      markTicketAsRead(res.data);
      setReplyText('');
      await fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Escalate Handler (Community Admin -> Super Admin)
  const handleEscalateTicket = async () => {
    if (!selectedTicket) return;

    try {
      setEscalating(true);
      const res = await api.put(`/tickets/${selectedTicket.id}/escalate?callerUsername=${username}`, {
        reason: escalationReason || 'Escalated by Community Admin for higher-level platform resolution.'
      });
      setSelectedTicket(res.data);
      setShowEscalateModal(false);
      setEscalationReason('');
      await fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to escalate ticket');
    } finally {
      setEscalating(false);
    }
  };

  // Status Change Handler
  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const res = await api.put(`/tickets/${ticketId}/status?callerUsername=${username}`, {
        status: newStatus
      });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(res.data);
      }
      await fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update ticket status');
    }
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter(t => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OPEN') return t.status === 'OPEN' || t.status === 'IN_PROGRESS';
    if (statusFilter === 'ESCALATED') return t.escalatedToSuperAdmin || t.status === 'ESCALATED_TO_SUPER_ADMIN';
    if (statusFilter === 'RESOLVED') return t.status === 'RESOLVED' || t.status === 'CLOSED';
    return true;
  });

  const getStatusBadge = (ticket) => {
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</span>;
    }
    if (ticket.escalatedToSuperAdmin || ticket.status === 'ESCALATED_TO_SUPER_ADMIN') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 animate-pulse"><ShieldAlert className="w-3.5 h-3.5" /> Sent to Super Admin</span>;
    }
    if (ticket.status === 'IN_PROGRESS') {
      return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"><Clock className="w-3.5 h-3.5" /> In Progress</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30"><HelpCircle className="w-3.5 h-3.5" /> Open</span>;
  };

  const getPriorityBadge = (priority) => {
    const p = priority ? priority.toUpperCase() : 'MEDIUM';
    if (p === 'URGENT' || p === 'HIGH') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">High Priority</span>;
    }
    if (p === 'MEDIUM') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30">Medium</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30">Low</span>;
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-16 px-3 sm:px-6">
      
      {/* Header Banner - Fully Dynamic Light/Dark Theme Support */}
      <div className="bg-gradient-to-r from-sky-100/90 via-blue-50/90 to-indigo-100/90 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950 border border-sky-200/80 dark:border-blue-500/20 p-6 sm:p-8 rounded-3xl shadow-xl backdrop-blur-xl relative overflow-hidden flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="absolute -top-10 -right-10 w-80 h-80 bg-blue-500/10 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="z-10 max-w-2xl">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-600 dark:text-cyan-400" />
              Support & Resolution Center
            </h1>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600/10 text-blue-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-blue-600/20 dark:border-cyan-400/30">
              {isSuperAdmin ? 'Platform Super Admin' : isCommunityAdmin ? 'Community Admin' : 'Resident'}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-medium mb-4">
            {isResident && "Raise water, billing, or meter issues. Track live updates and get notified when your Community Admin responds."}
            {isCommunityAdmin && "Review resident issues, respond directly, resolve tickets, or forward complex cases to the Platform Super Admin."}
            {isSuperAdmin && "Manage system-wide escalated tickets and assist community administrators."}
          </p>

          {/* Raise Concern / Create Ticket Button (Hidden for Super Admin) */}
          {activeTab === 'tickets' && !isSuperAdmin && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white py-2.5 px-5 rounded-2xl font-extrabold text-xs inline-flex items-center gap-2.5 shadow-xl shadow-blue-500/30 border border-white/20 transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-white stroke-[3]" />
              </div>
              <span className="tracking-wide">{isResident ? 'Raise Concern' : 'Create Internal Ticket'}</span>
            </motion.button>
          )}
        </div>

        {/* Action Controls Group (Tabs only on Right Side) */}
        <div className="flex items-center gap-3 z-10 shrink-0">
          <div className="flex bg-surface-lighter/80 dark:bg-surface-lighter/40 p-1.5 rounded-2xl border border-primary/20 shadow-inner backdrop-blur-md">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'tickets' 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/30 scale-105' 
                  : 'text-text-muted hover:text-text hover:bg-surface-lighter/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Tickets ({tickets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'contacts' 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/30 scale-105' 
                  : 'text-text-muted hover:text-text hover:bg-surface-lighter/50'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Contacts</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'tickets' ? (
        /* Equal Height Grid Panels (min-h-[520px]) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT: Ticket Search & Filter List (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-surface/80 dark:bg-surface/40 backdrop-blur-xl border border-primary/20 rounded-3xl p-5 sm:p-6 shadow-xl min-h-[520px]">
            <div className="space-y-4">
              
              {/* Filter Bar */}
              <div className="flex items-center justify-between gap-1.5 bg-surface-lighter/60 dark:bg-surface-lighter/30 p-1.5 rounded-2xl border border-primary/10">
                {[
                  { id: 'ALL', label: 'ALL' },
                  { id: 'OPEN', label: 'OPEN' },
                  !isSuperAdmin && { id: 'ESCALATED', label: 'SENT TO ADMIN' },
                  { id: 'RESOLVED', label: 'RESOLVED' }
                ].filter(Boolean).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-extrabold transition-all uppercase tracking-wider ${
                      statusFilter === f.id 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'text-text-muted hover:text-primary dark:hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
                <button 
                  onClick={fetchTickets}
                  className="p-1.5 rounded-xl hover:bg-surface-lighter text-text-muted hover:text-text transition-colors" 
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
                </button>
              </div>

              {/* Ticket List Cards */}
              {loading && tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                  <span className="text-xs font-bold text-text-muted">Loading support tickets...</span>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <HelpCircle className="w-12 h-12 text-primary/40 mb-3" />
                  <p className="text-base font-extrabold text-text mb-1">No Tickets Found</p>
                  <p className="text-xs font-medium text-text-muted max-w-xs">
                    {statusFilter === 'ALL' 
                      ? 'No support tickets have been raised yet.' 
                      : `No tickets matching filter "${statusFilter}".`}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredTickets.map((ticket) => {
                    const isSelected = selectedTicket && selectedTicket.id === ticket.id;
                    const totalReplies = ticket.replies ? ticket.replies.length : 0;
                    const lastReadCount = readTicketCounts[ticket.id] || 0;
                    const unreadReplies = Math.max(0, totalReplies - lastReadCount);

                    return (
                      <motion.div
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          markTicketAsRead(ticket);
                        }}
                        whileHover={{ scale: 1.01 }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative shadow-sm ${
                          isSelected 
                            ? 'bg-primary/10 border-primary shadow-md shadow-primary/10 ring-1 ring-primary' 
                            : 'bg-surface/60 border-border hover:border-primary/50'
                        }`}
                      >
                        {ticket.escalatedToSuperAdmin && (
                          <div className="absolute top-0 right-0 w-2 h-full bg-purple-600 rounded-r-2xl" />
                        )}
                        
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-extrabold text-primary">#{ticket.ticketNumber}</span>
                            {ticket.screenshotUrl && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-0.5" title="Has Screenshot Attachment">
                                <Image className="w-2.5 h-2.5" />
                                Image
                              </span>
                            )}
                            {unreadReplies > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-bounce shadow-md shadow-rose-500/30 flex items-center gap-0.5" title={`${unreadReplies} new reply`}>
                                {unreadReplies} new
                              </span>
                            )}
                          </div>
                          {getStatusBadge(ticket)}
                        </div>

                        <h3 className="font-extrabold text-text text-sm line-clamp-1 mb-1">{ticket.title}</h3>
                        <p className="text-text-muted text-xs line-clamp-2 mb-3">{ticket.description}</p>

                        <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-border/50 pt-2.5">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span className="font-bold text-text">{ticket.createdByName}</span>
                            {ticket.houseNumber && <span className="text-text-muted">({ticket.houseNumber})</span>}
                          </div>
                          {getPriorityBadge(ticket.priority)}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="text-[11px] font-medium text-text-muted text-center border-t border-border/40 pt-3 flex items-center justify-center gap-1.5">
              <Clock className="w-3 h-3 text-primary" />
              <span>Total Active Records ({tickets.length}) • Support data automatically cleared after 15 days</span>
            </div>
          </div>

          {/* RIGHT: Selected Ticket Conversation Thread (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-surface/80 dark:bg-surface/40 backdrop-blur-xl border border-primary/20 rounded-3xl p-6 sm:p-7 shadow-xl min-h-[520px]">
            {selectedTicket ? (
              <div className="flex flex-col justify-between h-full">
                
                {/* Ticket Details Header */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400">#{selectedTicket.ticketNumber}</span>
                      </div>
                      <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{selectedTicket.title}</h2>
                    </div>

                    {/* Admin Actions Bar */}
                    <div className="flex items-center gap-2">
                      {/* Community Admin can Escalate to Super Admin */}
                      {isCommunityAdmin && !selectedTicket.escalatedToSuperAdmin && selectedTicket.status !== 'RESOLVED' && (
                        <button
                          onClick={() => setShowEscalateModal(true)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Send Issue to Super Admin</span>
                        </button>
                      )}

                      {/* Resolve Button */}
                      {selectedTicket.status !== 'RESOLVED' && (isCommunityAdmin || isSuperAdmin || selectedTicket.createdByEmail === username) && (
                        <button
                          onClick={() => handleUpdateStatus(selectedTicket.id, 'RESOLVED')}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Resolved</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-lighter/60 dark:bg-surface-lighter/30 p-3.5 rounded-2xl border border-primary/10 text-xs mb-5">
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-extrabold">Category</span>
                      <span className="font-extrabold text-text">{selectedTicket.category}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-extrabold">Raised By</span>
                      <span className="font-extrabold text-text">{selectedTicket.createdByName}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-extrabold">House / Block</span>
                      <span className="font-extrabold text-text">{selectedTicket.houseNumber || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-extrabold">Community</span>
                      <span className="font-extrabold text-text">{selectedTicket.colonyName || 'System'}</span>
                    </div>
                  </div>

                  {/* Initial Ticket Description */}
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl mb-5 shadow-sm space-y-3">
                    <div>
                      <span className="text-xs font-extrabold text-primary block mb-1">Issue Overview:</span>
                      <p className="text-sm text-text whitespace-pre-line leading-relaxed font-medium">{selectedTicket.description}</p>
                    </div>

                    {/* Screenshot attachment preview if available */}
                    {selectedTicket.screenshotUrl && (
                      <div className="border-t border-primary/15 pt-3">
                        <span className="text-xs font-extrabold text-text flex items-center gap-1.5 mb-2">
                          <Image className="w-3.5 h-3.5 text-primary" />
                          Attached Issue Screenshot:
                        </span>
                        <div className="relative group max-w-sm rounded-xl overflow-hidden border border-border bg-surface-lighter/80 shadow-md">
                          <img 
                            src={selectedTicket.screenshotUrl} 
                            alt="Issue Screenshot" 
                            className="w-full max-h-48 object-contain cursor-pointer transition-transform duration-300 group-hover:scale-105"
                            onClick={() => setPreviewImage(selectedTicket.screenshotUrl)}
                          />
                          <div className="absolute inset-0 bg-surface/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-xs font-bold text-text bg-surface px-2.5 py-1 rounded-lg border border-border">Click to Enlarge</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reply Conversation Feed */}
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 mb-4 custom-scrollbar">
                    <div className="text-center my-2">
                      <span className="text-[10px] uppercase tracking-widest font-extrabold text-text-muted bg-surface-lighter/80 border border-border px-3 py-1 rounded-full">
                        Discussion Thread ({selectedTicket.replies?.length || 0})
                      </span>
                    </div>

                    {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                      selectedTicket.replies.map((reply, idx) => {
                        const isSystem = reply.message.startsWith('⚠️ TICKET ESCALATED');
                        // Robust "isMe" check: match username, email, or role origin
                        const cleanUsername = (username || '').toLowerCase();
                        const isMe = Boolean(
                          (reply.senderEmail && reply.senderEmail.toLowerCase() === cleanUsername) ||
                          (reply.senderName && reply.senderName.toLowerCase() === cleanUsername) ||
                          (reply.senderRole === role)
                        );
                        
                        if (isSystem) {
                          return (
                            <div key={idx} className="bg-purple-500/15 border border-purple-500/30 p-3.5 rounded-2xl text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5 font-medium shadow-sm">
                              <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-extrabold block mb-0.5">{reply.senderName} (Community Manager)</span>
                                <span>{reply.message}</span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                          >
                            <div className={`flex items-center gap-2 mb-1 text-[11px] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">{isMe ? 'You' : reply.senderName}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                                {reply.senderRole === 'ROLE_SUPER_ADMIN' || reply.senderRole === 'ROLE_ADMIN' ? 'Platform Admin' : reply.senderRole === 'ROLE_COMMUNITY_ADMIN' ? 'Community Admin' : 'Resident'}
                              </span>
                            </div>
                            <div className={`p-3.5 rounded-2xl text-xs leading-relaxed font-medium shadow-sm ${
                              isMe 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none shadow-blue-500/20' 
                                : 'bg-surface-lighter/90 dark:bg-surface-lighter/60 border border-primary/20 text-text rounded-tl-none'
                            }`}>
                              {reply.message}
                            </div>
                            <span className="text-[10px] font-bold text-text-muted mt-1">
                              {reply.createdAt ? new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-xs font-bold text-slate-400 py-4">No responses yet. Write a message below to start the thread.</p>
                    )}
                  </div>
                </div>

                {/* Reply Input Form */}
                <form onSubmit={handleSendReply} className="border-t border-slate-200 dark:border-slate-800 pt-4 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response or update..."
                    className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/25 disabled:opacity-50 transition-all"
                  >
                    {submittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Reply</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center flex flex-col items-center justify-center h-full my-auto py-16">
                <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-extrabold text-text mb-1">Select a Ticket to View</h3>
                <p className="text-xs font-medium text-text-muted max-w-sm">
                  Click any ticket from the list on the left to read issue details, view attached screenshots, or send replies.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* EXACT ORIGINAL ANIMATED NEOBRUTAL CARDS SUPPORT SYSTEM */
        <div className="w-full">
          {contactsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl text-center">
              <p className="text-slate-500 dark:text-slate-400">No support contacts found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
              {contacts.map((contact, index) => {
                const isDev = contact.role === 'DEVELOPER';
                const isAdmin = contact.role === 'ROLE_ADMIN' || contact.role === 'ROLE_SUPER_ADMIN';
                
                const cardStyle = {
                  '--primary': isDev ? '#b829e0' : isAdmin ? '#ff3e00' : '#4d61ff',
                  '--secondary': isDev ? '#8b5cf6' : isAdmin ? '#ef4444' : '#3b82f6',
                  '--secondary-hover': isDev ? '#7c3aed' : isAdmin ? '#dc2626' : '#2563eb',
                };

                const desc = isDev
                  ? 'Award-winning developer crafting and maintaining the technical architecture and features of AquaTrack.'
                  : isAdmin
                  ? 'Platform administrator managing overall system rules, tariffs, and high-level notifications.'
                  : 'Community manager coordinating local block tasks, approvals, and resident support.';

                const roleLabel = isDev ? 'Developer' : isAdmin ? 'System Admin' : 'Community Admin';
                const locationText = contact.role === 'ROLE_ADMIN' || contact.role === 'ROLE_SUPER_ADMIN'
                  ? 'Central Headquarters'
                  : `${contact.apartmentBlock || 'Block A'}${contact.colonyName ? ', ' + contact.colonyName : ''}`;

                return (
                  <motion.div
                    key={contact.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="neobrutal-card max-w-[340px] md:max-w-none w-full"
                    style={cardStyle}
                  >
                    <div className="card-pattern-grid"></div>
                    <div className="card-overlay-dots"></div>

                    <div className="bold-pattern">
                      <svg viewBox="0 0 100 100">
                        <path
                          strokeDasharray="15 10"
                          strokeWidth="10"
                          stroke="currentColor"
                          className="text-text"
                          fill="none"
                          d="M0,0 L100,0 L100,100 L0,100 Z"
                        ></path>
                      </svg>
                    </div>

                    <div className="card-title-area">
                      <span className="font-extrabold pr-2 truncate flex-1">
                        {contact.fullName ? `${contact.fullName} (${contact.username})` : contact.username}
                      </span>
                      <span className="card-tag">{roleLabel}</span>
                    </div>

                    <div className="card-body">
                      <div className="card-description">
                        {desc}
                      </div>

                      <div className="feature-grid">
                        <div className="feature-item">
                          <div className="feature-icon">
                            <svg viewBox="0 0 24 24">
                              <path d="M20,4C21.1,4 22,4.9 22,6V18C22,19.1 21.1,20 20,20H4C2.9,20 2,19.1 2,18V6C2,4.9 2.9,4 4,4H20M4,6V18H20V6H4M6,9H18V11H6V9M6,13H16V15H6V13Z"></path>
                            </svg>
                          </div>
                          <span className="feature-text select-all">{contact.email}</span>
                        </div>

                        {(contact.mobileNumber || contact.whatsAppNumber) && (
                          <div className="feature-item">
                            <div className="feature-icon">
                              <svg viewBox="0 0 24 24">
                                <path d="M6.62,10.79C8.06,13.62 10.38,15.93 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"></path>
                              </svg>
                            </div>
                            <span className="feature-text select-all">
                              {contact.mobileNumber ? `Mob: ${contact.mobileNumber}` : ''}
                              {contact.whatsAppNumber && contact.whatsAppNumber !== contact.mobileNumber ? ` | WA: ${contact.whatsAppNumber}` : ''}
                            </span>
                          </div>
                        )}

                        <div className="feature-item">
                          <div className="feature-icon">
                            <svg viewBox="0 0 24 24">
                              <path d="M12,17.56L16.07,16.43L16.62,10.33H9.38L9.2,8.3H16.8L17,6.31H7L7.56,12.32H14.45L14.22,14.9L12,15.5L9.78,14.9L9.64,13.24H7.64L7.93,16.43L12,17.56M4.07,3H19.93L18.5,19.2L12,21L5.5,19.2L4.07,3Z"></path>
                            </svg>
                          </div>
                          <span className="feature-text">{locationText}</span>
                        </div>

                        <div className="feature-item">
                          <div className="feature-icon">
                            <svg viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
                            </svg>
                          </div>
                          <span className="feature-text">Availability: {isDev ? '24/7 Support' : 'Mon-Fri 9AM-6PM'}</span>
                        </div>
                      </div>

                      <div className="card-actions">
                        <div className="price">
                          Active
                          <span className="price-period">Support Channel</span>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleMailTo(contact.email)} 
                            className="card-button"
                          >
                            Email
                          </button>
                          
                          {(contact.whatsAppNumber || contact.mobileNumber) && (
                            <a
                              href={`https://wa.me/${(() => {
                                const raw = contact.whatsAppNumber || contact.mobileNumber || '';
                                let cleaned = raw.replace(/\D/g, '');
                                if (cleaned.length === 10) {
                                  cleaned = '91' + cleaned;
                                }
                                return cleaned.replace(/^0+/, '');
                              })()}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="card-button flex items-center justify-center gap-1.5 bg-[#25D366] text-white border-[#25D366] hover:bg-[#20ba5a] hover:text-white"
                              style={{ '--secondary': '#25D366', '--secondary-hover': '#20ba5a' }}
                            >
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.488 1.459 5.407 1.461 5.563 0 10.09-4.519 10.093-10.078a10.022 10.022 0 00-2.952-7.133 10.022 10.022 0 00-7.143-2.95c-5.567 0-10.094 4.52-10.098 10.079-.001 1.916.499 3.794 1.448 5.402L5.436 20.31l1.21-.356zM17.11 14.18c-.28-.14-1.654-.816-1.91-.908-.255-.092-.44-.14-.624.14-.184.28-.71.908-.87 1.092-.158.184-.317.208-.597.068-.28-.14-1.182-.435-2.251-1.39-1.378-1.23-1.644-2.856-1.727-3.003-.083-.14-.009-.216.061-.285.063-.063.14-.163.21-.244.07-.08.093-.135.14-.227.046-.093.023-.173-.011-.243-.035-.07-.624-1.503-.855-2.058-.225-.542-.472-.468-.624-.476l-.532-.007c-.183 0-.482.068-.734.34-.252.272-.962.94-.962 2.294 0 1.353.984 2.66 1.122 2.845.138.184 1.937 2.956 4.693 4.146.655.283 1.168.452 1.567.579.66.21 1.258.18 1.733.11.53-.08 1.654-.676 1.888-1.33.234-.654.234-1.216.164-1.33-.07-.11-.256-.18-.536-.32z"/>
                              </svg>
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="dots-pattern">
                      <svg viewBox="0 0 80 40">
                        <circle fill="currentColor" className="text-text" r="3" cy="10" cx="10"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="10" cx="30"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="10" cx="50"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="10" cx="70"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="20" cx="20"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="20" cx="40"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="20" cx="60"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="30" cx="10"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="30" cx="30"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="30" cx="50"></circle>
                        <circle fill="currentColor" className="text-text" r="3" cy="30" cx="70"></circle>
                      </svg>
                    </div>

                    <div className="accent-shape"></div>
                    <div className="corner-slice"></div>

                    <div className="stamp">
                      <span className="stamp-text">Active</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowCreateModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                {isResident ? 'Raise Support Concern' : 'Create Admin Ticket'}
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
                {isResident 
                  ? 'Submit your concern directly to your Community Manager.' 
                  : 'Submit a ticket directly to the Platform Super Admin.'}
              </p>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Issue Title / Summary *</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.title}
                    onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                    placeholder="e.g. Water log discrepancy for July / Meter leak"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Category</label>
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value="BILLING">Water Billing Discrepancy</option>
                      <option value="METER_FAULT">Meter Hardware Fault</option>
                      <option value="LEAKAGE">Water Leakage Report</option>
                      <option value="TANKER_PURCHASE">Bulk Tanker Purchase Issue</option>
                      <option value="TARIFF_PLAN">Tariff Setup Inquiry</option>
                      <option value="SYSTEM_BUG">Platform Bug</option>
                      <option value="OTHER">General Query</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Priority</label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-medium"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent / Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Detailed Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    placeholder="Provide exact details, dates, or meter values regarding your issue..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Attach Screenshot (Optional)</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                      <Image className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                      <span>{ticketForm.screenshotUrl ? 'Change Screenshot' : 'Upload Image / Screenshot'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="hidden" 
                      />
                    </label>
                    {ticketForm.screenshotUrl && (
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-blue-500 shrink-0">
                        <img src={ticketForm.screenshotUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setTicketForm(prev => ({ ...prev, screenshotUrl: '' }))}
                          className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTicket}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-500/25"
                  >
                    {creatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>Submit Ticket</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ESCALATE TO SUPER ADMIN MODAL */}
      <AnimatePresence>
        {showEscalateModal && selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-purple-500/40 rounded-3xl p-7 sm:p-9 max-w-2xl w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowEscalateModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-600 shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Send Issue to Super Admin</h2>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold">Ticket #{selectedTicket.ticketNumber}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-5 leading-relaxed font-medium">
                If this resident issue requires system-level authority or platform technical support, submitting it here will forward the entire ticket history directly to the <strong className="text-slate-900 dark:text-slate-100">Platform Super Admin</strong> team for action.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">Note for Super Admin *</label>
                  <textarea
                    rows={5}
                    value={escalationReason}
                    onChange={(e) => setEscalationReason(e.target.value)}
                    placeholder="Provide details for the Super Admin (e.g., database recount required, platform policy exception needed...)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl p-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-600 font-medium leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowEscalateModal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEscalateTicket}
                    disabled={escalating}
                    className="px-6 py-3 rounded-2xl font-extrabold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-500/25 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {escalating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                    <span>Send Issue to Super Admin</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMAGE ENLARGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {previewImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] p-2 bg-surface/90 border border-primary/30 rounded-3xl shadow-2xl overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors shadow-lg"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <img 
                src={previewImage} 
                alt="Enlarged Attachment" 
                className="w-full h-full max-h-[85vh] object-contain rounded-2xl"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
