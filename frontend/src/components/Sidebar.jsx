import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Droplet, 
  History, 
  Receipt, 
  FileText, 
  Bell, 
  Lightbulb, 
  User, 
  LogOut,
  X,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Users,
  Wrench,
  BookOpen
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const isAdmin = role === 'ROLE_ADMIN' || role === 'ROLE_COMMUNITY_ADMIN';
  const isCommunityAdmin = role === 'ROLE_COMMUNITY_ADMIN';

  // Persistent collapsed state for desktop
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', nextState ? 'true' : 'false');
  };

  const handleSidebarClick = (e) => {
    if (window.innerWidth >= 1024) {
      toggleCollapse();
    }
  };

  const navItems = isAdmin 
    ? [
        { icon: LayoutDashboard, label: 'Dashboard',         path: '/admin' },
        { icon: Users,           label: 'User Directory',    path: '/admin?tab=users' },
        { icon: Wrench,          label: 'Meter Workstation', path: '/meter-workstation' },
        { icon: BookOpen,        label: 'Water & Billing History', path: '/water-billing-history' },
        ...(isCommunityAdmin ? [{ icon: Gauge, label: 'Tariff Settings', path: '/tariff' }] : []),
        { icon: Bell,            label: 'Notifications',     path: '/notifications' },
        { icon: User,            label: 'Profile',           path: '/profile' },
        { icon: HelpCircle,      label: 'Support',           path: '/support' },
      ]
    : [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Droplet, label: 'My Usage', path: '/usage' },
        { icon: History, label: 'Usage History', path: '/history' },
        { icon: Receipt, label: 'My Bills', path: '/bills' },
        { icon: FileText, label: 'My Invoices', path: '/invoices' },
        { icon: Bell, label: 'Notifications', path: '/notifications' },
        { icon: Lightbulb, label: 'Water Tips', path: '/tips' },
        { icon: User, label: 'Profile', path: '/profile' },
        { icon: HelpCircle, label: 'Support', path: '/support' },
      ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isLinkActive = (path) => {
    const [itemPathname, itemSearch] = path.split('?');
    const currentPathname = location.pathname;
    const currentSearch = location.search;

    if (itemSearch) {
      return currentPathname === itemPathname && currentSearch.includes(itemSearch);
    }
    
    // If we're on /admin with a tab param, the dashboard link is NOT active
    if (itemPathname === '/admin' && currentSearch.includes('tab=')) {
      return false;
    }
    
    return currentPathname === itemPathname;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside 
        onClick={handleSidebarClick}
        className={`fixed lg:relative inset-y-0 left-0 flex flex-col bg-surface border-r border-border h-full z-50 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:cursor-pointer ${
          isCollapsed ? 'lg:w-16 w-56' : 'lg:w-[17.5rem] w-56'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >

        {/* Mobile Sidebar Header (Smartphone only) */}
        <div className="p-4 flex items-center gap-3 border-b border-border/10 lg:hidden">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-primary/20 border border-primary/20 flex items-center justify-center bg-surface flex-shrink-0">
            <img src="/logo.png" alt="AquaTrack Logo" className="w-full h-full object-cover scale-110" />
          </div>
          <div className="loader loader-responsive">
            <span className="outline-layer">AquaTrack</span>
            <span className="fill-layer">AquaTrack</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className={`flex-1 overflow-y-auto py-6 px-3 flex flex-col gap-1.5 transition-all duration-300 ${
          isCollapsed ? 'lg:px-2' : 'lg:px-3'
        }`}>
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className={() => 
                `nav-item group flex items-center ${isLinkActive(item.path) ? 'active' : ''} ${
                  isCollapsed ? 'lg:justify-center lg:px-2' : ''
                }`
              }
              title={isCollapsed ? item.label : ''}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${
                isCollapsed ? 'lg:mr-0' : 'mr-3'
              }`} />
              <span className={`font-medium text-sm transition-all duration-300 truncate text-ellipsis overflow-hidden ${
                isCollapsed ? 'lg:hidden lg:w-0' : 'block opacity-100'
              }`}>{item.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Footer (Logout) Section */}
        <div className={`p-4 border-t border-border mt-auto flex items-center justify-start transition-all duration-300 ${
          isCollapsed ? 'lg:justify-center lg:px-2' : 'lg:pl-6'
        }`}>
          {isCollapsed ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center w-11 h-11 shadow-lg shadow-red-500/25 border-none"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="btn-logout-animated"
            >
              <div className="btn-logout-animated-sign">
                <svg viewBox="0 0 512 512">
                  <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
                </svg>
              </div>
              <div className="btn-logout-animated-text">Logout</div>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
