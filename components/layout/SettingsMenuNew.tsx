'use client';

import { useState, useEffect } from 'react';
import { Settings, User, LogOut, ChevronUp, Shield, Users, Zap, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface SettingsMenuNewProps {
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
}

export default function SettingsMenuNew({ onLogout, onNavigate }: SettingsMenuNewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('user');
  const supabase = createClient();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');

      // Fetch user data from database
      try {
        const response = await fetch(`/api/user/${user.id}`);
        if (response.ok) {
          const userData = await response.json();
          setUserFullName(userData.fullName || '');
          setUserRole(userData.role || 'user');
          console.log('[SettingsMenuNew] User role:', userData.role);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
  };

  const getInitials = () => {
    if (userFullName) {
      return userFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userEmail[0]?.toUpperCase() || 'U';
  };

  const handleMenuClick = (path: string) => {
    onNavigate?.(path);
    setIsOpen(false);
  };

  const handleLogoutClick = () => {
    onLogout?.();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-48 bg-popover border border-border rounded-md shadow-xl z-50">
          <div className="py-1 max-h-[80vh] overflow-y-auto">

            {/* Email Accounts */}
            <button
              onClick={() => handleMenuClick('/accounts-v3')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            >
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span>Email Accounts</span>
            </button>

            {/* Rules */}
            <button
              onClick={() => handleMenuClick('/rules')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            >
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span>Rules</span>
            </button>

            {/* Team - Show for org users */}
            {(userRole === 'org_admin' || userRole === 'org_user') && (
              <button
                onClick={() => handleMenuClick('/team')}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              >
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>Team</span>
              </button>
            )}

            <div className="border-t border-border my-1"></div>

            {/* Admin Dashboard - Only for platform_admin */}
            {userRole === 'platform_admin' && (
              <>
                <div className="px-2.5 py-1">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Admin
                  </div>
                </div>
                <button
                  onClick={() => handleMenuClick('/admin')}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left bg-primary/5"
                >
                  <Shield className="h-3 w-3 text-primary" />
                  <span className="font-medium text-primary">Admin Dashboard</span>
                </button>
                <div className="border-t border-border my-1"></div>
              </>
            )}

            {/* Settings */}
            <button
              onClick={() => handleMenuClick('/settings')}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent transition-colors text-left"
            >
              <Settings className="h-3 w-3 text-muted-foreground" />
              <span>Settings</span>
            </button>

            <div className="border-t border-border my-1"></div>

            {/* Logout */}
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-accent hover:text-red-600 transition-colors text-left"
            >
              <LogOut className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* User Info Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-all",
          isOpen ? "bg-accent" : "hover:bg-accent"
        )}
      >
        <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-[9px]">
          {getInitials()}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="text-[10px] text-muted-foreground">Logged in as</div>
          <div className="font-medium text-xs truncate">{userFullName || userEmail || 'User'}</div>
        </div>
        <ChevronUp className={cn(
          "h-3 w-3 transition-transform flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>
    </div>
  );
}
