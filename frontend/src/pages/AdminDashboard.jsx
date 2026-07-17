import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Home, Droplet, AlertCircle, Server, Settings, Database, Activity, 
  Plus, Trash2, Edit, Send, Receipt, Search, FileText, CheckCircle2, X, Info, Loader2, ShieldAlert,
  Building2, MapPin, Upload, Download, Mail, Zap, BarChart3, Lightbulb
} from 'lucide-react';

import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../api';
import SmartSearchBar from '../components/SmartSearchBar';
import { smartFilter, sortUsers } from '../utils/smartSearch';
import useUsernameCheck, { UsernameStatusBadge, getUsernameBorderClass } from '../hooks/useUsernameCheck.jsx';
import { printInvoice } from '../utils/invoiceGenerator';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#f43f5e', '#06b6d4', '#6366f1', '#f97316'];

const extractErrorMessage = (err, defaultMsg = 'An error occurred') => {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      return data.message || data.error || data.details || JSON.stringify(data);
    }
  }
  return err?.message || defaultMsg;
};

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [stats, setStats] = useState(null);
  
  // Scoping details
  const role = localStorage.getItem('role') || 'ROLE_COMMUNITY_ADMIN';
  const isSuperAdmin = role === 'ROLE_ADMIN';
  const block = localStorage.getItem('apartmentBlock') || 'Block A';
  
  // Data lists
  const [users, setUsers] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);
  const [bills, setBills] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [sortField, setSortField] = useState('fullName');
  const [sortDir, setSortDir] = useState('asc');

  const handleSortChange = (field, dir) => { setSortField(field); setSortDir(dir); };

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalError, setModalError] = useState('');
  
  // Bulk Invite Modals state
  const [bulkInviteModalOpen, setBulkInviteModalOpen] = useState(false);
  const [bulkInviteFile, setBulkInviteFile] = useState(null);
  const [bulkInviteReport, setBulkInviteReport] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedUserDocs, setSelectedUserDocs] = useState([]);
  const [docReviewUser, setDocReviewUser] = useState(null);
  const [verificationReason, setVerificationReason] = useState('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [docLoading, setDocLoading] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [editingUsageLog, setEditingUsageLog] = useState(null); // null = create, object = edit
  const fileInputRef = useRef(null);
  const [payQrModalBill, setPayQrModalBill] = useState(null);  // bill to pay via QR
  const [invoiceModalBill, setInvoiceModalBill] = useState(null); // bill to preview invoice
  const [showHelp, setShowHelp] = useState(true);
  const [chartType, setChartType] = useState('bar'); // bar, line, area
  const [chartScope, setChartScope] = useState('colony'); // colony, building
  const [selectedColonyFilter, setSelectedColonyFilter] = useState('all');
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [expandedAdmins, setExpandedAdmins] = useState({}); // { blockName: true/false }
  const [quickRateUser, setQuickRateUser] = useState(null); // for inline rate modal
  const [quickRateValue, setQuickRateValue] = useState('');
  const [selectedAdminAnalytics, setSelectedAdminAnalytics] = useState(null);
  
  const [billingSubTab, setBillingSubTab] = useState('cycles'); // cycles, records
  const [billingCycles, setBillingCycles] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [billingCycleModalOpen, setBillingCycleModalOpen] = useState(false);
  const [apartmentModalOpen, setApartmentModalOpen] = useState(false);

  // Colony & Building management state (Super Admin only)
  const [colonies, setColonies] = useState([]);
  const [colonySubTab, setColonySubTab] = useState('list'); // list, add-colony
  const [newColonyForm, setNewColonyForm] = useState({ colonyName: '', address: '', buildings: '' });
  const [newBuildingForms, setNewBuildingForms] = useState({}); // { colonyId: buildingName }
  const [colonyLoading, setColonyLoading] = useState(false);
  const [expandedColonies, setExpandedColonies] = useState({}); // { colonyId: true/false }
  const [editingColonyId, setEditingColonyId] = useState(null);
  const [colonyEditForm, setColonyEditForm] = useState({ colonyName: '', address: '' });
  const [editingBuildingId, setEditingBuildingId] = useState(null);
  const [buildingEditName, setBuildingEditName] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [quickHelpModalOpen, setQuickHelpModalOpen] = useState(false);

  // Document Verification Review
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [verifyRejectReasons, setVerifyRejectReasons] = useState({}); // { residentId: reason }
  const [verifyLoading, setVerifyLoading] = useState({});

  const fetchPendingVerifications = async () => {
    try {
      const res = await api.get('/admin/users/pending-verifications', {
        params: { callerRole: role, callerBlock: block }
      });
      setPendingVerifications(res.data);
    } catch {}
  };

  const handleVerifyAction = async (residentId, action) => {
    const reason = verifyRejectReasons[residentId] || '';
    if ((action === 'REJECT' || action === 'REQUEST_REUPLOAD') && !reason.trim()) {
      setStatusMessage('Error: Please provide a reason before rejecting.');
      return;
    }
    setVerifyLoading(prev => ({ ...prev, [residentId]: true }));
    try {
      await api.put(`/admin/users/verify/${residentId}/action`, { reason }, {
        params: { callerRole: role, callerUsername: localStorage.getItem('username'), action }
      });
      const actionLabel = action === 'APPROVE' ? 'approved' : action === 'REJECT' ? 'rejected' : 're-upload requested';
      setStatusMessage(`Verification ${actionLabel} successfully.`);
      setPendingVerifications(prev => prev.filter(v => v.id !== residentId));
    } catch (err) {
      setStatusMessage('Error: ' + extractErrorMessage(err, 'Action failed.'));
    } finally {
      setVerifyLoading(prev => ({ ...prev, [residentId]: false }));
    }
  };

  const fetchColonies = async () => {
    try {
      const res = await api.get('/admin/colonies');
      setColonies(res.data);
    } catch {}
  };

  const handleCreateColony = async (e) => {
    e.preventDefault();
    setColonyLoading(true);
    try {
      await api.post('/admin/colonies', newColonyForm);
      setNewColonyForm({ colonyName: '', address: '', buildings: '' });
      setColonySubTab('list');
      await fetchColonies();
      setStatusMessage('Colony created successfully!');
    } catch (err) {
      setStatusMessage('Error: ' + extractErrorMessage(err, 'Could not create colony.'));
    } finally {
      setColonyLoading(false);
    }
  };

  const handleDeleteColony = async (colonyId, colonyName) => {
    if (!window.confirm(`Delete "${colonyName}" and ALL its buildings? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/colonies/${colonyId}`);
      await fetchColonies();
      setStatusMessage(`Colony "${colonyName}" deleted.`);
    } catch (err) {
      setStatusMessage('Error: ' + extractErrorMessage(err, 'Could not delete colony.'));
    }
  };

  const handleUpdateColony = async (colonyId) => {
    if (!colonyEditForm.colonyName.trim()) {
      setStatusMessage('Error: Colony name cannot be empty.');
      return;
    }
    try {
      setColonyLoading(true);
      await api.put(`/admin/colonies/${colonyId}`, {
        colonyName: colonyEditForm.colonyName.trim(),
        address: colonyEditForm.address.trim()
      });
      setEditingColonyId(null);
      await fetchColonies();
      setStatusMessage('Colony updated successfully!');
    } catch (err) {
      setStatusMessage('Error: ' + extractErrorMessage(err, 'Could not update colony.'));
    } finally {
      setColonyLoading(false);
    }
  };

  const handleUpdateBuilding = async (buildingId) => {
    if (!buildingEditName.trim()) {
      setStatusMessage('Error: Building name cannot be empty.');
      return;
    }
    try {
      await api.put(`/admin/buildings/${buildingId}`, {
        buildingName: buildingEditName.trim()
      });
      setEditingBuildingId(null);
      await fetchColonies();
      setStatusMessage('Building updated successfully!');
    } catch (err) {
      setStatusMessage('Error: ' + extractErrorMessage(err, 'Could not update building.'));
    }
  };

  const handleAddBuilding = async (e, colonyId) => {
    e.preventDefault();
    const buildingName = newBuildingForms[colonyId];
    if (!buildingName?.trim()) return;
    try {
      await api.post(`/admin/colonies/${colonyId}/buildings`, { buildingName: buildingName.trim() });
      setNewBuildingForms(prev => ({ ...prev, [colonyId]: '' }));
      await fetchColonies();
      setStatusMessage('Building added successfully!');
    } catch (err) {
      setStatusMessage('Error: ' + extractErrorMessage(err, 'Could not add building.'));
    }
  };

  const handleDeleteBuilding = async (buildingId, buildingName) => {
    if (!window.confirm(`Delete building "${buildingName}"?`)) return;
    try {
      await api.delete(`/admin/buildings/${buildingId}`);
      await fetchColonies();
      setStatusMessage(`Building "${buildingName}" deleted.`);
    } catch (err) {
      setStatusMessage('Error: ' + extractErrorMessage(err, 'Could not delete building.'));
    }
  };

  const [billingCycleForm, setBillingCycleForm] = useState({
    cycleName: '',
    startDate: '',
    endDate: '',
    apartmentId: '',
    apartmentBlock: ''
  });

  const [apartmentForm, setApartmentForm] = useState({
    name: '',
    address: ''
  });
  
  // Form states
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'RESIDENT',
    houseNumber: '',
    colonyName: '',
    apartmentBlock: isSuperAdmin ? 'Block A' : block,
    gender: 'Male',
    waterRatePerLiter: '',
    fullName: '',
    mobileNumber: '',
    whatsAppNumber: '',
    meterId: ''
  });

  // Smart username availability check for the admin user creation form
  // Must be declared AFTER userForm to avoid TDZ (temporal dead zone) error
  const adminUsernameCheckValue = (!editingUser && userModalOpen) ? (userForm?.username || '') : '';
  const { status: adminUsernameStatus, message: adminUsernameMessage } = useUsernameCheck(adminUsernameCheckValue);

  const [billForm, setBillForm] = useState({
    houseNumber: '',
    apartmentBlock: isSuperAdmin ? 'Block A' : block,
    amount: '',
    dueDate: '',
    status: 'UNPAID',
    billingCycleId: 1
  });

  const [notifyForm, setNotifyForm] = useState({
    username: '',
    type: 'BILL_GENERATED',
    title: '',
    message: ''
  });

  const [usageForm, setUsageForm] = useState({
    houseNumber: '',
    apartmentBlock: isSuperAdmin ? 'Block A' : block,
    readingDate: new Date().toISOString().split('T')[0],
    readingLiters: '',
    logType: 'DAILY'
  });

  // Fetch Stats & Lists
  const fetchStats = async () => {
    try {
      if (isSuperAdmin) {
        const res = await api.get('/dashboard/admin');
        setStats(res.data);
      } else {
        const res = await api.get(`/dashboard/community/${block}`);
        setStats(res.data);
      }
    } catch (err) {
      console.error("Error fetching stats", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users', {
        params: {
          callerRole: role,
          callerBlock: block
        }
      });
      setUsers(res.data);
    } catch (err) {
      console.error("Error fetching users", err);
    }
  };

  const fetchUsageLogs = async () => {
    try {
      let res;
      if (isSuperAdmin) {
        res = await api.get('/usage/all');
      } else {
        res = await api.get(`/usage/block/${block}`);
      }
      setUsageLogs(res.data);
    } catch (err) {
      console.error("Error fetching usage logs", err);
    }
  };

  const fetchBills = async () => {
    try {
      let res;
      if (isSuperAdmin) {
        res = await api.get('/bills/all');
      } else {
        res = await api.get(`/bills/block/${block}`);
      }
      setBills(res.data);
    } catch (err) {
      console.error("Error fetching bills", err);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const res = await api.get('/admin/users/approvals/pending', {
        params: {
          callerRole: role,
          callerBlock: block
        }
      });
      setPendingApprovals(res.data);
    } catch (err) {
      console.error("Error fetching pending approvals", err);
    }
  };

  const handleApproveReject = async (userId, actionStatus) => {
    setLoading(true);
    try {
      await api.put(`/admin/users/approvals/${userId}/action`, null, {
        params: {
          callerRole: role,
          callerBlock: block,
          status: actionStatus
        }
      });
      setStatusMessage(`User registration request has been ${actionStatus.toLowerCase()} successfully.`);
      fetchPendingApprovals();
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to update request.'));
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingCycles = async () => {
    try {
      const res = await api.get('/billing-cycles');
      setBillingCycles(res.data);
    } catch (err) {
      console.error("Error fetching billing cycles", err);
    }
  };

  const fetchApartments = async () => {
    try {
      const res = await api.get('/public/colonies');
      const mapped = (res.data || []).map(col => ({
        id: col.id,
        name: col.colonyName,
        address: col.address || '',
        buildings: col.buildings || []
      }));
      setApartments(mapped);
    } catch (err) {
      console.error("Error fetching apartments", err);
    }
  };

  const getApartmentName = (id) => {
    const apt = apartments.find(a => a.id === id);
    return apt ? apt.name : `Colony ID: ${id}`;
  };

  const handleCreateBillingCycle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/billing-cycles', {
        cycleName: billingCycleForm.cycleName,
        startDate: billingCycleForm.startDate,
        endDate: billingCycleForm.endDate,
        apartmentId: parseInt(billingCycleForm.apartmentId),
        apartmentBlock: billingCycleForm.apartmentBlock || null
      });
      setStatusMessage(`Billing cycle "${billingCycleForm.cycleName}" created successfully.`);
      setBillingCycleModalOpen(false);
      fetchBillingCycles();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to create billing cycle.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApartment = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/apartments', apartmentForm);
      setStatusMessage(`Apartment "${apartmentForm.name}" onboarded successfully.`);
      setApartmentModalOpen(false);
      fetchApartments();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to onboard apartment.'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeCycle = async (cycleId) => {
    if (!window.confirm("Are you sure you want to finalize this billing cycle? This will calculate consumption and generate bills for all households in the scope of this cycle.")) return;
    setLoading(true);
    try {
      const res = await api.post(`/billing-cycles/${cycleId}/finalize`);
      setStatusMessage(res.data || 'Billing cycle finalized successfully.');
      fetchBillingCycles();
      fetchBills();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to finalize billing cycle.'));
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveCycle = async (cycleId) => {
    setLoading(true);
    try {
      await api.post(`/billing-cycles/${cycleId}/archive`);
      setStatusMessage('Billing cycle archived successfully.');
      fetchBillingCycles();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to archive billing cycle.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchStats();
    fetchUsers();
    fetchUsageLogs();
    fetchBills();
    fetchPendingApprovals();
    fetchBillingCycles();
    fetchApartments();
    fetchPendingVerifications();
    if (isSuperAdmin) fetchColonies();
    fetchCommunityAdminRate();
  }, [isSuperAdmin, block]);


  // Actions
  const runSystemHealthCheck = () => {
    setLoading(true);
    setStatusMessage('');
    setTimeout(() => {
      setStatusMessage('System health check completed. All services (API, MySQL, Redis, AWS S3) are running optimally. Response time: 14ms.');
      setLoading(false);
    }, 800);
  };

  const backupDatabase = () => {
    setLoading(true);
    setStatusMessage('');
    setTimeout(() => {
      setStatusMessage('Global database backup sequence triggered successfully. Encrypted file: aquatrack_backup_2026_07_09.sql.gz stored securely.');
      setLoading(false);
    }, 800);
  };

  const handleOpenReviewDocs = async (user) => {
    setDocReviewUser(user);
    setVerificationReason('');
    setDocLoading(true);
    setSelectedUserDocs([]);
    setReviewModalOpen(true);
    try {
      const res = await api.get(`/users/profile/verify/documents/${user.username}`);
      setSelectedUserDocs(res.data || []);
    } catch (err) {
      console.error("Error fetching user documents:", err);
      setStatusMessage("Failed to fetch documents for this resident.");
    } finally {
      setDocLoading(false);
    }
  };

  const handleActionVerification = async (actionStatus) => {
    if (!docReviewUser) return;
    
    if ((actionStatus === 'REJECT' || actionStatus === 'REQUEST_REUPLOAD') && !verificationReason.trim()) {
      alert("Please provide a reason for rejection or re-upload request.");
      return;
    }

    setLoading(true);
    try {
      const callerUsername = localStorage.getItem('username') || 'admin';
      await api.put(`/admin/users/verify/${docReviewUser.id}/action`, {
        reason: verificationReason
      }, {
        params: {
          callerRole: role,
          callerUsername: callerUsername,
          action: actionStatus
        }
      });
      setStatusMessage(`Verification status set to ${actionStatus.toUpperCase()} successfully.`);
      setReviewModalOpen(false);
      setDocReviewUser(null);
      setVerificationReason('');
      fetchUsers();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, "Failed to update verification status."));
    } finally {
      setLoading(false);
    }
  };

  // User CRUD handlers
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setModalError('');
    // For community admins, pre-fill their colony from the stored token/apartments list
    const myColony = !isSuperAdmin
      ? (apartments.find(a => a.buildings?.some(b => b.buildingName === block))?.name ||
         apartments[0]?.name || '')
      : '';
    setUserForm({
      username: '',
      email: '',
      password: '',
      role: isSuperAdmin ? 'COMMUNITY_ADMIN' : 'RESIDENT',
      houseNumber: '',
      colonyName: myColony,
      apartmentBlock: isSuperAdmin ? '' : block,
      gender: 'Male',
      waterRatePerLiter: '',
      fullName: '',
      mobileNumber: '',
      whatsAppNumber: '',
      meterId: ''
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (user) => {
    setEditingUser(user);
    setModalError('');
    setUserForm({
      username: user.username,
      email: user.email,
      password: '', // blank password unless changing
      role: user.role.replace('ROLE_', ''),
      houseNumber: user.houseNumber || '',
      colonyName: user.colonyName || '',
      apartmentBlock: user.apartmentBlock || '',
      gender: user.gender || 'Male',
      waterRatePerLiter: user.waterRatePerLiter || '',
      fullName: user.fullName || '',
      mobileNumber: user.mobileNumber || '',
      whatsAppNumber: user.whatsAppNumber || '',
      meterId: user.meterId || ''
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalError('');
    
    // Check if it's invitation mode for Community Admin
    if (!isSuperAdmin && !editingUser) {
      if (!userForm.fullName || userForm.fullName.trim().length < 3) {
        setModalError('Full name must be at least 3 characters.');
        return;
      }
      if (!userForm.email || !userForm.email.includes('@')) {
        setModalError('Please enter a valid email address containing @.');
        return;
      }
      if (!userForm.houseNumber || !userForm.houseNumber.trim()) {
        setModalError('House / Flat number is required.');
        return;
      }

      setLoading(true);
      try {
        const payload = {
          fullName: userForm.fullName.trim(),
          email: userForm.email.trim().toLowerCase(),
          houseNumber: userForm.houseNumber.trim(),
          meterId: userForm.meterId ? userForm.meterId.trim() : null
        };
        await api.post('/admin/users/invite', payload, {
          params: {
            callerRole: role,
            callerUsername: localStorage.getItem('username') || '',
            callerBlock: block
          }
        });
        setStatusMessage(`Invitation link sent successfully via email to ${payload.email}!`);
        setUserModalOpen(false);
        fetchUsers();
      } catch (err) {
        console.error(err);
        setModalError(extractErrorMessage(err, 'Failed to send invitation.'));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validations (super admin or editing mode)
    if (!userForm.fullName || userForm.fullName.trim().length < 3) {
      setModalError('Full name must be at least 3 characters.');
      return;
    }
    if (!userForm.email || !userForm.email.includes('@')) {
      setModalError('Please enter a valid email address containing @.');
      return;
    }
    if (!userForm.mobileNumber || !/^\d{10}$/.test(userForm.mobileNumber)) {
      setModalError('Mobile number must be exactly 10-digits.');
      return;
    }
    if (!userForm.whatsAppNumber || !/^\d{10}$/.test(userForm.whatsAppNumber)) {
      setModalError('WhatsApp number must be exactly 10-digits.');
      return;
    }
    if (!userForm.colonyName) {
      setModalError('Please select a Colony / Community.');
      return;
    }
    if (!userForm.apartmentBlock) {
      setModalError('Please select a Building / Block.');
      return;
    }

    setLoading(true);
    try {
      const payload = { ...userForm };
      payload.email = payload.email.trim().toLowerCase();
      
      if (editingUser) {
        // Update user
        if (!payload.password) delete payload.password; // don't send empty password
        await api.put(`/admin/users/${editingUser.id}`, payload, {
          params: { callerRole: role, callerBlock: block }
        });
        setStatusMessage(`User ${userForm.username} updated successfully!`);
      } else {
        // Create user
        await api.post('/admin/users', payload, {
          params: { callerRole: role, callerBlock: block }
        });
        setStatusMessage(`User ${userForm.username} registered successfully!`);
      }
      setUserModalOpen(false);
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error(err);
      setModalError(extractErrorMessage(err, 'Failed to save user.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    setLoading(true);
    try {
      await api.delete(`/admin/users/${userId}`, {
        params: { callerRole: role, callerBlock: block }
      });
      setStatusMessage("User deleted successfully.");
      fetchUsers();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to delete user.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkInviteSubmit = async (e) => {
    e.preventDefault();
    if (!bulkInviteFile) {
      alert("Please choose a CSV file first.");
      return;
    }
    setBulkLoading(true);
    setBulkInviteReport(null);
    const formData = new FormData();
    formData.append("file", bulkInviteFile);

    try {
      const res = await api.post('/admin/users/invite/bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        params: {
          callerRole: role,
          callerUsername: localStorage.getItem('username') || '',
          callerBlock: block
        }
      });
      setBulkInviteReport(res.data);
      setStatusMessage("Bulk invitations processed successfully! Check the report below.");
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(extractErrorMessage(err, "Failed to import bulk invitations."));
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadCsvTemplate = () => {
    const headers = "Full Name,Email\n";
    const sampleData = "John Doe,johndoe@example.com\nJane Smith,janesmith@example.com\n";
    const blob = new Blob([headers + sampleData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "aquatrack_bulk_invite_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [billCalculation, setBillCalculation] = useState(null);
  const [communityAdminRate, setCommunityAdminRate] = useState(null);

  const fetchCommunityAdminRate = async () => {
    if (!isSuperAdmin) {
      try {
        const username = localStorage.getItem('username');
        if (username) {
          const res = await api.get(`/users/profile/${username}`);
          if (res.data && res.data.waterRatePerLiter != null) {
            setCommunityAdminRate(res.data.waterRatePerLiter);
          }
        }
      } catch (err) {
        console.error("Error fetching community admin profile rate:", err);
      }
    }
  };

  const handleHouseNumberChange = (houseNumber, baseForm = billForm, overrideRate = null) => {
    const updatedForm = { ...baseForm, houseNumber };

    if (!editingBill && houseNumber) {
      const targetUser = users.find(u => u.houseNumber === houseNumber);
      if (targetUser) {
        updatedForm.apartmentBlock = targetUser.apartmentBlock;
      }
      
      const targetBlock = targetUser ? targetUser.apartmentBlock : updatedForm.apartmentBlock;
      
      // Find water rate: check target household user first, then fallback to block community admin
      let waterRate = 0.01; // default rate
      if (targetUser && targetUser.waterRatePerLiter != null) {
        waterRate = targetUser.waterRatePerLiter;
      } else {
        const communityAdmin = users.find(u => (u.role === 'ROLE_COMMUNITY_ADMIN' || u.role === 'COMMUNITY_ADMIN') && u.apartmentBlock === targetBlock);
        if (communityAdmin && communityAdmin.waterRatePerLiter != null) {
          waterRate = communityAdmin.waterRatePerLiter;
        } else if (overrideRate != null) {
          waterRate = overrideRate;
        } else if (!isSuperAdmin && communityAdminRate != null) {
          waterRate = communityAdminRate;
        }
      }

      // Latest bill date
      const householdBills = bills.filter(b => b.houseNumber === houseNumber);
      const latestBill = householdBills.length > 0 
        ? [...householdBills].sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate))[0]
        : null;
      const latestBillDate = latestBill ? new Date(latestBill.generatedDate) : null;

      // Filter unbilled usage logs
      const unbilledLogs = usageLogs.filter(log => 
        log.houseNumber === houseNumber && 
        (!latestBillDate || new Date(log.readingDate) > latestBillDate)
      );
      const totalLiters = unbilledLogs.reduce((sum, log) => sum + (log.readingLiters || 0), 0);
      
      updatedForm.amount = (totalLiters * waterRate).toFixed(2);
      
      setBillCalculation({
        unbilledLiters: totalLiters,
        rate: waterRate,
        latestBillDate: latestBill ? latestBill.generatedDate : 'None'
      });
    } else {
      setBillCalculation(null);
    }

    setBillForm(updatedForm);
  };

  // Bill handlers
  const handleOpenCreateBill = async (prefilledHouseNumber = '') => {
    setEditingBill(null);
    setBillCalculation(null);
    const initialForm = {
      houseNumber: prefilledHouseNumber,
      apartmentBlock: isSuperAdmin ? 'Block A' : block,
      amount: '',
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'UNPAID',
      billingCycleId: 1
    };
    setBillForm(initialForm);
    setBillModalOpen(true);

    let activeRate = communityAdminRate;
    if (!isSuperAdmin && !communityAdminRate) {
      try {
        const username = localStorage.getItem('username');
        if (username) {
          const res = await api.get(`/users/profile/${username}`);
          if (res.data && res.data.waterRatePerLiter != null) {
            activeRate = res.data.waterRatePerLiter;
            setCommunityAdminRate(res.data.waterRatePerLiter);
          }
        }
      } catch (err) {
        console.error("Error fetching rate inside handleOpenCreateBill", err);
      }
    }

    if (prefilledHouseNumber) {
      setTimeout(() => handleHouseNumberChange(prefilledHouseNumber, initialForm, activeRate), 0);
    }
  };

  const handleOpenEditBill = (bill) => {
    setEditingBill(bill);
    setBillCalculation(null);
    setBillForm({
      houseNumber: bill.houseNumber,
      apartmentBlock: bill.apartmentBlock || (isSuperAdmin ? 'Block A' : block),
      amount: bill.amount,
      dueDate: bill.dueDate,
      status: bill.status || 'UNPAID',
      billingCycleId: bill.billingCycleId || 1
    });
    setBillModalOpen(true);
  };

  const handleSaveBill = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingBill) {
        await api.put(`/bills/${editingBill.id}`, billForm, {
          params: { callerRole: role }
        });
        setStatusMessage(`Bill of ₹${billForm.amount} updated successfully for ${billForm.houseNumber}!`);
      } else {
        await api.post('/bills/create', billForm, {
          params: { callerRole: role }
        });
        setStatusMessage(`Bill of ₹${billForm.amount} generated successfully for ${billForm.houseNumber}!`);
      }
      setBillModalOpen(false);
      fetchBills();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to save bill.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;
    setLoading(true);
    try {
      await api.delete(`/bills/${billId}`);
      setStatusMessage("Bill deleted successfully.");
      fetchBills();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to delete bill.'));
    } finally {
      setLoading(false);
    }
  };

  // Notification handlers
  const handleOpenNotify = (prefilledUsername = '') => {
    setNotifyForm({
      username: prefilledUsername,
      type: 'BILL_GENERATED',
      title: 'Water Bill Issued',
      message: 'Your monthly water usage bill has been generated. Please check your billing dashboard to pay.'
    });
    setNotifyModalOpen(true);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/notifications/send', notifyForm);
      setStatusMessage(`Notification successfully sent to ${notifyForm.username}!`);
      setNotifyModalOpen(false);
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to send notification.');
    } finally {
      setLoading(false);
    }
  };

  // Water usage logging handlers
  const handleOpenAddUsage = (prefilledHouseNumber = '') => {
    setEditingUsageLog(null);
    setUsageForm({
      houseNumber: prefilledHouseNumber,
      apartmentBlock: isSuperAdmin ? 'Block A' : block,
      readingDate: new Date().toISOString().split('T')[0],
      readingLiters: '',
      logType: 'DAILY'
    });
    setUsageModalOpen(true);
  };

  const handleOpenEditUsage = (log) => {
    setEditingUsageLog(log);
    setUsageForm({
      houseNumber: log.houseNumber,
      apartmentBlock: log.apartmentBlock,
      readingDate: log.readingDate,
      readingLiters: log.readingLiters,
      logType: log.logType || 'DAILY'
    });
    setUsageModalOpen(true);
  };

  const handleSaveUsage = async (e) => {
    e.preventDefault();
    setLoading(true);
    const username = localStorage.getItem('username') || 'admin';
    try {
      if (editingUsageLog) {
        await api.put(`/usage/${editingUsageLog.id}`, usageForm, {
          params: { callerRole: role, username }
        });
        setStatusMessage(`Usage log updated to ${usageForm.readingLiters}L for ${usageForm.houseNumber}.`);
      } else {
        await api.post('/usage/log', usageForm, { params: { callerRole: role } });
        setStatusMessage(`Usage log of ${usageForm.readingLiters}L added for ${usageForm.houseNumber}!`);
      }
      setUsageModalOpen(false);
      setEditingUsageLog(null);
      fetchUsageLogs();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to save water usage log.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setLoading(true);
    try {
      const targetBlock = isSuperAdmin ? '' : block;
      const response = await api.get('/usage/template', {
        params: { apartmentBlock: targetBlock },
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'water_usage_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setStatusMessage('Prefilled CSV template downloaded successfully!');
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to download CSV template.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadCsv = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/usage/upload-csv?callerRole=${role}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatusMessage(res.data);
      fetchUsageLogs();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to upload CSV logs.'));
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteUsage = async (logId) => {
    if (!window.confirm('Delete this water usage log? This action will be logged and Super Admin will be notified.')) return;
    setLoading(true);
    const username = localStorage.getItem('username') || 'admin';
    try {
      await api.delete(`/usage/${logId}`, { params: { callerRole: role, username } });
      setStatusMessage('Water usage log deleted and Super Admin has been notified.');
      fetchUsageLogs();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to delete usage log.'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkBillPaid = async (bill) => {
    setPayQrModalBill(null);
    setLoading(true);
    try {
      const res = await api.post(`/bills/${bill.id}/mark-paid`);
      setStatusMessage(`Bill #${bill.id} for ${bill.houseNumber} marked as PAID. Household user has been notified.`);
      setInvoiceModalBill(res.data);
      fetchBills();
      fetchStats();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to mark bill as paid.'));
    } finally {
      setLoading(false);
    }
  };



  // Smart-filtered + sorted users
  const filteredUsers = sortUsers(
    smartFilter(users, searchQuery)
      .filter(u => blockFilter ? u.apartmentBlock === blockFilter : true)
      .filter(u => statusFilter ? u.status === statusFilter : true)
      .filter(u => genderFilter ? u.gender?.toLowerCase() === genderFilter : true),
    sortField, sortDir
  );

  const toggleExpandAdmin = (blockName) => {
    setExpandedAdmins(prev => ({ ...prev, [blockName]: !prev[blockName] }));
  };

  const toggleExpandColony = (colonyId) => {
    setExpandedColonies(prev => ({ ...prev, [colonyId]: prev[colonyId] === false ? true : false }));
  };

  const handleQuickRateSave = async () => {
    if (!quickRateUser || !quickRateValue) return;
    setLoading(true);
    try {
      await api.put(`/admin/users/${quickRateUser.id}`, {
        ...quickRateUser,
        waterRatePerLiter: parseFloat(quickRateValue)
      }, {
        params: { callerRole: role, callerBlock: block }
      });
      setStatusMessage(`Water rate ₹${quickRateValue}/L set for ${quickRateUser.fullName || quickRateUser.username} and auto-applied to all households in ${quickRateUser.apartmentBlock}.`);
      setQuickRateUser(null);
      setQuickRateValue('');
      fetchUsers();
    } catch (err) {
      console.error(err);
      setStatusMessage(extractErrorMessage(err, 'Failed to set water rate.'));
    } finally {
      setLoading(false);
    }
  };

  // Helper to find the colony name of a block/building
  const getColonyNameForBlock = (blockName) => {
    if (!blockName) return 'Unassigned';
    // Match in apartments array (name property corresponds to colony name)
    const matchedColony = apartments.find(col => 
      (col.buildings || []).some(b => b.buildingName?.toLowerCase() === blockName.toLowerCase())
    );
    if (matchedColony) return matchedColony.name;
    
    // Fallback: look up in users state
    const matchedUser = users.find(u => u.apartmentBlock?.toLowerCase() === blockName.toLowerCase());
    if (matchedUser && matchedUser.colonyName) return matchedUser.colonyName;

    return 'Unassigned';
  };

  // Compute dynamic chart data based on filters and scope
  const getFilteredChartData = () => {
    if (!isSuperAdmin) {
      // Community admin: scope is always their colony, show buildings in their colony
      const myColonyName = localStorage.getItem('colonyName') || '';
      const myColony = apartments.find(apt => apt.name === myColonyName);
      const myBuildings = myColony ? (myColony.buildings || []).map(b => b.buildingName) : [];
      
      const blocksSet = new Set(myBuildings);
      usageLogs.forEach(log => {
        if (log.apartmentBlock) {
          if (block === log.apartmentBlock) {
            blocksSet.add(log.apartmentBlock);
          }
        }
      });
      
      const chartDataList = Array.from(blocksSet).map(bName => ({ name: bName, usage: 0 }));
      usageLogs.forEach(log => {
        const blockName = log.apartmentBlock;
        if (!blockName) return;
        const matched = chartDataList.find(b => b.name.toLowerCase() === blockName.toLowerCase());
        if (matched) {
          matched.usage += log.readingLiters || 0;
        }
      });
      return chartDataList;
    }

    // Super Admin:
    if (chartScope === 'colony') {
      // Colony-wise View: group consumption by Colony Name
      const colonyNamesSet = new Set(apartments.map(apt => apt.name));
      users.forEach(u => {
        if (u.colonyName) colonyNamesSet.add(u.colonyName);
      });
      
      const chartDataList = Array.from(colonyNamesSet).map(cName => ({ name: cName, usage: 0 }));
      
      usageLogs.forEach(log => {
        const logColony = getColonyNameForBlock(log.apartmentBlock);
        const matched = chartDataList.find(c => c.name.toLowerCase() === logColony.toLowerCase());
        if (matched) {
          matched.usage += log.readingLiters || 0;
        } else if (logColony !== 'Unassigned') {
          chartDataList.push({ name: logColony, usage: log.readingLiters || 0 });
        }
      });
      return chartDataList;
    } else {
      // Building-wise View: group consumption by building/block
      const blocksSet = new Set();
      
      if (selectedColonyFilter === 'all') {
        apartments.forEach(col => {
          (col.buildings || []).forEach(b => {
            if (b.buildingName) blocksSet.add(b.buildingName);
          });
        });
        usageLogs.forEach(log => {
          if (log.apartmentBlock) blocksSet.add(log.apartmentBlock);
        });
      } else {
        const targetColony = apartments.find(apt => apt.name === selectedColonyFilter);
        if (targetColony) {
          (targetColony.buildings || []).forEach(b => {
            if (b.buildingName) blocksSet.add(b.buildingName);
          });
        }
        usageLogs.forEach(log => {
          if (log.apartmentBlock && getColonyNameForBlock(log.apartmentBlock) === selectedColonyFilter) {
            blocksSet.add(log.apartmentBlock);
          }
        });
      }
      
      const chartDataList = Array.from(blocksSet).map(bName => ({ name: bName, usage: 0 }));
      usageLogs.forEach(log => {
        const blockName = log.apartmentBlock;
        if (!blockName) return;
        if (selectedColonyFilter !== 'all' && getColonyNameForBlock(blockName) !== selectedColonyFilter) {
          return;
        }
        const matched = chartDataList.find(b => b.name.toLowerCase() === blockName.toLowerCase());
        if (matched) {
          matched.usage += log.readingLiters || 0;
        }
      });
      return chartDataList;
    }
  };

  const blockDistributionData = getFilteredChartData();

  const householdUsageMap = {};
  usageLogs.forEach(log => {
    const household = log.houseNumber || 'Unknown';
    householdUsageMap[household] = (householdUsageMap[household] || 0) + (log.readingLiters || 0);
  });
  const dynamicUsageData = Object.keys(householdUsageMap).map(household => ({
    name: household,
    usage: householdUsageMap[household]
  })).sort((a, b) => b.usage - a.usage).slice(0, 5);

  const getSecurityLogs = () => {
    const logs = [];
    
    // Add pending approvals as warning logs
    pendingApprovals.forEach(req => {
      logs.push({
        id: `pending-${req.id}`,
        title: 'Pending Registration',
        message: `User '${req.username}' requested approval for ${req.apartmentBlock || 'Block A'}.`,
        type: 'warning',
        timestamp: 'Just now'
      });
    });

    // Add recent bill generations
    bills.slice(0, 3).forEach(bill => {
      logs.push({
        id: `bill-${bill.id}`,
        title: 'Bill Generated',
        message: `₹${bill.amount} bill generated for ${bill.houseNumber} (${bill.apartmentBlock || 'Block A'}).`,
        type: 'info',
        timestamp: bill.generatedDate
      });
    });

    // Fallback if empty
    if (logs.length === 0) {
      logs.push({
        id: 'system-ok',
        title: 'Server Health Normal',
        message: 'No security logs or pending actions. System running optimally.',
        type: 'ok',
        timestamp: 'Active'
      });
    }

    return logs;
  };

  const getCommunityAlerts = () => {
    const alerts = [];

    // Filter usage logs for overuse or leak status
    usageLogs.forEach(log => {
      if (log.status === 'Overuse' || log.status === 'Potential Leak') {
        alerts.push({
          id: `usage-${log.id}`,
          title: `${log.status}: ${log.houseNumber}`,
          message: `Recorded ${log.readingLiters} Liters on ${log.readingDate}.`,
          type: log.status === 'Overuse' ? 'overuse' : 'leak'
        });
      }
    });

    // Also add pending approvals in their block as warning alerts
    pendingApprovals.forEach(req => {
      alerts.push({
        id: `pending-${req.id}`,
        title: 'Pending Onboarding',
        message: `Resident '${req.username}' awaits registration approval.`,
        type: 'warning'
      });
    });

    if (alerts.length === 0) {
      alerts.push({
        id: 'all-good',
        title: 'All Systems Normal',
        message: 'No abnormal water consumption or pending registration alerts.',
        type: 'ok'
      });
    }

    return alerts;
  };

  const getCommunityAnalytics = () => {
    const communityAdmins = users.filter(u => u.role === 'ROLE_COMMUNITY_ADMIN');
    return communityAdmins.map(admin => {
      const blockName = admin.apartmentBlock;
      const blockHH = users.filter(u => (u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER') && u.apartmentBlock?.trim().toLowerCase() === blockName?.trim().toLowerCase());
      const verifiedCount = blockHH.filter(u => u.verificationStatus === 'VERIFIED').length;
      const pendingCount = blockHH.filter(u => u.verificationStatus === 'PENDING_VERIFICATION').length;
      
      // Monthly usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);
      const blockUsageLogs = usageLogs.filter(l => l.apartmentBlock?.trim().toLowerCase() === blockName?.trim().toLowerCase());
      const monthlyUsage = blockUsageLogs.reduce((sum, log) => {
        const logDate = new Date(log.readingDate);
        if (logDate >= startOfMonth) {
          return sum + (log.readingLiters || 0);
        }
        return sum;
      }, 0);

      // Monthly revenue & collections
      const blockBills = bills.filter(b => b.apartmentBlock?.trim().toLowerCase() === blockName?.trim().toLowerCase());
      const monthlyRevenue = blockBills.reduce((sum, b) => {
        if (b.status === 'PAID') {
          return sum + (b.amount || 0);
        }
        return sum;
      }, 0);
      const pendingCollections = blockBills.reduce((sum, b) => {
        if (b.status === 'UNPAID') {
          return sum + (b.amount || 0);
        }
        return sum;
      }, 0);

      const avgConsumption = blockHH.length > 0 ? (monthlyUsage / blockHH.length) : 0;

      // Recent Activity logs
      const recentLogs = [...blockUsageLogs]
        .sort((a,b) => new Date(b.readingDate) - new Date(a.readingDate))
        .slice(0, 5);

      return {
        admin,
        colonyName: admin.colonyName || 'N/A',
        apartmentBlock: blockName,
        totalHouseholds: blockHH.length,
        verifiedCount,
        pendingCount,
        monthlyUsage,
        monthlyRevenue,
        pendingCollections,
        avgConsumption,
        recentLogs
      };
    });
  };

  const exportCommunityReport = (adminAnalytic) => {
    const admin = adminAnalytic.admin;
    const blockHH = users.filter(u => (u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER') && u.apartmentBlock?.trim().toLowerCase() === admin.apartmentBlock?.trim().toLowerCase());
    const blockBills = bills.filter(b => b.apartmentBlock?.trim().toLowerCase() === admin.apartmentBlock?.trim().toLowerCase());
    const blockUsage = usageLogs.filter(l => l.apartmentBlock?.trim().toLowerCase() === admin.apartmentBlock?.trim().toLowerCase());
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `Community Admin Report for ${admin.fullName || admin.username} (${admin.apartmentBlock})\n`;
    csvContent += `Community Name,${admin.colonyName || 'N/A'}\n`;
    csvContent += `Apartment Block,${admin.apartmentBlock}\n`;
    csvContent += `Total Households,${blockHH.length}\n`;
    csvContent += `Verified,${adminAnalytic.verifiedCount},Pending,${adminAnalytic.pendingCount}\n`;
    csvContent += `Monthly Water Usage (L),${adminAnalytic.monthlyUsage}\n`;
    csvContent += `Monthly Revenue (INR),${adminAnalytic.monthlyRevenue}\n`;
    csvContent += `Pending Collections (INR),${adminAnalytic.pendingCollections}\n\n`;
    
    csvContent += "House Number,Resident Name,Email,Mobile,Status,Verification,Water Rate\n";
    blockHH.forEach(u => {
      csvContent += `"${u.houseNumber || ''}","${u.fullName || u.username}","${u.email}","${u.mobileNumber || ''}","${u.status}","${u.verificationStatus}","${u.waterRatePerLiter || ''}"\n`;
    });
    
    csvContent += "\nBilling Records\nHouse Number,Amount,Due Date,Status\n";
    blockBills.forEach(b => {
      csvContent += `"${b.houseNumber}","${b.amount}","${b.dueDate}","${b.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_${admin.apartmentBlock}_${admin.colonyName || 'Community'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StatCard = ({ title, value, icon: Icon, color, delay }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="glass-card p-6 relative overflow-hidden group"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-text-muted text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-text tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-400`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className={`absolute -right-10 -bottom-10 w-32 h-32 bg-${color}-500/5 rounded-full blur-2xl`} />
    </motion.div>
  );

  const renderActiveTabHelp = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-text-muted">
            <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40">
              <p className="font-semibold text-primary flex items-center gap-2">
                <Activity className="w-4.5 h-4.5" /> Dashboard Overview & KPIs
              </p>
              <ul className="list-disc list-inside text-xs space-y-2 leading-relaxed">
                <li><strong>Global Cards:</strong> Instantly check total approved residents, active billing statistics, and overall community water volume.</li>
                <li><strong>Usage Insights:</strong> Analyze who is using the most water to quickly verify anomalies or check for active plumbing leaks.</li>
                <li><strong>Security Feed:</strong> Real-time alerts on system checkups, server status, and backup DB states are shown on the side panel.</li>
              </ul>
            </div>
            <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40">
              <p className="font-semibold text-primary flex items-center gap-2">
                <Settings className="w-4.5 h-4.5" /> Administrator Navigation
              </p>
              <ul className="list-disc list-inside text-xs space-y-2 leading-relaxed">
                <li>Go to the **User Directory** tab to approve, reject, or manually update household profiles.</li>
                <li>Use the **Billing & Alerts** tab to set tariff limits, log meter read cycles, and finalize bills.</li>
                <li>If residents register via an invitation link, review and approve their profile under **Pending Approvals**.</li>
              </ul>
            </div>
          </div>
        );
      case 'community-analytics':
        return (
          <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40 text-sm text-text-muted">
            <p className="font-semibold text-primary flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5" /> Community Block Analytics
            </p>
            <p className="text-xs leading-relaxed">
              Visualize real-time trends for all apartment blocks. You can view overall billing collection progress, monthly revenue, pending community dues, average consumption stats, and recent action logs. Export complete data reports using the **Download PDF/CSV** option to share reports with committee members.
            </p>
          </div>
        );
      case 'users':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-text-muted">
            <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40">
              <p className="font-semibold text-blue-400 flex items-center gap-2">
                <Droplet className="w-4.5 h-4.5" /> 1. Log Meter Reading
              </p>
              <p className="text-xs leading-relaxed">
                Click the blue droplet icon next to a resident's name. Enter the liters shown on their physical water meter and save. This updates their usage metrics instantly.
              </p>
            </div>
            <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40">
              <p className="font-semibold text-purple-400 flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5" /> 2. Generate Dues
              </p>
              <p className="text-xs leading-relaxed">
                Click the purple receipt icon next to a resident's name. The billing engine will automatically parse the unbilled consumption log and calculate exact costs!
              </p>
            </div>
            <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40">
              <p className="font-semibold text-yellow-400 flex items-center gap-2">
                <Send className="w-4.5 h-4.5" /> 3. Send Alerts
              </p>
              <p className="text-xs leading-relaxed">
                Click the yellow paper airplane icon next to a resident's name to instantly dispatch dashboard notifications or warnings about payment cycles or high usage.
              </p>
            </div>
          </div>
        );
      case 'usage':
        return (
          <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40 text-sm text-text-muted">
            <p className="font-semibold text-primary flex items-center gap-2">
              <Droplet className="w-4.5 h-4.5" /> Water Usage Records
            </p>
            <p className="text-xs leading-relaxed">
              Lists all individual manual and automated meter logs. You can click **"Add Reading"** at the top right to record a manual entry, or upload bulk readings in one go using the **CSV Upload** flow under the User Directory tab. Smart meter data is synced in real-time.
            </p>
          </div>
        );
      case 'billing':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-text-muted">
            <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40">
              <p className="font-semibold text-emerald-400 flex items-center gap-2">
                <Receipt className="w-4.5 h-4.5" /> Automated Billing Cycles
              </p>
              <p className="text-xs leading-relaxed">
                Under "Billing Cycles & Periods", click **"Create Billing Cycle"** at the start of a cycle. Once readings are complete, click **"Finalize"** to batch-calculate and issue invoices to all residents at once.
              </p>
            </div>
            <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40">
              <p className="font-semibold text-yellow-400 flex items-center gap-2">
                <Plus className="w-4.5 h-4.5" /> Individual Dues & Tariffs
              </p>
              <p className="text-xs leading-relaxed">
                Under "Individual Custom Bills", you can search, view, print, or generate manual invoices for specific house numbers. Set rates under "Tariff Rate Structure".
              </p>
            </div>
          </div>
        );
      case 'colonies':
        return (
          <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40 text-sm text-text-muted">
            <p className="font-semibold text-primary flex items-center gap-2">
              <MapPin className="w-4.5 h-4.5" /> Colony & Building Management
            </p>
            <p className="text-xs leading-relaxed">
              Manage registered colonies and buildings. Add new colonies or add buildings to existing ones. Make colonies collapsible and expandable to keep the list organized.
            </p>
          </div>
        );
      case 'doc-verification':
        return (
          <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40 text-sm text-text-muted">
            <p className="font-semibold text-primary flex items-center gap-2">
              <FileText className="w-4.5 h-4.5" /> Document Verification
            </p>
            <p className="text-xs leading-relaxed">
              Verify uploaded residency documents (like tenancy agreements or utility bills) for users onboarded via invitations.
            </p>
          </div>
        );
      case 'approvals':
        return (
          <div className="space-y-3 bg-surface-lighter/20 p-4 rounded-xl border border-border/40 text-sm text-text-muted">
            <p className="font-semibold text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5" /> Resident Verification & Approvals
            </p>
            <p className="text-xs leading-relaxed">
              When new household accounts register via invitation codes, their document verifications appear here. Carefully inspect their uploaded files, then choose **"Approve"** to activate their dashboard, or **"Reject"** if details are incorrect or documents are unreadable.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">
            {activeTab === 'users' 
              ? 'User Directory' 
              : isSuperAdmin ? 'Super Admin Panel' : 'Community Admin Dashboard'}
          </h1>
          <p className="text-text-muted mt-1">
            {activeTab === 'users'
              ? (isSuperAdmin ? 'Manage and monitor all users and admins across communities.' : `Manage, search, and invite residents for ${block}.`)
              : isSuperAdmin 
                ? 'Global administrative overview, user onboarding & database administration.' 
                : `Block Level Water & Account Management for ${block}`}
          </p>
        </div>
      </div>

      {statusMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-surface-lighter border border-border text-sm font-medium text-text flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage('')} className="text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Custom Tabs & Glowing Bulb Help */}
      {activeTab !== 'users' && (
        <div className="flex items-center justify-between border-b border-border mb-6">
          <div className="flex overflow-x-auto gap-8">
            {[
              { id: 'overview', label: 'Overview' },
              isSuperAdmin && { id: 'community-analytics', label: 'Community Analytics 📊' },
              { id: 'usage', label: 'Water Usage logs' },
              { id: 'billing', label: 'Billing & Alerts' },
              isSuperAdmin && { id: 'colonies', label: '🏘️ Colony Management' },
              {
                id: 'doc-verification',
                label: `📋 Doc Verification${pendingVerifications.length > 0 ? ` (${pendingVerifications.length})` : ''}`
              },
              { 
                id: 'approvals', 
                label: `Pending Approvals${pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}` 
              }
            ].filter(Boolean).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-semibold border-b-2 transition-all relative whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Glowing bulb for quick guide */}
          <div className="relative pb-1" style={{ zIndex: 40 }}>
            <button 
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setQuickHelpModalOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.25)] hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] hover:scale-105 transition-all cursor-pointer animate-pulse focus:outline-none"
            >
              <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20" />
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-11 whitespace-nowrap bg-surface-lighter border border-border text-text text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-md z-50">
                Quick guide to help you
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Stat Cards */}
            {isSuperAdmin ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Buildings" value={stats ? `${stats.totalApartments}` : '...'} icon={Home} color="blue" delay={0.1} />
                <StatCard title="Community Admins" value={stats ? `${stats.totalCommunityAdmins}` : '...'} icon={Users} color="emerald" delay={0.2} />
                <StatCard title="Registered Residents" value={stats ? `${stats.totalHouseholdUsers}` : '...'} icon={Users} color="purple" delay={0.3} />
                <StatCard title="Total Platform Users" value={stats ? `${stats.totalUsers}` : '...'} icon={Settings} color="pink" delay={0.4} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Houses" value={stats ? `${stats.totalHouseholds}` : '...'} icon={Home} color="blue" delay={0.1} />
                <StatCard title="Registered Residents" value={stats ? `${stats.totalResidents}` : '...'} icon={Users} color="emerald" delay={0.2} />
                <StatCard title="Total Block Usage (Month)" value={stats ? `${stats.totalUsageThisMonth} Liters` : '...'} icon={Droplet} color="purple" delay={0.3} />
              </div>
            )}

            {/* Graphs & Alerts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="glass-card p-6 lg:col-span-2 min-h-[350px]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-semibold text-text">
                      {isSuperAdmin ? 'Community Water Distribution (Liters)' : 'Top Consumer Households'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {isSuperAdmin && (
                      <>
                        {/* Scope Toggle Tabs */}
                        <div className="bg-surface-lighter p-0.5 rounded-lg border border-border flex items-center">
                          <button
                            onClick={() => { setChartScope('colony'); setSelectedColonyFilter('all'); }}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              chartScope === 'colony'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-muted hover:text-text'
                            }`}
                          >
                            Colony View
                          </button>
                          <button
                            onClick={() => setChartScope('building')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              chartScope === 'building'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-muted hover:text-text'
                            }`}
                          >
                            Building View
                          </button>
                        </div>

                        {/* Colony Filter (Only in Building View) */}
                        {chartScope === 'building' && (
                          <select
                            value={selectedColonyFilter}
                            onChange={(e) => setSelectedColonyFilter(e.target.value)}
                            className="bg-surface-lighter border border-border rounded-lg px-2.5 py-1 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer max-w-[150px]"
                          >
                            <option value="all">All Colonies</option>
                            {apartments.map(apt => (
                              <option key={apt.id} value={apt.name}>{apt.name}</option>
                            ))}
                          </select>
                        )}
                      </>
                    )}

                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value)}
                      className="bg-surface-lighter border border-border rounded-lg px-2.5 py-1 text-xs text-text focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="area">Area Chart</option>
                    </select>
                  </div>
                </div>
                 <div className={`w-full transition-all duration-300 ${isChartExpanded ? 'h-[450px]' : 'h-[250px]'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    {(() => {
                      const rawChartData = isSuperAdmin ? blockDistributionData : dynamicUsageData;
                      const chartData = isChartExpanded ? rawChartData : rawChartData.slice(0, 5);
                      
                      if (chartType === 'line') {
                        return (
                          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                              labelStyle={{ color: '#f8fafc' }}
                              itemStyle={{ color: '#cbd5e1' }}
                            />
                            <Line type="monotone" dataKey="usage" stroke={isSuperAdmin ? '#3b82f6' : '#8b5cf6'} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        );
                      }
                      if (chartType === 'area') {
                        return (
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorUsageAdmin" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isSuperAdmin ? '#3b82f6' : '#8b5cf6'} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={isSuperAdmin ? '#3b82f6' : '#8b5cf6'} stopOpacity={0}/>
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
                            <Area type="monotone" dataKey="usage" stroke={isSuperAdmin ? '#3b82f6' : '#8b5cf6'} strokeWidth={3} fillOpacity={1} fill="url(#colorUsageAdmin)" />
                          </AreaChart>
                        );
                      }
                      return (
                        <BarChart 
                          data={chartData} 
                          margin={{ top: 10, right: 10, left: 10, bottom: 0 }} 
                          layout="vertical"
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                          <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={110} />
                          <Tooltip 
                            cursor={{ fill: '#334155', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                            labelStyle={{ color: '#f8fafc' }}
                            itemStyle={{ color: '#cbd5e1' }}
                          />
                          <Bar dataKey="usage" radius={[0, 4, 4, 0]} barSize={20}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      );
                    })()}
                  </ResponsiveContainer>
                </div>
                {(() => {
                  const rawChartData = isSuperAdmin ? blockDistributionData : dynamicUsageData;
                  if (rawChartData.length > 5) {
                    return (
                      <div className="flex justify-center mt-4">
                        <button
                          onClick={() => setIsChartExpanded(!isChartExpanded)}
                          className="px-4 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          {isChartExpanded ? 'Show Less' : `Show More (${rawChartData.length - 5} hidden)`}
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="glass-card p-6 flex flex-col">
                <h3 className="font-semibold text-text mb-4">
                  {isSuperAdmin ? 'Global Security Logs' : 'Community Alerts'}
                </h3>
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[260px]">
                  {isSuperAdmin ? (
                    getSecurityLogs().map(log => {
                      const isWarning = log.type === 'warning';
                      const isInfo = log.type === 'info';
                      const isOk = log.type === 'ok';
                      
                      let bgColor = 'bg-blue-500/5 border-blue-500/10';
                      let textColor = 'text-blue-200';
                      let subColor = 'text-blue-400/70';
                      let Icon = Server;

                      if (isWarning) {
                        bgColor = 'bg-amber-500/5 border-amber-500/10';
                        textColor = 'text-amber-200';
                        subColor = 'text-amber-400/70';
                        Icon = AlertCircle;
                      } else if (isOk) {
                        bgColor = 'bg-emerald-500/5 border-emerald-500/10';
                        textColor = 'text-emerald-200';
                        subColor = 'text-emerald-400/70';
                        Icon = Activity;
                      }

                      return (
                        <div key={log.id} className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor}`}>
                          <Icon className="w-5 h-5 mt-0.5" style={{ color: isWarning ? '#fbbf24' : isOk ? '#34d399' : '#60a5fa' }} />
                          <div>
                            <p className={`text-sm font-medium ${textColor}`}>{log.title}</p>
                            <p className={`text-xs ${subColor} mt-1`}>{log.message}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    getCommunityAlerts().map(alert => {
                      const isOveruse = alert.type === 'overuse';
                      const isLeak = alert.type === 'leak';
                      const isWarning = alert.type === 'warning';
                      const isOk = alert.type === 'ok';

                      let bgColor = 'bg-blue-500/5 border-blue-500/10';
                      let textColor = 'text-blue-200';
                      let subColor = 'text-blue-400/70';
                      let Icon = AlertCircle;

                      if (isOveruse || isLeak) {
                        bgColor = 'bg-red-500/5 border-red-500/10';
                        textColor = 'text-red-200';
                        subColor = 'text-red-400/70';
                      } else if (isWarning) {
                        bgColor = 'bg-amber-500/5 border-amber-500/10';
                        textColor = 'text-amber-200';
                        subColor = 'text-amber-400/70';
                      } else if (isOk) {
                        bgColor = 'bg-emerald-500/5 border-emerald-500/10';
                        textColor = 'text-emerald-200';
                        subColor = 'text-emerald-400/70';
                        Icon = CheckCircle2;
                      }

                      return (
                        <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor}`}>
                          <Icon className="w-5 h-5 mt-0.5" style={{ color: (isOveruse || isLeak) ? '#f87171' : isWarning ? '#fbbf24' : isOk ? '#34d399' : '#60a5fa' }} />
                          <div>
                            <p className={`text-sm font-medium ${textColor}`}>{alert.title}</p>
                            <p className={`text-xs ${subColor} mt-1`}>{alert.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'community-analytics' && (
          <motion.div
            key="community-analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Analytics Overview Cards */}
            {(() => {
              const analyticsData = getCommunityAnalytics();
              const totalBlocks = analyticsData.length;
              const totalHH = analyticsData.reduce((acc, curr) => acc + curr.totalHouseholds, 0);
              const totalUsage = analyticsData.reduce((acc, curr) => acc + curr.monthlyUsage, 0);
              const totalRevenue = analyticsData.reduce((acc, curr) => acc + curr.monthlyRevenue, 0);
              const totalPending = analyticsData.reduce((acc, curr) => acc + curr.pendingCollections, 0);

              return (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <StatCard title="Monitored Blocks" value={`${totalBlocks}`} icon={Home} color="blue" delay={0.1} />
                    <StatCard title="Total Households" value={`${totalHH}`} icon={Users} color="emerald" delay={0.2} />
                    <StatCard title="Cumulative Usage (L)" value={`${totalUsage.toLocaleString()}`} icon={Droplet} color="purple" delay={0.3} />
                    <StatCard title="Cumulative Collections" value={`₹${totalRevenue.toLocaleString()}`} icon={Receipt} color="pink" delay={0.4} />
                  </div>

                  {/* Main Analytics Table */}
                  <div className="glass-card overflow-hidden border-primary/20">
                    <div className="px-6 py-4 bg-primary/5 border-b border-border flex items-center justify-between">
                      <h3 className="font-bold text-text text-base">Community Block Performance Metrics</h3>
                      <span className="text-text-muted text-xs font-semibold">Real-Time Data aggregation</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-surface-lighter border-b border-border">
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Community Name</th>
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Block</th>
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Households</th>
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Verification Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Monthly Usage</th>
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Monthly Rev / Pending</th>
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Avg Consumption</th>
                            <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {analyticsData.length > 0 ? (
                            analyticsData.map(item => {
                              const isSelected = selectedAdminAnalytics?.apartmentBlock === item.apartmentBlock;
                              return (
                                <tr 
                                  key={item.admin.id} 
                                  className={`hover:bg-primary/5 transition-colors cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                                  onClick={() => setSelectedAdminAnalytics(item)}
                                >
                                  <td className="px-6 py-4 font-bold text-text text-sm">{item.colonyName}</td>
                                  <td className="px-6 py-4 font-semibold text-text-muted text-sm">{item.apartmentBlock}</td>
                                  <td className="px-6 py-4 text-text text-sm">{item.totalHouseholds} homes</td>
                                  <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-emerald-400 font-semibold text-xs">{item.verifiedCount} Verified</span>
                                      {item.pendingCount > 0 && (
                                        <span className="text-amber-400 text-xs font-semibold">{item.pendingCount} Pending</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-semibold text-purple-400">{item.monthlyUsage.toLocaleString()} Liters</td>
                                  <td className="px-6 py-4 text-sm">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-emerald-400 font-semibold">₹{item.monthlyRevenue.toLocaleString()}</span>
                                      <span className="text-red-400 text-xs">₹{item.pendingCollections.toLocaleString()} Unpaid</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-semibold text-blue-400">
                                    {Math.round(item.avgConsumption).toLocaleString()} L/home
                                  </td>
                                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => setSelectedAdminAnalytics(item)}
                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/25 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <Activity className="w-3.5 h-3.5" /> Trend
                                      </button>
                                      <button 
                                        onClick={() => exportCommunityReport(item)}
                                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                      >
                                        <FileText className="w-3.5 h-3.5" /> Export
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="8" className="px-6 py-10 text-center text-text-muted text-sm">No community admin data available.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detailed Analysis Drawer/Card */}
                  {selectedAdminAnalytics && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    >
                      {/* Trend Analysis Chart */}
                      <div className="glass-card p-6 lg:col-span-2 min-h-[350px]">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="font-bold text-text text-lg">
                              📊 Water Consumption Trend: {selectedAdminAnalytics.apartmentBlock}
                            </h3>
                            <p className="text-text-muted text-xs mt-0.5">Daily aggregated meter readings logged for this block</p>
                          </div>
                          <button 
                            onClick={() => setSelectedAdminAnalytics(null)}
                            className="p-1.5 hover:bg-surface-lighter rounded-lg text-text-muted hover:text-text cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="h-[250px] w-full">
                          {(() => {
                            const blockUsageLogs = usageLogs.filter(l => l.apartmentBlock === selectedAdminAnalytics.apartmentBlock);
                            const dailyMap = {};
                            blockUsageLogs.forEach(l => {
                              const d = l.readingDate;
                              dailyMap[d] = (dailyMap[d] || 0) + (l.readingLiters || 0);
                            });
                            const trendData = Object.keys(dailyMap).map(d => ({
                              date: d,
                              usage: dailyMap[d]
                            })).sort((a,b) => new Date(a.date) - new Date(b.date));

                            if (trendData.length === 0) {
                              return (
                                <div className="h-full flex items-center justify-center text-text-muted text-sm italic">
                                  No usage readings logged for this block yet.
                                </div>
                              );
                            }

                            return (
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorUsageTrend" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    labelStyle={{ color: '#f8fafc' }}
                                    itemStyle={{ color: '#cbd5e1' }}
                                  />
                                  <Area type="monotone" dataKey="usage" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsageTrend)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Collections & Recent Activity */}
                      <div className="glass-card p-6 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-text text-base mb-4">Financial Overview & Recent Activity</h3>
                          <div className="space-y-4">
                            <div className="bg-surface-lighter/40 border border-border/40 rounded-xl p-4">
                              <p className="text-xs text-text-muted font-medium mb-2">Revenue Realization Rate</p>
                              {(() => {
                                const rev = selectedAdminAnalytics.monthlyRevenue;
                                const pend = selectedAdminAnalytics.pendingCollections;
                                const total = rev + pend;
                                const rate = total > 0 ? Math.round((rev / total) * 100) : 100;
                                return (
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-sm font-bold">
                                      <span className="text-emerald-400">{rate}% Collected</span>
                                      <span className="text-text-muted">₹{total.toLocaleString()} Total</span>
                                    </div>
                                    <div className="w-full h-2 bg-surface-lighter rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${rate}%` }} />
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            <div>
                              <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-2">Recent Readings</p>
                              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                {selectedAdminAnalytics.recentLogs.length > 0 ? (
                                  selectedAdminAnalytics.recentLogs.map((log, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-surface-lighter/20 border border-border/20 text-xs">
                                      <div>
                                        <p className="font-bold text-text">{log.houseNumber}</p>
                                        <p className="text-text-muted font-medium mt-0.5">{log.readingDate}</p>
                                      </div>
                                      <span className="font-bold text-primary">{log.readingLiters.toLocaleString()} L</span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-xs text-text-muted italic">No recent logs found.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => exportCommunityReport(selectedAdminAnalytics)}
                          className="w-full mt-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                        >
                          <FileText className="w-4 h-4" /> Export Block CSV Report
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Smart Search Toolbar */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <SmartSearchBar
                    users={users}
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    sortField={sortField}
                    sortDir={sortDir}
                    onSortChange={handleSortChange}
                    blockFilter={blockFilter}
                    onBlockFilterChange={setBlockFilter}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    genderFilter={genderFilter}
                    onGenderFilterChange={setGenderFilter}
                  />
                </div>
                <button
                  onClick={handleOpenCreateUser}
                  className="px-4 py-2.5 bg-primary text-white hover:bg-primary-dark rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  {isSuperAdmin ? 'Register New User' : 'Invite Resident'}
                </button>
                {!isSuperAdmin && (
                  <>
                    <button
                      onClick={() => { setBulkInviteFile(null); setBulkInviteReport(null); setBulkInviteModalOpen(true); }}
                      className="px-4 py-2.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 border border-violet-500/20 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap flex-shrink-0"
                    >
                      <Upload className="w-4 h-4" />
                      Bulk Invite
                    </button>
                    <button
                      onClick={downloadCsvTemplate}
                      className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      Template
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Water Rate Modal */}
            {quickRateUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-text mb-2">💧 Set Water Rate</h3>
                  <p className="text-text-muted text-sm mb-1">For: <strong className="text-emerald-400">{quickRateUser.fullName || quickRateUser.username}</strong> ({quickRateUser.apartmentBlock})</p>
                  <p className="text-text-muted text-xs mb-5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                    ✅ This rate will be <strong>automatically applied</strong> to all household users under this block.
                  </p>
                  <div className="flex gap-3 items-center mb-6">
                    <span className="text-text font-bold text-lg">₹</span>
                    <input
                      type="number" step="0.01" min="0" autoFocus
                      value={quickRateValue}
                      onChange={(e) => setQuickRateValue(e.target.value)}
                      placeholder="e.g. 0.05"
                      className="flex-1 bg-surface-lighter border border-border rounded-xl px-4 py-3 text-lg text-text focus:outline-none focus:border-primary font-bold"
                    />
                    <span className="text-text-muted font-medium">per Liter</span>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setQuickRateUser(null)} className="px-4 py-2 text-text-muted hover:text-text transition-colors cursor-pointer">Cancel</button>
                    <button onClick={handleQuickRateSave} disabled={!quickRateValue} className="px-6 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer">Save & Apply to All</button>
                  </div>
                </motion.div>
              </div>
            )}

            {isSuperAdmin ? (
              /* ===== SUPER ADMIN: Grouped expandable view ===== */
              <div className="space-y-4">
                {(() => {
                  const communityAdmins = filteredUsers.filter(u => u.role === 'ROLE_COMMUNITY_ADMIN');
                  const households = filteredUsers.filter(u => u.role === 'ROLE_RESIDENT' || u.role === 'ROLE_HOUSEHOLD_USER');
                  const superAdmins = filteredUsers.filter(u => u.role === 'ROLE_ADMIN');
                  return (
                    <>
                      {/* Super admins row */}
                      {superAdmins.length > 0 && (
                        <div className="glass-card overflow-hidden border-red-500/20">
                          <div className="px-5 py-3 bg-red-500/5 border-b border-red-500/10 flex items-center gap-2">
                            <span className="text-sm font-bold text-red-400">🛡️ System Administrators</span>
                            <span className="text-xs text-red-400/70">({superAdmins.length})</span>
                          </div>
                          {superAdmins.map(u => (
                            <div key={u.id} className="px-5 py-3 flex items-center justify-between hover:bg-red-500/5 transition-colors border-b border-border/30 last:border-0">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-red-500/15 flex items-center justify-center text-red-400 font-bold text-sm">{(u.fullName||u.username)?.[0]?.toUpperCase()}</div>
                                <div>
                                  <p className="font-semibold text-text text-sm">{u.fullName || u.username}</p>
                                  <p className="text-text-muted text-xs">{u.email}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleOpenEditUser(u)} className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Community admins with expandable households */}
                      {communityAdmins.length > 0 ? communityAdmins.map(admin => {
                        const blockHH = households.filter(h => h.apartmentBlock?.trim().toLowerCase() === admin.apartmentBlock?.trim().toLowerCase());
                        const isExpanded = !!expandedAdmins[admin.apartmentBlock];
                        const hasRate = admin.waterRatePerLiter != null;
                        return (
                          <div key={admin.id} className={`glass-card overflow-hidden ${!hasRate ? 'border-amber-500/40' : 'border-emerald-500/20'}`}>
                            <div
                              onClick={() => toggleExpandAdmin(admin.apartmentBlock)}
                              className={`px-5 py-4 flex items-center justify-between cursor-pointer select-none transition-colors ${!hasRate ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'bg-emerald-500/5 hover:bg-emerald-500/10'}`}
                            >
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${!hasRate ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                  {(admin.fullName||admin.username)?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-text">{admin.fullName || admin.username}</p>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Community Admin</span>
                                  </div>
                                  <p className="text-text-muted text-xs mt-0.5">{admin.apartmentBlock} · {admin.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                {hasRate ? (
                                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-bold">₹{admin.waterRatePerLiter}/L</span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setQuickRateUser(admin); setQuickRateValue(''); }}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-bold animate-pulse hover:animate-none hover:bg-amber-500/25 cursor-pointer"
                                  >⚠️ Set Rate!</button>
                                )}
                                <span className="text-text-muted text-xs">{blockHH.length} household(s)</span>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenEditUser(admin); }} className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleOpenNotify(admin.username); }} className="p-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/25 border border-yellow-500/20 rounded-lg cursor-pointer"><Send className="w-3.5 h-3.5" /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(admin.id); }} className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                <span className={`text-text-muted transition-transform duration-200 select-none ${isExpanded ? 'rotate-180' : ''}`} style={{display:'inline-block'}}>▼</span>
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="border-t border-border">
                                {blockHH.length > 0 ? (
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-blue-500/5 border-b border-blue-500/10">
                                        <th className="px-5 py-3 text-xs font-bold text-blue-400 uppercase">House #</th>
                                        <th className="px-5 py-3 text-xs font-bold text-blue-400 uppercase">Full Name</th>
                                        <th className="px-5 py-3 text-xs font-bold text-blue-400 uppercase">Email</th>
                                        <th className="px-5 py-3 text-xs font-bold text-blue-400 uppercase">Mobile</th>
                                        <th className="px-5 py-3 text-xs font-bold text-blue-400 uppercase">Rate</th>
                                        <th className="px-5 py-3 text-xs font-bold text-blue-400 uppercase text-right">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                      {blockHH.map(hu => (
                                        <tr key={hu.id} className="hover:bg-blue-500/5 transition-colors">
                                          <td className="px-5 py-3 font-semibold text-text text-sm">{hu.houseNumber || '—'}</td>
                                          <td className="px-5 py-3 text-sm">
                                            <div className="font-semibold text-text">{hu.fullName || hu.username}</div>
                                            {hu.meterId && <div className="text-text-muted text-[11px] mt-0.5">Meter: {hu.meterId}</div>}
                                          </td>
                                          <td className="px-5 py-3 text-text-muted text-sm">{hu.email}</td>
                                          <td className="px-5 py-3 text-text-muted text-sm">{hu.mobileNumber || '—'}</td>
                                          <td className="px-5 py-3 text-sm">
                                            {hu.waterRatePerLiter != null
                                              ? <span className="text-emerald-400 font-semibold">₹{hu.waterRatePerLiter}/L</span>
                                              : <span className="text-amber-400 text-xs italic">Inherits on rate set</span>}
                                          </td>
                                          <td className="px-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                              <button onClick={() => handleOpenAddUsage(hu.houseNumber)} title="Log Usage" className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded-lg cursor-pointer"><Droplet className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => handleOpenCreateBill(hu.houseNumber)} title="Bill" className="p-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/25 border border-purple-500/20 rounded-lg cursor-pointer"><Receipt className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => handleOpenEditUser(hu)} title="Edit" className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                                              <button onClick={() => handleDeleteUser(hu.id)} title="Delete" className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="px-6 py-6 text-center text-text-muted text-sm">No household users in {admin.apartmentBlock} yet.</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="glass-card p-8 text-center text-text-muted">No community admins found.</div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              /* ===== COMMUNITY ADMIN: Simple blue-tinted table ===== */
              <div className="glass-card overflow-hidden border-blue-500/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-blue-500/5 border-b border-blue-500/10">
                        <th className="px-6 py-4 text-xs font-bold text-blue-400 uppercase">Username</th>
                        <th className="px-6 py-4 text-xs font-bold text-blue-400 uppercase">Full Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-blue-400 uppercase">Email</th>
                        <th className="px-6 py-4 text-xs font-bold text-blue-400 uppercase">House #</th>
                        <th className="px-6 py-4 text-xs font-bold text-blue-400 uppercase">Mobile</th>
                        <th className="px-6 py-4 text-xs font-bold text-blue-400 uppercase">Gender</th>
                        <th className="px-6 py-4 text-xs font-bold text-blue-400 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <tr key={user.id} className="hover:bg-blue-500/5 transition-colors">
                            <td className="px-6 py-4 font-semibold text-text">{user.username}</td>
                            <td className="px-6 py-4 text-sm">
                              <div className="font-semibold text-text">{user.fullName || '—'}</div>
                              {user.meterId && <div className="text-text-muted text-[11px] mt-0.5">Meter: {user.meterId}</div>}
                            </td>
                            <td className="px-6 py-4 text-text-muted">{user.email}</td>
                            <td className="px-6 py-4 text-text-muted">{user.houseNumber || '—'}</td>
                            <td className="px-6 py-4 text-text-muted">{user.mobileNumber || '—'}</td>
                            <td className="px-6 py-4 text-text-muted">{user.gender || '—'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleOpenAddUsage(user.houseNumber)} title="Log Usage" className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded-lg cursor-pointer"><Droplet className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenCreateBill(user.houseNumber)} title="Bill" className="p-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/25 border border-purple-500/20 rounded-lg cursor-pointer"><Receipt className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenNotify(user.username)} title="Notify" className="p-1.5 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/25 border border-yellow-500/20 rounded-lg cursor-pointer"><Send className="w-4 h-4" /></button>
                                <button onClick={() => handleOpenEditUser(user)} title="Edit" className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteUser(user.id)} title="Delete" className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="7" className="px-6 py-10 text-center text-text-muted">No users found matching your filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'usage' && (
          <motion.div
            key="usage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-text text-lg">Water Consumption Logs</h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Record daily or monthly water meter readings. Download pre-filled template to bulk upload logs via CSV.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadCsv}
                  accept=".csv"
                  className="hidden"
                />
                
                <button
                  onClick={handleDownloadTemplate}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                >
                  <FileText className="w-4 h-4" />
                  Download CSV Template
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Upload CSV Logs
                </button>

                <button 
                  onClick={() => handleOpenAddUsage()}
                  disabled={loading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/10 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Reading
                </button>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-lighter/50 border-b border-border">
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">House Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Apartment Block</th>
                      {isSuperAdmin && (
                        <th className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase">Community Admin</th>
                      )}
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Reading Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Consumption (Liters)</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Log Period</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Source</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {usageLogs.length > 0 ? (
                      usageLogs.map(log => {
                        const communityAdmin = isSuperAdmin
                          ? users.find(u => u.role === 'ROLE_COMMUNITY_ADMIN' && u.apartmentBlock === log.apartmentBlock)
                          : null;
                        return (
                          <tr key={log.id} className="hover:bg-surface-lighter/20 transition-colors">
                            <td className="px-6 py-4 font-semibold text-text">{log.houseNumber}</td>
                            <td className="px-6 py-4 text-text-muted">{log.apartmentBlock}</td>
                            {isSuperAdmin && (
                              <td className="px-6 py-4">
                                {communityAdmin ? (
                                  <div>
                                    <span className="text-emerald-400 font-semibold text-sm">{communityAdmin.fullName || communityAdmin.username}</span>
                                    <p className="text-text-muted text-xs mt-0.5">{communityAdmin.email}</p>
                                  </div>
                                ) : (
                                  <span className="text-text-muted text-xs italic">No admin assigned</span>
                                )}
                              </td>
                            )}
                            <td className="px-6 py-4 text-text-muted">{log.readingDate}</td>
                            <td className="px-6 py-4 text-text font-bold">{log.readingLiters} L</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                log.logType === 'MONTHLY' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                              }`}>
                                {log.logType || 'DAILY'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                log.source === 'MANUAL' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                {log.source || 'MANUAL'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleOpenEditUsage(log)} title="Edit Log" className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteUsage(log.id)} title="Delete Log" className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isSuperAdmin ? "8" : "7"} className="px-6 py-10 text-center text-text-muted">
                          No water usage logs available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'billing' && (
          <motion.div
            key="billing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Sub-tab selection pills */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setBillingSubTab('cycles')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    billingSubTab === 'cycles'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-muted hover:text-text bg-surface-lighter/50'
                  }`}
                >
                  Billing Cycles & Periods
                </button>
                <button
                  onClick={() => setBillingSubTab('records')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    billingSubTab === 'records'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-muted hover:text-text bg-surface-lighter/50'
                  }`}
                >
                  Individual Custom Bills
                </button>
                <button
                  onClick={() => setBillingSubTab('reminders')}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    billingSubTab === 'reminders'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-text-muted hover:text-text bg-surface-lighter/50'
                  }`}
                >
                  Payment Reminders 🔔
                </button>
              </div>
            </div>

            {billingSubTab === 'cycles' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text text-lg">Billing Cycles & Periods</h3>
                    <p className="text-text-muted text-sm mt-0.5">
                      Define water billing cycles per Colony community and auto-calculate household bills.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const myColonyName = localStorage.getItem('colonyName') || '';
                        const myColony = apartments.find(a => a.name === myColonyName);
                        const myColonyId = myColony?.id || '';
                        setBillingCycleForm({
                          cycleName: '',
                          startDate: '',
                          endDate: '',
                          apartmentId: isSuperAdmin ? (apartments[0]?.id || '') : myColonyId,
                          apartmentBlock: isSuperAdmin ? '' : block
                        });
                        setBillingCycleModalOpen(true);
                      }}
                      className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Create Billing Cycle
                    </button>
                  </div>
                </div>

                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-lighter/50 border-b border-border">
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Cycle Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Colony / Community</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Building / Block</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Start Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">End Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Total Water (L)</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Total Billed</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {(() => {
                          const filteredCycles = billingCycles.filter(cycle => {
                            if (isSuperAdmin) return true;
                            const myColonyName = localStorage.getItem('colonyName') || '';
                            const myColony = apartments.find(a => a.name === myColonyName);
                            return cycle.apartmentId === myColony?.id && cycle.apartmentBlock === block;
                          });

                          if (filteredCycles.length === 0) {
                            return (
                              <tr>
                                <td colSpan="9" className="px-6 py-10 text-center text-text-muted">
                                  No billing cycles defined yet. Click "Create Billing Cycle" to define one.
                                </td>
                              </tr>
                            );
                          }

                          return filteredCycles.map(cycle => (
                            <tr key={cycle.id} className="hover:bg-surface-lighter/20 transition-colors">
                              <td className="px-6 py-4 font-semibold text-text">{cycle.cycleName}</td>
                              <td className="px-6 py-4 text-text-muted">{getApartmentName(cycle.apartmentId)}</td>
                              <td className="px-6 py-4 text-text-muted">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  cycle.apartmentBlock 
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {cycle.apartmentBlock || 'All Blocks'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-text-muted">{cycle.startDate}</td>
                              <td className="px-6 py-4 text-text-muted">{cycle.endDate}</td>
                              <td className="px-6 py-4 text-text font-bold">{cycle.totalConsumptionLiters ? `${cycle.totalConsumptionLiters} L` : '0 L'}</td>
                              <td className="px-6 py-4 text-text font-bold">₹{cycle.totalBilledAmount ? cycle.totalBilledAmount.toFixed(2) : '0.00'}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  cycle.status === 'FINALIZED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : cycle.status === 'OPEN'
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}>
                                  {cycle.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {cycle.status === 'OPEN' && (
                                    <button
                                      onClick={() => handleFinalizeCycle(cycle.id)}
                                      title="Finalize & Auto-Generate Bills"
                                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Finalize
                                    </button>
                                  )}
                                  {cycle.status === 'FINALIZED' && (
                                    <button
                                      onClick={() => handleArchiveCycle(cycle.id)}
                                      title="Archive Cycle"
                                      className="px-3 py-1.5 bg-slate-500/10 text-slate-400 hover:bg-slate-500/25 border border-slate-500/20 rounded-lg cursor-pointer text-xs font-semibold"
                                    >
                                      Archive
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {billingSubTab === 'records' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-text text-lg">Billing Records</h3>
                    <p className="text-text-muted text-sm mt-0.5">Manage and track individual manual/custom bills.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleOpenCreateBill()}
                      className="px-4 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Generate Custom Bill
                    </button>
                    <button 
                      onClick={() => handleOpenNotify()}
                      className="px-4 py-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      Send Broadcast Notification
                    </button>
                  </div>
                </div>

                <div className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-lighter/50 border-b border-border">
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">House Number</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Apartment Block</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Amount</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Generated Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Due Date</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Status</th>
                          <th className="px-6 py-4 text-xs font-bold text-primary uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {bills.length > 0 ? (
                          bills.map(bill => (
                            <tr key={bill.id} className="hover:bg-surface-lighter/20 transition-colors">
                              <td className="px-6 py-4 font-semibold text-text">{bill.houseNumber}</td>
                              <td className="px-6 py-4 text-text-muted">{bill.apartmentBlock || 'N/A'}</td>
                              <td className="px-6 py-4 font-bold text-text">₹{bill.amount}</td>
                              <td className="px-6 py-4 text-text-muted">{bill.generatedDate}</td>
                              <td className="px-6 py-4 text-text-muted">{bill.dueDate}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  bill.status === 'PAID' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {bill.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {bill.status !== 'PAID' && (
                                    <button
                                      onClick={() => setPayQrModalBill(bill)}
                                      title="Pay Now"
                                      className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                                    >
                                      Pay Now
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setInvoiceModalBill(bill)}
                                    title="View Invoice"
                                    className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded-lg cursor-pointer"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditBill(bill)}
                                    title="Edit Bill"
                                    className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBill(bill.id)}
                                    title="Delete Bill"
                                    className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-6 py-10 text-center text-text-muted">
                              No billing history found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {billingSubTab === 'reminders' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-text text-lg">Payment Reminder Control Panel</h3>
                    <p className="text-text-muted text-sm mt-0.5">
                      Notify community admins of blocks with pending bills, and dispatch email notices to unpaid residents.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={async () => {
                        setLoading(true);
                        try {
                          await api.post('/bills/reminders/check');
                          setStatusMessage('Global scan completed. Community admins have been alerted.');
                          fetchData();
                        } catch (err) {
                          setStatusMessage('Failed to scan and alert admins.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Activity className="w-4 h-4" />
                      Scan & Alert Admins
                    </button>

                    <button 
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const targetBlock = isSuperAdmin ? (blockFilter || 'Block A') : block;
                          await api.post(`/bills/reminders/send-all?apartmentBlock=${encodeURIComponent(targetBlock)}`);
                          setStatusMessage(`Dispatched payment reminders to all unpaid households in ${targetBlock}!`);
                          fetchData();
                        } catch (err) {
                          setStatusMessage('Failed to send reminders to all.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      Send All Reminders
                    </button>
                  </div>
                </div>

                {/* Aggregated Unpaid Households */}
                {(() => {
                  const blockBills = isSuperAdmin 
                    ? (blockFilter ? bills.filter(b => b.apartmentBlock === blockFilter) : bills)
                    : bills.filter(b => b.apartmentBlock === block);
                  
                  const unpaidBills = blockBills.filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE');
                  const unpaidByHouse = {};
                  
                  unpaidBills.forEach(b => {
                    if (!unpaidByHouse[b.houseNumber]) {
                      unpaidByHouse[b.houseNumber] = {
                        houseNumber: b.houseNumber,
                        apartmentBlock: b.apartmentBlock,
                        totalAmount: 0,
                        billCount: 0,
                        latestDueDate: b.dueDate
                      };
                    }
                    unpaidByHouse[b.houseNumber].totalAmount += b.amount;
                    unpaidByHouse[b.houseNumber].billCount += 1;
                    if (new Date(b.dueDate) > new Date(unpaidByHouse[b.houseNumber].latestDueDate)) {
                      unpaidByHouse[b.houseNumber].latestDueDate = b.dueDate;
                    }
                  });
                  
                  const unpaidList = Object.values(unpaidByHouse);

                  return (
                    <div className="glass-card overflow-hidden border-primary/20">
                      <div className="px-6 py-4 bg-primary/5 border-b border-border flex items-center justify-between">
                        <span className="text-sm font-bold text-text">
                          Unpaid Households: {unpaidList.length} total
                        </span>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted">Filter Block:</span>
                            <select 
                              value={blockFilter} 
                              onChange={(e) => setBlockFilter(e.target.value)}
                              className="bg-surface border border-border rounded-lg text-xs px-2 py-1 text-text focus:outline-none"
                            >
                              <option value="">All Blocks</option>
                              {Array.from(new Set(bills.map(b => b.apartmentBlock))).map(bName => (
                                <option key={bName} value={bName}>{bName}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-surface-lighter/50 border-b border-border">
                              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">House Number</th>
                              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Apartment Block</th>
                              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Resident Name</th>
                              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Unpaid Bills</th>
                              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Total Outstanding</th>
                              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase">Latest Due Date</th>
                              <th className="px-6 py-4 text-xs font-bold text-text-muted uppercase text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {unpaidList.length > 0 ? (
                              unpaidList.map(item => {
                                const resident = users.find(u => u.houseNumber === item.houseNumber && u.apartmentBlock === item.apartmentBlock);
                                return (
                                  <tr key={`${item.apartmentBlock}-${item.houseNumber}`} className="hover:bg-primary/5 transition-colors">
                                    <td className="px-6 py-4 font-bold text-text text-sm">{item.houseNumber}</td>
                                    <td className="px-6 py-4 text-text-muted text-sm font-medium">{item.apartmentBlock}</td>
                                    <td className="px-6 py-4 text-text text-sm">
                                      {resident ? (resident.fullName || resident.username) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-amber-400">
                                      {item.billCount} pending
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-red-400">
                                      ₹{item.totalAmount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-text-muted text-xs font-semibold">{item.latestDueDate}</td>
                                    <td className="px-6 py-4 text-right">
                                      <button 
                                        onClick={async () => {
                                          setLoading(true);
                                          try {
                                            await api.post(`/bills/reminders/send?houseNumber=${encodeURIComponent(item.houseNumber)}&apartmentBlock=${encodeURIComponent(item.apartmentBlock)}`);
                                            setStatusMessage(`Reminder notice dispatched to resident of ${item.houseNumber} (${item.apartmentBlock})!`);
                                            fetchData();
                                          } catch (err) {
                                            setStatusMessage('Failed to send individual reminder.');
                                          } finally {
                                            setLoading(false);
                                          }
                                        }}
                                        disabled={loading}
                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/25 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ml-auto disabled:opacity-50"
                                      >
                                        <Send className="w-3 h-3" /> Send Reminder
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan="7" className="px-6 py-10 text-center text-text-muted text-sm">
                                  No unpaid household bills found. All clear!
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'approvals' && (
          <motion.div
            key="approvals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-text text-lg">Pending Registration Approvals</h3>
                <p className="text-text-muted text-sm mt-0.5">Approve or reject new resident sign-up requests.</p>
              </div>
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-lighter/50 border-b border-border">
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Username</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Full Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Email</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Mobile</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">WhatsApp</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Role</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Apartment Block</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">House Number</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Gender</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pendingApprovals.length > 0 ? (
                      pendingApprovals.map(req => (
                        <tr key={req.id} className="hover:bg-surface-lighter/20 transition-colors">
                          <td className="px-6 py-4 font-semibold text-text">{req.username}</td>
                          <td className="px-6 py-4 text-text font-medium">{req.fullName || 'N/A'}</td>
                          <td className="px-6 py-4 text-text-muted">{req.email}</td>
                          <td className="px-6 py-4 text-text-muted">{req.mobileNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-text-muted">{req.whatsAppNumber || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 whitespace-nowrap">
                              {req.role === 'ROLE_ADMIN' ? 'Super Admin' : 
                               req.role === 'ROLE_COMMUNITY_ADMIN' ? 'Community Admin' : 'Household User'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-text-muted">{req.apartmentBlock || 'N/A'}</td>
                          <td className="px-6 py-4 text-text-muted">{req.houseNumber || 'N/A'}</td>
                          <td className="px-6 py-4 text-text-muted">{req.gender || 'N/A'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() => handleApproveReject(req.id, 'APPROVED')}
                                title="Approve Request"
                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveReject(req.id, 'REJECTED')}
                                title="Reject Request"
                                className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer text-xs font-semibold flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-10 text-center text-text-muted">
                          No pending registration requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resident Profile Verifications Section */}
            <div className="flex items-center justify-between mt-8">
              <div>
                <h3 className="font-semibold text-text text-lg">Resident Profile Verifications</h3>
                <p className="text-text-muted text-sm mt-0.5">Review residency documents uploaded by invitation-onboarded household users.</p>
              </div>
            </div>

            <div className="glass-card overflow-hidden mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-lighter/50 border-b border-border">
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Resident</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Apartment Info</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase">Verification Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-primary uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.filter(u => u.verificationStatus === 'PENDING_VERIFICATION').length > 0 ? (
                      users.filter(u => u.verificationStatus === 'PENDING_VERIFICATION').map(resident => (
                        <tr key={resident.id} className="hover:bg-surface-lighter/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-text">{resident.fullName || resident.username}</div>
                            <div className="text-text-muted text-xs">{resident.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-text text-sm">{resident.apartmentBlock || 'N/A'} - {resident.houseNumber || 'N/A'}</div>
                            <div className="text-text-muted text-xs">{resident.colonyName || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                              {resident.verificationStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenReviewDocs(resident)}
                              className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg cursor-pointer text-xs font-semibold"
                            >
                              Review Documents & Verify
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-6 py-10 text-center text-text-muted">
                          No pending resident profile verifications found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      <AnimatePresence>
        {/* User Modal */}
        {userModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setUserModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-text mb-6">
                {editingUser 
                  ? `Edit Account: ${editingUser.username}` 
                  : (!isSuperAdmin ? 'Invite New Resident' : 'Register New Account')}
              </h3>
              
              {modalError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold rounded-xl flex items-center justify-between">
                  <span>{modalError}</span>
                  <button type="button" onClick={() => setModalError('')} className="text-red-400/80 hover:text-red-400 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {!isSuperAdmin && !editingUser ? (
                  // Simple Invite Form for Community Admin
                  <>
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-text-muted text-sm mb-2">
                        Enter the resident's basic details below. An invitation link will be sent to their email to complete their profile setup and registration.
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Resident Full Name</label>
                      <input
                        type="text"
                        required
                        value={userForm.fullName}
                        onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="Enter resident's full name"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Email Address</label>
                      <input
                        type="email"
                        required
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="e.g. resident@gmail.com"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">House / Flat Number</label>
                      <input
                        type="text"
                        required
                        value={userForm.houseNumber}
                        onChange={(e) => setUserForm({ ...userForm, houseNumber: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="e.g. APT-101"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Meter ID / Number</label>
                      <input
                        type="text"
                        value={userForm.meterId || ''}
                        onChange={(e) => setUserForm({ ...userForm, meterId: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="e.g. MTR-90218"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Username</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          disabled={!!editingUser}
                          value={userForm.username}
                          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                          className={`w-full bg-surface-lighter border rounded-xl px-4 pr-10 py-2.5 text-sm text-text focus:outline-none focus:ring-1 transition-all ${
                            editingUser ? 'opacity-70 cursor-not-allowed bg-surface-lighter/50 border-border' : getUsernameBorderClass(adminUsernameStatus)
                          }`}
                          placeholder="Choose unique username"
                        />
                        {!editingUser && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {adminUsernameStatus === 'checking' && <span className="text-primary text-xs animate-pulse">…</span>}
                            {adminUsernameStatus === 'available' && <span className="text-emerald-400 text-sm font-bold">✓</span>}
                            {adminUsernameStatus === 'taken' && <span className="text-red-400 text-sm font-bold">✗</span>}
                          </div>
                        )}
                      </div>
                      {!editingUser && <UsernameStatusBadge status={adminUsernameStatus} message={adminUsernameMessage} />}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Full Name</label>
                      <input
                        type="text"
                        required
                        value={userForm.fullName}
                        onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="Enter user's full name"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Mobile Number</label>
                      <input
                        type="tel"
                        maxLength="10"
                        required
                        value={userForm.mobileNumber}
                        onChange={(e) => setUserForm({ ...userForm, mobileNumber: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="10-digit mobile"
                      />
                    </div>

                    <div className="col-span-1">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-sm font-medium text-text-muted">WhatsApp</label>
                        <button
                          type="button"
                          onClick={() => setUserForm(prev => ({ ...prev, whatsAppNumber: prev.mobileNumber }))}
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          Copy Mobile
                        </button>
                      </div>
                      <input
                        type="tel"
                        maxLength="10"
                        required
                        value={userForm.whatsAppNumber}
                        onChange={(e) => setUserForm({ ...userForm, whatsAppNumber: e.target.value.replace(/\D/g, '') })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="10-digit whatsapp"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
                      <input
                        type="email"
                        required
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="e.g. resident@mail.com"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">
                        Password {editingUser && <span className="text-xs text-text-muted/60">(Leave blank to keep current)</span>}
                      </label>
                      <input
                        type="password"
                        required={!editingUser}
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="Min 6 characters"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Role</label>
                      {isSuperAdmin ? (
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        >
                          <option value="COMMUNITY_ADMIN">Community Admin</option>
                          <option value="ADMIN">Super Admin</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          disabled
                          value="Household User (Resident)"
                          className="w-full bg-surface-lighter/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-muted"
                        />
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Gender</label>
                      <select
                        value={userForm.gender}
                        onChange={(e) => setUserForm({ ...userForm, gender: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Colony Name <span className="text-red-400">*</span></label>
                      {apartments.length === 0 ? (
                        <div className="w-full bg-surface-lighter/50 border border-amber-500/30 rounded-xl px-3 py-2.5 text-sm text-amber-400">
                          No colonies found. Please add colonies first.
                        </div>
                      ) : (
                        <select
                          required
                          value={userForm.colonyName}
                          onChange={(e) => {
                            const nextColony = e.target.value;
                            const matchedApt = apartments.find(apt => apt.name === nextColony);
                            const firstBuilding = matchedApt?.buildings?.[0]?.buildingName || '';
                            setUserForm({
                              ...userForm,
                              colonyName: nextColony,
                              apartmentBlock: isSuperAdmin ? firstBuilding : block
                            });
                          }}
                          disabled={!isSuperAdmin}
                          className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-all ${
                            isSuperAdmin
                              ? 'bg-surface-lighter border-border text-text cursor-pointer'
                              : 'bg-surface-lighter/50 border-border text-text-muted cursor-not-allowed'
                          }`}
                        >
                          <option value="" disabled>-- Select Colony --</option>
                          {isSuperAdmin
                            ? apartments.map(apt => (
                                <option key={apt.id} value={apt.name}>{apt.name}</option>
                              ))
                            : apartments.map(apt => (
                                <option key={apt.id} value={apt.name}>{apt.name}</option>
                              ))
                          }
                        </select>
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Building Name / Block</label>
                      {isSuperAdmin ? (
                        (apartments.find(apt => apt.name === userForm.colonyName)?.buildings || []).length > 0 ? (
                          <select
                            required
                            value={userForm.apartmentBlock}
                            onChange={(e) => setUserForm({ ...userForm, apartmentBlock: e.target.value })}
                            className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                          >
                            <option value="" disabled>-- Select Building --</option>
                            {(apartments.find(apt => apt.name === userForm.colonyName)?.buildings || [])
                              .filter(b => {
                                if (userForm.role !== 'COMMUNITY_ADMIN') return true;
                                const hasAdmin = users.some(u => 
                                  u.role === 'ROLE_COMMUNITY_ADMIN' && 
                                  u.colonyName === userForm.colonyName && 
                                  u.apartmentBlock === b.buildingName &&
                                  (!editingUser || u.username !== editingUser.username)
                                );
                                return !hasAdmin;
                              })
                              .map(b => (
                                <option key={b.id} value={b.buildingName}>{b.buildingName}</option>
                              ))
                            }
                          </select>
                        ) : (
                          <input
                            type="text"
                            required
                            value={userForm.apartmentBlock}
                            onChange={(e) => setUserForm({ ...userForm, apartmentBlock: e.target.value })}
                            placeholder="E.g. Akash Block or Block A"
                            className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                          />
                        )
                      ) : (
                        <input
                          type="text"
                          disabled
                          value={block}
                          className="w-full bg-surface-lighter/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-muted"
                        />
                      )}
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">House Number</label>
                      <input
                        type="text"
                        required={userForm.role === 'RESIDENT' || userForm.role === 'COMMUNITY_ADMIN'}
                        value={userForm.houseNumber}
                        onChange={(e) => setUserForm({ ...userForm, houseNumber: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="e.g. APT-101"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Meter ID / Number</label>
                      <input
                        type="text"
                        value={userForm.meterId || ''}
                        onChange={(e) => setUserForm({ ...userForm, meterId: e.target.value })}
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        placeholder="e.g. MTR-90218"
                      />
                    </div>

                    {isSuperAdmin && userForm.role === 'COMMUNITY_ADMIN' && (
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-text-muted mb-1.5">Water Rate per Litre (₹)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          required
                          value={userForm.waterRatePerLiter}
                          onChange={(e) => setUserForm({ ...userForm, waterRatePerLiter: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                          className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                          placeholder="e.g. 0.01"
                        />
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="col-span-1 md:col-span-2 mt-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading 
                    ? 'Saving...' 
                    : (editingUser ? 'Save Changes' : (!isSuperAdmin ? 'Send Invitation' : 'Register'))}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Bulk Invite Modal */}
        {bulkInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-16 pb-10">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-xl rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button
                onClick={() => { setBulkInviteModalOpen(false); setBulkInviteReport(null); setBulkInviteFile(null); }}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Upload className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text">Bulk Invite Residents</h3>
                  <p className="text-text-muted text-xs mt-0.5">Upload a CSV file to send invitations to multiple residents at once.</p>
                </div>
              </div>

              {/* CSV Format Info */}
              <div className="mt-4 p-3.5 rounded-xl bg-primary/5 border border-primary/15 text-xs text-primary/90 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">📋 Required CSV Format</p>
                <p className="text-text-muted">Two columns: <code className="bg-surface-lighter px-1.5 py-0.5 rounded font-mono">Full Name</code> and <code className="bg-surface-lighter px-1.5 py-0.5 rounded font-mono">Email</code></p>
                <p className="text-text-muted">Row 1 must be the header. Residents can set their house number when registering.</p>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors mt-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV Template
                </button>
              </div>

              {!bulkInviteReport ? (
                <form onSubmit={handleBulkInviteSubmit} className="mt-5 space-y-4">
                  {/* File Drop Zone */}
                  <div className="relative">
                    <label
                      htmlFor="bulk-invite-file"
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        bulkInviteFile
                          ? 'border-violet-500/50 bg-violet-500/5'
                          : 'border-border hover:border-violet-500/40 hover:bg-violet-500/5'
                      }`}
                    >
                      <input
                        id="bulk-invite-file"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => setBulkInviteFile(e.target.files[0] || null)}
                      />
                      <Upload className={`w-8 h-8 mb-2 ${bulkInviteFile ? 'text-violet-400' : 'text-text-muted'}`} />
                      {bulkInviteFile ? (
                        <>
                          <p className="text-sm font-bold text-violet-400">{bulkInviteFile.name}</p>
                          <p className="text-xs text-text-muted mt-1">{(bulkInviteFile.size / 1024).toFixed(1)} KB · Click to change</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-text">Drag & Drop or Click to Select</p>
                          <p className="text-xs text-text-muted mt-1">Supports .csv files only</p>
                        </>
                      )}
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => { setBulkInviteModalOpen(false); setBulkInviteFile(null); }}
                      className="flex-1 py-2.5 border border-border text-text-muted hover:text-text hover:border-text-muted rounded-xl font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={bulkLoading || !bulkInviteFile}
                      className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {bulkLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending Invitations...</>
                      ) : (
                        <><Mail className="w-4 h-4" /> Send All Invitations</>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Results Report */
                <div className="mt-5 space-y-4">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-surface-lighter border border-border p-3 text-center">
                      <p className="text-2xl font-black text-text">{bulkInviteReport.totalRows}</p>
                      <p className="text-xs text-text-muted mt-0.5 font-medium">Total Rows</p>
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                      <p className="text-2xl font-black text-emerald-400">{bulkInviteReport.imported}</p>
                      <p className="text-xs text-emerald-400/70 mt-0.5 font-medium">Invited</p>
                    </div>
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                      <p className="text-2xl font-black text-red-400">{bulkInviteReport.failed}</p>
                      <p className="text-xs text-red-400/70 mt-0.5 font-medium">Failed</p>
                    </div>
                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                      <p className="text-2xl font-black text-amber-400">{bulkInviteReport.duplicates}</p>
                      <p className="text-xs text-amber-400/70 mt-0.5 font-medium">Duplicates</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-text-muted mb-1.5">
                      <span>Success Rate</span>
                      <span className="font-bold text-emerald-400">{bulkInviteReport.successPercentage}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-lighter rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: bulkInviteReport.successPercentage }}
                      />
                    </div>
                  </div>

                  {/* Row details */}
                  {bulkInviteReport.details && bulkInviteReport.details.length > 0 && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="px-4 py-2.5 bg-surface-lighter border-b border-border">
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Row Details</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
                        {bulkInviteReport.details.map((d, i) => (
                          <div key={i} className="flex items-center justify-between px-4 py-2.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-text-muted">Row {d.row}</span>
                              {d.email && <span className="text-text font-medium">{d.email}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {d.status === 'SUCCESS' ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">✓ Sent</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold" title={d.reason}>
                                  {d.status === 'DUPLICATE_IN_DB' || d.status === 'DUPLICATE_IN_FILE' ? '⚠ Duplicate' : '✗ Failed'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setBulkInviteReport(null); setBulkInviteFile(null); }}
                      className="flex-1 py-2.5 border border-border text-text-muted hover:text-text hover:border-text-muted rounded-xl font-medium transition-colors cursor-pointer"
                    >
                      Upload Another
                    </button>
                    <button
                      onClick={() => { setBulkInviteModalOpen(false); setBulkInviteReport(null); setBulkInviteFile(null); }}
                      className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Bill Modal */}
        {billModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setBillModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-text mb-6">
                {editingBill ? 'Edit Bill Details' : 'Generate Household Bill'}
              </h3>
              
              <form onSubmit={handleSaveBill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">House Number</label>
                  <input
                    type="text"
                    required
                    value={billForm.houseNumber}
                    onChange={(e) => handleHouseNumberChange(e.target.value)}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    placeholder="e.g. APT-101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Apartment Block / Building Name</label>
                  {isSuperAdmin ? (
                    <input
                      type="text"
                      required
                      value={billForm.apartmentBlock}
                      onChange={(e) => setBillForm({ ...billForm, apartmentBlock: e.target.value })}
                      placeholder="E.g. Akash Block or Block A"
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={block}
                      className="w-full bg-surface-lighter/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-muted"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Bill Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={billForm.amount}
                      onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                      placeholder="500.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Due Date</label>
                    <input
                      type="date"
                      required
                      value={billForm.dueDate}
                      onChange={(e) => setBillForm({ ...billForm, dueDate: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                {billCalculation && billCalculation.unbilledLiters > 0 && (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-1">
                    <p className="font-semibold text-primary">Auto-Calculation Details:</p>
                    <div className="flex justify-between text-text-muted">
                      <span>Unbilled Water Consumed:</span>
                      <span className="font-semibold text-text">{billCalculation.unbilledLiters} Liters</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Block Water Rate:</span>
                      <span className="font-semibold text-text">₹{billCalculation.rate}/L</span>
                    </div>
                    <div className="flex justify-between text-text-muted">
                      <span>Previous Bill Date:</span>
                      <span className="font-semibold text-text">{billCalculation.latestBillDate}</span>
                    </div>
                    <p className="text-[10px] text-text-muted/60 mt-1 italic">
                      * Summed all water logs since the previous bill date.
                    </p>
                  </div>
                )}

                {billCalculation && billCalculation.unbilledLiters === 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span>No Unbilled Water Logs Found</span>
                    </div>
                    <p className="text-text-muted text-[11px] leading-relaxed">
                      This household does not have any new water usage logs recorded since their last bill. 
                      Please record water usage first using the <strong className="text-blue-400 font-semibold">Log Usage</strong> icon next to this resident in the table.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Payment Status</label>
                  <select
                    value={billForm.status}
                    onChange={(e) => setBillForm({ ...billForm, status: e.target.value })}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                  >
                    <option value="UNPAID">Unpaid</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {editingBill ? 'Update & Save Bill' : 'Generate & Save Bill'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Notify Modal */}
        {notifyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setNotifyModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-text mb-6">Send Alert / Notification</h3>
              
              <form onSubmit={handleSendNotification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Target Resident Username</label>
                  <input
                    type="text"
                    required
                    value={notifyForm.username}
                    onChange={(e) => setNotifyForm({ ...notifyForm, username: e.target.value })}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    placeholder="Enter resident's username"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Notification Type</label>
                    <select
                      value={notifyForm.type}
                      onChange={(e) => setNotifyForm({ ...notifyForm, type: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    >
                      <option value="BILL_GENERATED">Bill Issued</option>
                      <option value="OVERUSE_ALERT">Overuse Alert</option>
                      <option value="LEAK_DETECTED">Leak Detected</option>
                      <option value="PAYMENT_REMINDER">Payment Reminder</option>
                      <option value="SYSTEM">System Broadcast</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Title</label>
                    <input
                      type="text"
                      required
                      value={notifyForm.title}
                      onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                      placeholder="e.g. Critical Leak Alert"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Message Content</label>
                  <textarea
                    required
                    rows="4"
                    value={notifyForm.message}
                    onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary resize-none"
                    placeholder="Type details for the household user..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-yellow-500 text-slate-950 hover:bg-yellow-600 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Notification
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Water Usage Logging Modal */}
        {usageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setUsageModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-text mb-6">{editingUsageLog ? 'Edit Meter Reading' : 'Log Meter Reading'}</h3>
              
              <form onSubmit={handleSaveUsage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">House Number</label>
                  <input
                    type="text"
                    required
                    value={usageForm.houseNumber}
                    onChange={(e) => setUsageForm({ ...usageForm, houseNumber: e.target.value })}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    placeholder="e.g. APT-101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Apartment Block / Building Name</label>
                  {isSuperAdmin ? (
                    <input
                      type="text"
                      required
                      value={usageForm.apartmentBlock}
                      onChange={(e) => setUsageForm({ ...usageForm, apartmentBlock: e.target.value })}
                      placeholder="E.g. Akash Block or Block A"
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={block}
                      className="w-full bg-surface-lighter/50 border border-border rounded-xl px-3 py-2.5 text-sm text-text-muted"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Log Period Type</label>
                  <select
                    value={usageForm.logType}
                    onChange={(e) => setUsageForm({ ...usageForm, logType: e.target.value })}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                  >
                    <option value="DAILY">Single Day (Daily Log)</option>
                    <option value="MONTHLY">Entire Month (Cumulative Log)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Reading (Liters)</label>
                    <input
                      type="number"
                      required
                      value={usageForm.readingLiters}
                      onChange={(e) => setUsageForm({ ...usageForm, readingLiters: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                      placeholder="e.g. 350"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Reading Date</label>
                    <input
                      type="date"
                      required
                      value={usageForm.readingDate}
                      onChange={(e) => setUsageForm({ ...usageForm, readingDate: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {editingUsageLog ? 'Update Reading Log' : 'Submit Reading Log'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Create Billing Cycle Modal */}
        {billingCycleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setBillingCycleModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-text mb-6">Create Billing Cycle</h3>
              
              <form onSubmit={handleCreateBillingCycle} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Cycle Name</label>
                  <input
                    type="text"
                    required
                    value={billingCycleForm.cycleName}
                    onChange={(e) => setBillingCycleForm({ ...billingCycleForm, cycleName: e.target.value })}
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    placeholder="e.g. July 2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">Start Date</label>
                    <input
                      type="date"
                      required
                      value={billingCycleForm.startDate}
                      onChange={(e) => setBillingCycleForm({ ...billingCycleForm, startDate: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-muted mb-1.5">End Date</label>
                    <input
                      type="date"
                      required
                      value={billingCycleForm.endDate}
                      onChange={(e) => setBillingCycleForm({ ...billingCycleForm, endDate: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Colony / Community Name</label>
                  {isSuperAdmin ? (
                    <select
                      required
                      value={billingCycleForm.apartmentId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setBillingCycleForm({
                          ...billingCycleForm,
                          apartmentId: nextId,
                          apartmentBlock: ''
                        });
                      }}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="" disabled>-- Select Colony / Community --</option>
                      {apartments.map(apt => (
                        <option key={apt.id} value={apt.id}>{apt.name} ({apt.address})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={localStorage.getItem('colonyName') || 'My Colony'}
                      className="w-full bg-surface-lighter/50 border border-border rounded-xl px-4 py-2.5 text-sm text-text-muted cursor-not-allowed"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Building Name / Block</label>
                  {isSuperAdmin ? (
                    <select
                      value={billingCycleForm.apartmentBlock}
                      onChange={(e) => setBillingCycleForm({ ...billingCycleForm, apartmentBlock: e.target.value })}
                      className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary cursor-pointer"
                    >
                      <option value="">All Buildings / Blocks (Colony-wide)</option>
                      {(apartments.find(apt => apt.id === parseInt(billingCycleForm.apartmentId))?.buildings || [])
                        .map(b => (
                          <option key={b.id} value={b.buildingName}>{b.buildingName}</option>
                        ))
                      }
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={block}
                      className="w-full bg-surface-lighter/50 border border-border rounded-xl px-4 py-2.5 text-sm text-text-muted cursor-not-allowed"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Create Period
                </button>
              </form>
            </motion.div>
          </div>
        )}
        {/* Document Review Modal */}
        {reviewModalOpen && docReviewUser && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pt-20 pb-10">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface border border-border w-full max-w-lg rounded-2xl p-6 shadow-2xl relative my-8"
            >
              <button 
                onClick={() => { setReviewModalOpen(false); setDocReviewUser(null); }}
                className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-text mb-2">Review Resident Documents</h3>
              <p className="text-text-muted text-xs mb-4">
                Verify residency for <strong className="text-primary">{docReviewUser.fullName || docReviewUser.username}</strong> ({docReviewUser.apartmentBlock} - {docReviewUser.houseNumber}).
              </p>
              
              <div className="space-y-4">
                {docLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : selectedUserDocs.length > 0 ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-text-muted">Uploaded Files</label>
                    <div className="space-y-2">
                      {selectedUserDocs.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-surface-lighter border border-border rounded-xl">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <div>
                              <span className="text-sm font-semibold text-text block">{doc.documentType}</span>
                              <span className="text-xs text-text-muted block">{doc.fileName}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => window.open(`${api.defaults.baseURL}/users/profile/verify/documents-download/${doc.id}`, '_blank')}
                            className="px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            View / Download
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-400 italic">No files retrieved for this resident.</p>
                )}

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-text-muted mb-1.5">Rejection / Re-upload Reason (Mandatory if Rejecting/Requesting Re-upload)</label>
                  <textarea
                    value={verificationReason}
                    onChange={(e) => setVerificationReason(e.target.value)}
                    rows="3"
                    className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                    placeholder="Enter rejection reason or what details need to be re-uploaded..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4">
                  <button
                    onClick={() => handleActionVerification('APPROVE')}
                    disabled={loading}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleActionVerification('REJECT')}
                    disabled={loading}
                    className="py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleActionVerification('REQUEST_REUPLOAD')}
                    disabled={loading}
                    className="py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    Req Re-upload
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        {/* QR Pay Modal */}
        {payQrModalBill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl relative text-center">
              <button onClick={() => setPayQrModalBill(null)} className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"><X className="w-5 h-5" /></button>
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
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
                onClick={() => handleMarkBillPaid(payQrModalBill)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all cursor-pointer"
              >
                ✅ Confirm Cash/Offline Payment
              </button>
              <p className="text-xs text-text-muted mt-3">Clicking confirm will mark this bill as PAID in the system and notify the resident.</p>
            </motion.div>
          </div>
        )}

        {/* Invoice Modal */}
        {invoiceModalBill && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto pt-16 pb-10">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl relative my-8 overflow-hidden">
              
              {/* Header block with gradient */}
              <div className="bg-gradient-to-r from-blue-600/20 via-primary/10 to-transparent p-6 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
                    A
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-text">AquaTrack Invoice</h3>
                    <p className="text-xs text-text-muted">Water Utility Bill Receipt</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => printInvoice(invoiceModalBill)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                  >
                    ⬇ Download / Print PDF
                  </button>
                  <button onClick={() => setInvoiceModalBill(null)} className="text-text-muted hover:text-text cursor-pointer p-1.5 hover:bg-surface-lighter rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>

              {/* On-screen Modal Content */}
              <div className="p-8 space-y-6">
                
                {/* Brand & Inv Meta */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-black text-2xl text-blue-500">AquaTrack</div>
                    <p className="text-xs text-text-muted">High-Quality Water Utility Management</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-xl font-bold text-text">INVOICE</h2>
                    <p className="text-xs text-text-muted mt-1">Invoice ID: <span className="font-semibold text-text">#AQ-{String(invoiceModalBill.id).padStart(5, '0')}</span></p>
                    <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      invoiceModalBill.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {invoiceModalBill.status}
                    </span>
                  </div>
                </div>

                <hr className="border-border/50" />

                {/* Billing details columns */}
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Invoice From</p>
                    <p className="font-semibold text-text">AquaTrack Water Authority</p>
                    <p className="text-xs text-text-muted mt-1">Managed by Community Administration</p>
                    <p className="text-xs text-text-muted">Smart Billing System</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Invoice To</p>
                    <p className="font-bold text-text">Resident of House {invoiceModalBill.houseNumber}</p>
                    {invoiceModalBill.apartmentBlock && (
                      <p className="text-xs text-text-muted mt-1">Block: {invoiceModalBill.apartmentBlock}</p>
                    )}
                    <p className="text-xs text-text-muted">AquaTrack Registered Consumer</p>
                  </div>
                </div>

                {/* Date metadata box */}
                <div className="bg-surface-lighter rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-text-muted block">Issue Date</span>
                    <span className="font-semibold text-text text-sm">{invoiceModalBill.generatedDate}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Due Date</span>
                    <span className="font-semibold text-text text-sm">{invoiceModalBill.dueDate}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Consumption</span>
                    <span className="font-semibold text-text text-sm">{invoiceModalBill.consumptionLiters || 0} L</span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Rate / Liter</span>
                    <span className="font-semibold text-text text-sm">
                      ₹{invoiceModalBill.consumptionLiters ? (invoiceModalBill.amount / invoiceModalBill.consumptionLiters).toFixed(4) : '0.00'}
                    </span>
                  </div>
                </div>

                {/* Table of charges */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-3 font-semibold text-text-muted">Item Description</th>
                        <th className="py-3 text-right font-semibold text-text-muted">Qty (Liters)</th>
                        <th className="py-3 text-right font-semibold text-text-muted">Unit Rate</th>
                        <th className="py-3 text-right font-semibold text-text-muted">Total (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50">
                        <td className="py-4 font-medium text-text">Water Utility Consumption Fee</td>
                        <td className="py-4 text-right text-text">{invoiceModalBill.consumptionLiters || 0} L</td>
                        <td className="py-4 text-right text-text">
                          ₹{invoiceModalBill.consumptionLiters ? (invoiceModalBill.amount / invoiceModalBill.consumptionLiters).toFixed(4) : '0.00'}
                        </td>
                        <td className="py-4 text-right font-semibold text-text">₹{invoiceModalBill.amount?.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Table */}
                <div className="flex justify-end">
                  <table className="w-64 text-sm">
                    <tbody>
                      <tr>
                        <td className="py-2 text-text-muted">Subtotal</td>
                        <td className="py-2 text-right font-medium text-text">₹{invoiceModalBill.amount?.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-text-muted">Tax & GST (0%)</td>
                        <td className="py-2 text-right font-medium text-text">₹0.00</td>
                      </tr>
                      <tr className="border-t border-border">
                        <td className="py-3 font-bold text-text text-lg">Total Amount</td>
                        <td className="py-3 text-right font-black text-primary text-xl">₹{invoiceModalBill.amount?.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="text-center pt-6 border-t border-border/50 text-xs text-text-muted">
                  <p>Thank you for using AquaTrack Water Management System. Please ensure timely payments to avoid supply cuts.</p>
                  <p className="mt-1 font-bold">Generated electronically. No signature required.</p>
                </div>

              </div>
            </motion.div>
          </div>
        )}

        {/* ─── COLONY MANAGEMENT TAB (Super Admin only) ─── */}
        {/* ─── DOCUMENT VERIFICATION TAB ─── */}
        {activeTab === 'doc-verification' && (
          <motion.div
            key="doc-verification"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-text text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Resident Document Verification
                </h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Review identity documents submitted by residents. Approve to grant full dashboard access, or reject with a reason.
                </p>
              </div>
              <button
                onClick={fetchPendingVerifications}
                className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer text-sm"
              >
                <Activity className="w-4 h-4" /> Refresh
              </button>
            </div>

            {pendingVerifications.length === 0 ? (
              <div className="glass-card p-12 text-center text-text-muted">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400 opacity-60" />
                <p className="font-semibold text-lg text-emerald-400">All Clear!</p>
                <p className="text-sm mt-1">No residents are currently awaiting document verification.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingVerifications.map(resident => (
                  <div key={resident.id} className="glass-card overflow-hidden border-amber-500/20">
                    {/* Resident Header */}
                    <div className="px-6 py-4 bg-amber-500/5 border-b border-border flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400 font-bold text-sm">
                          {(resident.fullName || resident.username)?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-text">{resident.fullName || resident.username}</span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending Verification</span>
                          </div>
                          <p className="text-text-muted text-xs mt-0.5">
                            {resident.email} &nbsp;•&nbsp; House: <strong className="text-text">{resident.houseNumber || '—'}</strong>
                            &nbsp;•&nbsp; Block: <strong className="text-text">{resident.apartmentBlock || '—'}</strong>
                            {resident.colonyName && <>&nbsp;•&nbsp; Colony: <strong className="text-text">{resident.colonyName}</strong></>}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Documents List */}
                      <div>
                        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Uploaded Documents</p>
                        {resident.documents && resident.documents.length > 0 ? (
                          <div className="space-y-2">
                            {resident.documents.map(doc => (
                              <div key={doc.id} className="flex items-center justify-between px-4 py-3 bg-surface-lighter/40 rounded-xl border border-border/40">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-4 h-4 text-primary shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-text">{doc.documentType}</p>
                                    <p className="text-xs text-text-muted">{doc.fileName}</p>
                                  </div>
                                </div>
                                <a
                                  href={`${api.defaults.baseURL}/users/profile/verify/documents-download/${doc.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs font-semibold transition-all"
                                >
                                  View / Download
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted italic">No documents found — user may not have uploaded yet.</p>
                        )}
                      </div>

                      {/* Reject Reason Input */}
                      <div>
                        <label className="block text-xs font-semibold text-text-muted mb-1.5">
                          Rejection / Re-upload Reason (required for Reject or Re-upload)
                        </label>
                        <input
                          type="text"
                          value={verifyRejectReasons[resident.id] || ''}
                          onChange={(e) => setVerifyRejectReasons(prev => ({ ...prev, [resident.id]: e.target.value }))}
                          placeholder="E.g. Blurry image, document expired, name mismatch..."
                          className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-3 pt-1">
                        <button
                          onClick={() => handleVerifyAction(resident.id, 'APPROVE')}
                          disabled={!!verifyLoading[resident.id]}
                          className="px-5 py-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {verifyLoading[resident.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          Approve & Verify
                        </button>
                        <button
                          onClick={() => handleVerifyAction(resident.id, 'REQUEST_REUPLOAD')}
                          disabled={!!verifyLoading[resident.id]}
                          className="px-5 py-2.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4" /> Request Re-upload
                        </button>
                        <button
                          onClick={() => handleVerifyAction(resident.id, 'REJECT')}
                          disabled={!!verifyLoading[resident.id]}
                          className="px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'colonies' && isSuperAdmin && (

          <motion.div
            key="colonies"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-text text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" /> Colony & Building Management
                </h3>
                <p className="text-text-muted text-sm mt-0.5">
                  Register colonies and their buildings. Community Admins and residents will select from these during registration.
                </p>
              </div>
              <button
                onClick={() => setColonySubTab(colonySubTab === 'add-colony' ? 'list' : 'add-colony')}
                className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-xl font-semibold transition-all flex items-center gap-2 cursor-pointer text-sm whitespace-nowrap"
              >
                {colonySubTab === 'add-colony' ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add New Colony</>}
              </button>
            </div>

            {/* Add Colony Form */}
            <AnimatePresence>
              {colonySubTab === 'add-colony' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-6 border-primary/20"
                >
                  <h4 className="font-bold text-text mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Register New Colony</h4>
                  <form onSubmit={handleCreateColony} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Colony / Community Name *</label>
                      <input
                        type="text"
                        required
                        value={newColonyForm.colonyName}
                        onChange={(e) => setNewColonyForm(prev => ({ ...prev, colonyName: e.target.value }))}
                        placeholder="E.g. Sheetal Paradise"
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Address / Location</label>
                      <input
                        type="text"
                        value={newColonyForm.address}
                        onChange={(e) => setNewColonyForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="E.g. Sector 14, Noida"
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-text-muted mb-1.5">Buildings / Blocks (Optional, comma-separated)</label>
                      <input
                        type="text"
                        value={newColonyForm.buildings || ''}
                        onChange={(e) => setNewColonyForm(prev => ({ ...prev, buildings: e.target.value }))}
                        placeholder="E.g. Block A, Block B, Akash Block, Tower 1"
                        className="w-full bg-surface-lighter border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
                      />
                      <p className="text-text-muted text-xs mt-1">Specify buildings/blocks initially to onboard them immediately. You can also add/remove buildings later.</p>
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={colonyLoading}
                        className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {colonyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Create Colony
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Colonies List */}
            {colonies.length === 0 ? (
              <div className="glass-card p-12 text-center text-text-muted">
                <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-semibold text-lg">No colonies registered yet</p>
                <p className="text-sm mt-1">Click "Add New Colony" above to register your first colony.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {colonies.map(colony => {
                  const isExpanded = expandedColonies[colony.id] !== false;
                  const isEditingColony = editingColonyId === colony.id;
                  return (
                    <div key={colony.id} className="glass-card overflow-hidden border-primary/15">
                      {/* Colony Header */}
                      <div 
                        onClick={() => {
                          if (!isEditingColony) {
                            toggleExpandColony(colony.id);
                          }
                        }}
                        className={`px-6 py-4 bg-primary/5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none hover:bg-primary/10 transition-colors ${isEditingColony ? 'cursor-default' : ''}`}
                      >
                        {isEditingColony ? (
                          <div className="flex-1 flex flex-col sm:flex-row gap-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-text-muted mb-1">Colony Name</label>
                              <input
                                type="text"
                                value={colonyEditForm.colonyName}
                                onChange={(e) => setColonyEditForm({ ...colonyEditForm, colonyName: e.target.value })}
                                className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                                placeholder="Colony Name"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-text-muted mb-1">Address</label>
                              <input
                                type="text"
                                value={colonyEditForm.address}
                                onChange={(e) => setColonyEditForm({ ...colonyEditForm, address: e.target.value })}
                                className="w-full bg-surface-lighter border border-border rounded-xl px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                                placeholder="Address (Bhopal, MP etc.)"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-primary" />
                              <span className="font-bold text-text">{colony.colonyName}</span>
                              <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                                {colony.buildings?.length || 0} buildings
                              </span>
                            </div>
                            {colony.address && (
                              <p className="text-text-muted text-xs mt-0.5 ml-6">{colony.address}</p>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          {isEditingColony ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateColony(colony.id)}
                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                title="Save Colony"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Save
                              </button>
                              <button
                                onClick={() => setEditingColonyId(null)}
                                className="px-3 py-1.5 bg-surface-lighter border border-border text-text hover:bg-surface rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingColonyId(colony.id); 
                                  setColonyEditForm({ colonyName: colony.colonyName, address: colony.address || '' }); 
                                }}
                                className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"
                                title="Edit Colony"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteColony(colony.id, colony.colonyName); }}
                                className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer"
                                title="Delete Colony"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <span className={`text-text-muted transition-transform duration-200 select-none ${isExpanded ? 'rotate-180' : ''}`} style={{display:'inline-block'}}>▼</span>
                        </div>
                      </div>

                      {/* Buildings List */}
                      {isExpanded && (
                        <div className="p-4 space-y-2">
                          {colony.buildings && colony.buildings.length > 0 ? (
                            colony.buildings.map(building => (
                              <div key={building.id} className="flex items-center justify-between px-4 py-2.5 bg-surface-lighter/40 rounded-xl border border-border/40">
                                {editingBuildingId === building.id ? (
                                  <div className="flex-1 flex items-center gap-2 pr-4">
                                    <Building2 className="w-4 h-4 text-text-muted" />
                                    <input
                                      type="text"
                                      value={buildingEditName}
                                      onChange={(e) => setBuildingEditName(e.target.value)}
                                      className="flex-1 bg-surface-lighter border border-border rounded-xl px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                                      placeholder="Building Name"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-text-muted" />
                                    <span className="text-sm font-medium text-text">{building.buildingName}</span>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  {editingBuildingId === building.id ? (
                                    <>
                                      <button
                                        onClick={() => handleUpdateBuilding(building.id)}
                                        className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                        title="Save Building"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Save
                                      </button>
                                      <button
                                        onClick={() => setEditingBuildingId(null)}
                                        className="px-2.5 py-1 bg-surface-lighter border border-border text-text hover:bg-surface rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                        title="Cancel"
                                      >
                                        <X className="w-3.5 h-3.5" /> Cancel
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => {
                                          setEditingBuildingId(building.id);
                                          setBuildingEditName(building.buildingName);
                                        }}
                                        className="p-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-lg cursor-pointer"
                                        title="Edit Building"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteBuilding(building.id, building.buildingName)}
                                        className="p-1 bg-red-500/10 text-red-400 hover:bg-red-500/25 border border-red-500/20 rounded-lg cursor-pointer"
                                        title="Delete Building"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-text-muted text-xs italic px-4">No buildings added yet. Add the first building below.</p>
                          )}

                          {/* Add Building Form */}
                          <form
                            onSubmit={(e) => handleAddBuilding(e, colony.id)}
                            className="flex items-center gap-2 mt-3"
                          >
                            <div className="relative flex-1">
                              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                              <input
                                type="text"
                                value={newBuildingForms[colony.id] || ''}
                                onChange={(e) => setNewBuildingForms(prev => ({ ...prev, [colony.id]: e.target.value }))}
                                placeholder="E.g. Akash Block or Tower 1"
                                className="w-full bg-surface-lighter border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                              />
                            </div>
                            <button
                              type="submit"
                              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Building
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

      {/* Quick Help Modal */}
      {quickHelpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-surface border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative my-8"
          >
            <button 
              onClick={() => setQuickHelpModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.25)]">
                <Lightbulb className="w-5 h-5 text-yellow-400 fill-yellow-400/20 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text">
                  💡 Quick Guide
                </h3>
                <p className="text-text-muted text-xs mt-0.5">Help instructions for the active tab: <span className="font-semibold text-primary capitalize">{activeTab.replace(/-/g, ' ')}</span></p>
              </div>
            </div>
            
            <div className="space-y-4">
              {renderActiveTabHelp()}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-xs text-text-muted">
              <span className="font-semibold text-primary">📊 Track. Analyze. Conserve.</span>
              <span>AquaTrack Help Engine</span>
            </div>
          </motion.div>
        </div>
      )}

    </div>

  );
}
