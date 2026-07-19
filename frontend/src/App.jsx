import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PrivacyDialog from './components/PrivacyDialog';

// Lazy load page components for code-splitting and optimized initial load times
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const InviteRegister = lazy(() => import('./pages/InviteRegister'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Landing = lazy(() => import('./pages/Landing'));
const Bills = lazy(() => import('./pages/Bills'));
const UsageHistory = lazy(() => import('./pages/UsageHistory'));
const MyUsage = lazy(() => import('./pages/MyUsage'));
const Profile = lazy(() => import('./pages/Profile'));
const Support = lazy(() => import('./pages/Support'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Notifications = lazy(() => import('./pages/Notifications'));
const WaterTips = lazy(() => import('./pages/WaterTips'));
const TariffSettings = lazy(() => import('./pages/TariffSettings'));
const MeterWorkstation = lazy(() => import('./pages/MeterWorkstation'));
const WaterBillingHistory = lazy(() => import('./pages/WaterBillingHistory'));

// Beautiful premium Glassmorphism page loader during lazy chunks fetching
const PageLoader = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0b0f19] relative overflow-hidden">
    {/* Ambient background glows */}
    <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
    <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
    
    <div className="flex flex-col items-center gap-4 z-10">
      <div className="relative w-16 h-16 flex items-center justify-center">
        {/* Pulsing glow ring */}
        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-ping duration-[1.5s]" />
        {/* Spinning gradient ring */}
        <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-transparent border-t-blue-500 border-r-cyan-400 animate-spin" />
        {/* Droplet icon */}
        <div className="text-blue-500 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9zm0-11.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
          </svg>
        </div>
      </div>
      <p className="text-blue-200/60 text-xs font-semibold tracking-widest uppercase animate-pulse mt-2">AquaTrack</p>
    </div>
  </div>
);

// A simple layout wrapper for authenticated pages
const AuthLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* Header takes full width at the top */}
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Sidebar + Main content container below the header */}
      <div className="flex flex-1 overflow-hidden w-full relative">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

// A route wrapper to restrict access only to Community Admins
const CommunityAdminRoute = ({ children }) => {
  const role = localStorage.getItem('role');
  if (role !== 'ROLE_COMMUNITY_ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/invite/:token" element={<InviteRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes (wrapping in AuthLayout) */}
          <Route path="/dashboard" element={<AuthLayout><Dashboard /></AuthLayout>} />
          <Route path="/admin" element={<AuthLayout><AdminDashboard /></AuthLayout>} />
          <Route path="/bills" element={<AuthLayout><Bills /></AuthLayout>} />
          <Route path="/invoices" element={<AuthLayout><Invoices /></AuthLayout>} />
          <Route path="/notifications" element={<AuthLayout><Notifications /></AuthLayout>} />
          <Route path="/tips" element={<AuthLayout><WaterTips /></AuthLayout>} />
          <Route path="/history" element={<AuthLayout><UsageHistory /></AuthLayout>} />
          <Route path="/usage" element={<AuthLayout><MyUsage /></AuthLayout>} />
          <Route path="/profile" element={<AuthLayout><Profile /></AuthLayout>} />
          <Route path="/support" element={<AuthLayout><Support /></AuthLayout>} />
          <Route path="/tariff" element={<AuthLayout><CommunityAdminRoute><TariffSettings /></CommunityAdminRoute></AuthLayout>} />
          <Route path="/meter-workstation" element={<AuthLayout><MeterWorkstation /></AuthLayout>} />
          <Route path="/water-billing-history" element={<AuthLayout><WaterBillingHistory /></AuthLayout>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
      <PrivacyDialog />
    </Router>
  );
}

export default App;
