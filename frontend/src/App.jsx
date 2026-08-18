import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
// Lazy load secondary global components for initial bundle optimization
const HouseholdChatbot = lazy(() => import('./components/HouseholdChatbot'));

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
const WaterPurchase = lazy(() => import('./pages/WaterPurchase'));
const MeterWorkstation = lazy(() => import('./pages/MeterWorkstation'));
const WaterBillingHistory = lazy(() => import('./pages/WaterBillingHistory'));
const LeakDetection = lazy(() => import('./pages/LeakDetection'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));


// Water-filling text wave animation with SVG Parallax Wave Background for website loading
const PageLoader = () => (
  <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#071120] dark:bg-[#050b14] relative overflow-hidden font-sans select-none">
    {/* Ambient Water Radial Glow */}
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[320px] sm:h-[600px] rounded-full bg-gradient-to-tr from-cyan-500/20 via-blue-600/25 to-sky-400/20 blur-[90px] sm:blur-[150px] pointer-events-none animate-pulse" />

    {/* Upper Content (AquaTrack Round Logo + AQUATRACK Water Fill Text, z-30) */}
    <div className="flex-1 flex flex-col items-center justify-center z-30 text-center px-4 pt-6">
      {/* AquaTrack Circular Brand Logo */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-md animate-pulse" />
        <img
          src="/logo.png"
          alt="AquaTrack Logo"
          className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full object-cover bg-slate-900/80 border-2 border-cyan-400/50 p-2 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
        />
      </div>

      {/* AQUATRACK Water Fill Brand Text */}
      <h1 className="water-fill-text text-5xl sm:text-7xl md:text-8xl font-black tracking-widest select-none my-2 drop-shadow-md">
        AQUATRACK
      </h1>
    </div>

    {/* Lower Half Waves Container (Full height wave view on all mobile & desktop viewports) */}
    <div className="w-full h-[40vh] relative z-10 flex flex-col justify-end overflow-hidden leading-none bg-gradient-to-b from-transparent to-[#071120]">
      <svg
        className="w-full h-full min-h-[160px]"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 24 150 28"
        preserveAspectRatio="none"
        shapeRendering="auto"
      >
        <defs>
          <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
        </defs>
        <g className="parallax">
          <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(6, 182, 212, 0.4)" />
          <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(59, 130, 246, 0.5)" />
          <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(14, 165, 233, 0.7)" />
          <use xlinkHref="#gentle-wave" x="48" y="7" fill="#071120" />
        </g>
      </svg>
    </div>
  </div>
);

import ErrorBoundary from './components/ErrorBoundary';
import PwaInstallPrompt from './components/PwaInstallPrompt';

// A simple layout wrapper for authenticated pages
const AuthLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden selection:bg-primary/30 relative">
      {/* Header takes full width at the top */}
      <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Sidebar + Main content container below the header */}
      <div className="flex flex-1 overflow-hidden w-full relative">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Floating AI Household Assistant Chatbot */}
      <HouseholdChatbot />
    </div>
  );
};

// Route wrapper to ensure user is logged in
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
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
      <PwaInstallPrompt />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/invite/:token" element={<InviteRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes (wrapping in AuthLayout & ProtectedRoute) */}
          <Route path="/dashboard" element={<ProtectedRoute><AuthLayout><Dashboard /></AuthLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AuthLayout><AdminDashboard /></AuthLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><AuthLayout><ReportsPage /></AuthLayout></ProtectedRoute>} />
          <Route path="/bills" element={<ProtectedRoute><AuthLayout><Bills /></AuthLayout></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><AuthLayout><Invoices /></AuthLayout></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><AuthLayout><Notifications /></AuthLayout></ProtectedRoute>} />
          <Route path="/tips" element={<ProtectedRoute><AuthLayout><WaterTips /></AuthLayout></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><AuthLayout><UsageHistory /></AuthLayout></ProtectedRoute>} />
          <Route path="/usage" element={<ProtectedRoute><AuthLayout><MyUsage /></AuthLayout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><AuthLayout><Profile /></AuthLayout></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><AuthLayout><Support /></AuthLayout></ProtectedRoute>} />
          <Route path="/tariff" element={<ProtectedRoute><AuthLayout><CommunityAdminRoute><TariffSettings /></CommunityAdminRoute></AuthLayout></ProtectedRoute>} />
          <Route path="/tariff-settings" element={<ProtectedRoute><AuthLayout><CommunityAdminRoute><TariffSettings /></CommunityAdminRoute></AuthLayout></ProtectedRoute>} />
          <Route path="/water-purchase" element={<ProtectedRoute><AuthLayout><CommunityAdminRoute><WaterPurchase /></CommunityAdminRoute></AuthLayout></ProtectedRoute>} />
          <Route path="/meter-workstation" element={<ProtectedRoute><AuthLayout><MeterWorkstation /></AuthLayout></ProtectedRoute>} />
          <Route path="/water-billing-history" element={<ProtectedRoute><AuthLayout><WaterBillingHistory /></AuthLayout></ProtectedRoute>} />
          <Route path="/leak-detection" element={<ProtectedRoute><AuthLayout><LeakDetection /></AuthLayout></ProtectedRoute>} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
