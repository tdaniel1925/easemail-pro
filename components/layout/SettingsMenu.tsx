'use client';

import { useState, useEffect } from 'react';
import { Settings, Palette, User, LogOut, ChevronUp, Shield, Users, Zap, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ThemeSelector from '@/components/theme/ThemeSelector';
import { createClient } from '@/lib/supabase/client';

interface SettingsMenuProps {
  onLogout?: () => void;
  onNavigate?: (path: string) => void;
  userRole?: string;
  hasOrganization?: boolean;
}

export default function SettingsMenu({ onLogout, onNavigate, userRole: propUserRole, hasOrganization = false }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userFullName, setUserFullName] = useState<string>('');
  const [localUserRole, setLocalUserRole] = useState<string>('user');
  const supabase = createClient();

  useEffect(() => {
    fetchUser();
  }, []);

  // Use prop if provided, otherwise use local state
  const userRole = propUserRole || localUserRole;

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserEmail(user.email || '');
      
      // Get full name from user metadata or database
      const fullName = user.user_metadata?.full_name;
      if (fullName) {
        setUserFullName(fullName);
      } else {
        // Fallback: fetch from database
        try {
        const response = await fetch(`/api/user/${user.id}`);
        if (response.ok) {
          const userData = await response.json();
          setUserFullName(userData.fullName || '');
          setLocalUserRole(userData.role || 'user');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    }
    
    // Always fetch role from database (most up-to-date)
    try {
      const response = await fetch(`/api/user/${user.id}`);
      if (response.ok) {
        const userData = await response.json();
        setLocalUserRole(userData.role || 'user');
      }
    } catch (error) {
      console.error('Failed to fetch user role:', error);
    }
    }
  };

  const getInitials = () => {
    if (userFullName) {
      return userFullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return userEmail[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="relative">
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute bottom-full left-0 mb-1 w-full bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
            <div className="py-1">
              {showThemeSelector ? (
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Color Theme</span>
                    <button 
                      onClick={() => setShowThemeSelector(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Back
                    </button>
                  </div>
                  <ThemeSelector />
                </div>
              ) : (
                <>
                  {/* Rules */}
                  <button
                    onClick={() => {
                      onNavigate?.('/rules');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Rules</span>
                  </button>

                  {/* Email Accounts */}
                  <button
                    onClick={() => {
                      onNavigate?.('/accounts');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Accounts</span>
                  </button>

                  {/* Team - Only show if user has an organization */}
                  {hasOrganization && (
                    <button
                      onClick={() => {
                        onNavigate?.('/team');
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                    >
                      <Users className="h-4 w-4" />
                      <span>Team</span>
                    </button>
                  )}

                  <div className="border-t border-border my-1"></div>

                  {/* Admin Section - Only show for platform admin users */}
                  {userRole === 'platform_admin' && (
                    <>
                      <div className="px-3 py-1.5">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Admin
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          onNavigate?.('/admin');
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                      >
                        <Shield className="h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </button>
                      <button
                        onClick={() => {
                          onNavigate?.('/admin/users');
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        <span>User Management</span>
                      </button>
                      <div className="border-t border-border my-1"></div>
                    </>
                  )}
                  
                  <button
                    onClick={() => setShowThemeSelector(true)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <Palette className="h-4 w-4" />
                    <span>Color Theme</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate?.('/settings');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      onNavigate?.('/profile');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  <div className="border-t border-border my-1"></div>
                  <button
                    onClick={() => {
                      onLogout?.();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent text-muted-foreground transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* User Info Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
          isOpen ? "bg-accent" : "hover:bg-accent text-muted-foreground"
        )}
      >
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
          {getInitials()}
        </div>
        <div className="flex-1 text-left truncate">
          <div className="text-[10px] text-muted-foreground leading-tight">Logged in as</div>
          <div className="font-medium text-xs truncate leading-tight">{userFullName || userEmail || 'User'}</div>
        </div>
        <ChevronUp className={cn(
          "h-4 w-4 transition-transform flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </button>
    </div>
  );
}

