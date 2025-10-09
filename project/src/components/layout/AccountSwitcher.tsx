import React, { useState, useEffect } from 'react';
import { 
  User, 
  ChevronDown, 
  Shield, 
  Users, 
  LogOut,
  Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu-shadcn';

interface AccountSwitcherProps {
  currentRole?: 'admin' | 'employee';
  onAdminDashboard?: () => void;
  isCollapsed?: boolean;
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ 
  currentRole = 'employee',
  onAdminDashboard,
  isCollapsed = false
}) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load current user on mount
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        setCurrentUser({
          id: user.id,
          email: user.email,
          name: profile?.name || 'User',
          role: profile?.role || 'employee'
        });
      } else {
        // Use placeholder user for demo
        setCurrentUser({
          id: 'demo-user',
          email: 'demo@example.com',
          name: 'Demo User',
          role: 'admin'
        });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      // Use placeholder user on error
      setCurrentUser({
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
        role: 'admin'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="w-full p-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
          <User className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Not signed in</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {isCollapsed ? (
            <button className="w-full flex items-center justify-center transition-all duration-200">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden ${
                currentUser.role === 'admin' 
                  ? 'text-white' 
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}>
                {currentUser.role === 'admin' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4B38B3] via-[#5A47CC] to-[#4338CA]" />
                )}
                <User className="w-5 h-5 relative z-10" />
              </div>
            </button>
          ) : (
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative overflow-hidden ${
                currentUser.role === 'admin' 
                  ? 'text-white' 
                  : 'bg-muted text-muted-foreground group-hover:text-foreground'
              }`}>
                {currentUser.role === 'admin' && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#4B38B3] via-[#5A47CC] to-[#4338CA]" />
                )}
                <User className="w-4 h-4 relative z-10" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate">
                  {currentUser.email}
                </div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <span className="capitalize">{currentUser.role}</span>
                  {currentUser.role === 'admin' && (
                    <Shield className="w-3 h-3 text-[#4338CA]" />
                  )}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align={isCollapsed ? "end" : "end"}
          side={isCollapsed ? "right" : "top"}
          className="w-56"
          sideOffset={8}
        >
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-foreground">
                {currentUser.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {currentUser.email}
              </p>
              <p className="text-xs leading-none text-muted-foreground capitalize mt-1">
                {currentUser.role} Account
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {currentUser.role === 'admin' && (
            <>
              <DropdownMenuItem onClick={onAdminDashboard} className="cursor-pointer">
                <Users className="w-4 h-4 mr-2" />
                <span>Admin Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            <span>Account Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleSignOut} 
            className="cursor-pointer text-red-400 focus:text-red-300 focus:bg-red-950/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AccountSwitcher;