import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Users,
  FolderKanban,
  Video,
  Settings,
  LogOut,
  Search,
  Bell,
  FileText,
  ChevronDown,
  Key,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import GlobalSearch from './search/GlobalSearch';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Sessions', href: '/sessions', icon: Video },
  { name: 'Documents', href: '/documents', icon: FileText },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-neon-bg">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-neon-surface border-r border-neon-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-neon-border">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-neon-cyan rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <span className="text-xl font-bold text-white">AutoMade</span>
            </Link>
          </div>

          {/* Search */}
          <div className="px-4 py-4">
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neon-text-muted bg-neon-surface-hover rounded-lg hover:text-white transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-neon-surface rounded border border-neon-border">
                {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
              </kbd>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`sidebar-item ${isActive ? 'sidebar-item-active' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-3 border-t border-neon-border space-y-1">
            <Link
              to="/settings/providers"
              className={`sidebar-item ${location.pathname === '/settings/providers' ? 'sidebar-item-active' : ''}`}
            >
              <Key className="w-5 h-5" />
              <span>API Keys</span>
            </Link>
            <Link
              to="/settings/security"
              className={`sidebar-item ${location.pathname.startsWith('/settings/security') ? 'sidebar-item-active' : ''}`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="bg-neon-surface border-b border-neon-border sticky top-0 z-40">
          <div className="flex items-center justify-between h-16 px-6">
            {/* Left side - can add breadcrumbs here */}
            <div />

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 text-neon-text-secondary hover:text-white hover:bg-neon-surface-hover rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-neon-error rounded-full" />
              </button>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 p-2 hover:bg-neon-surface-hover rounded-lg transition-colors"
                >
                  <div className="avatar avatar-sm">
                    {getInitials(user?.displayName, user?.email)}
                  </div>
                  <span className="text-sm text-neon-text-secondary">
                    {user?.displayName || user?.email}
                  </span>
                  <ChevronDown className="w-4 h-4 text-neon-text-muted" />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="dropdown absolute right-0 top-full mt-2 z-50 animate-scale-in">
                      <div className="px-3 py-2 border-b border-neon-border">
                        <p className="text-sm font-medium text-white">{user?.displayName}</p>
                        <p className="text-xs text-neon-text-muted">{user?.email}</p>
                      </div>
                      <Link
                        to="/settings/security"
                        className="dropdown-item"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </Link>
                      <div className="dropdown-separator" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleLogout();
                        }}
                        className="dropdown-item w-full text-neon-error hover:text-neon-error"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
