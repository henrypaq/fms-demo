import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  User,
  Star,
  Sun,
  Moon
} from 'lucide-react';
import { 
  RiHome3Line, 
  RiFolder3Line, 
  RiPriceTag3Line, 
  RiUploadLine 
} from '@remixicon/react';
import { Icon, IconSizes, IconColors } from '../ui/Icon';
import AccountSwitcher from './AccountSwitcher';
import WorkspaceDropdown from '../WorkspaceDropdown';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useUploads } from '../../contexts/UploadContext';
import { 
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar
} from '../ui/sidebar-shadcn';
import { Badge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui';

interface SidebarNewProps {
  className?: string;
  activeView?: string;
  onViewChange?: (view: string) => void;
  onUploadClick?: () => void;
  uploadSheetOpen?: boolean;
  userRole?: 'admin' | 'employee';
  userProjectAccess?: string[];
  currentUser?: {
    id: string;
    email: string;
    role: string;
    projectAccess: string[];
  };
}

const SidebarNew: React.FC<SidebarNewProps> = ({ 
  className = '', 
  activeView = 'dashboard',
  onViewChange,
  onUploadClick,
  uploadSheetOpen = false,
  userRole = 'employee',
  userProjectAccess = [],
  currentUser
}) => {
  const { currentWorkspace } = useWorkspace();
  const { uploads } = useUploads();
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved !== 'light'; // Default to dark mode
  });
  
  // Apply theme on mount and when it changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);
  
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };
  
  // Count active uploads
  const activeUploads = uploads.filter(upload => upload.status === 'uploading' || upload.status === 'paused');
  

  const navigationItems = [
    { 
      id: 'dashboard', 
      icon: RiHome3Line, 
      label: 'All Files',
      adminOnly: false,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' // Purple-Blue
    },
    { 
      id: 'project-v3', 
      icon: RiFolder3Line, 
      label: 'Projects',
      adminOnly: false,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' // Pink-Red
    },
    { 
      id: 'tags', 
      icon: RiPriceTag3Line, 
      label: 'Tags',
      adminOnly: false,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' // Blue-Cyan
    },
    { 
      id: 'uploads', 
      icon: RiUploadLine, 
      label: 'Uploads',
      adminOnly: false,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' // Green-Teal
    }
  ];

  const filteredNavigationItems = navigationItems.filter(item => 
    !item.adminOnly || userRole === 'admin'
  );

  const handleNavClick = useCallback((viewId: string) => {
    // Special case for uploads - open the upload sheet instead of changing view
    if (viewId === 'uploads') {
      onUploadClick?.();
      return;
    }
    
    const item = navigationItems.find(nav => nav.id === viewId);
    if (userRole === 'employee' && item?.adminOnly) {
      return;
    }
    onViewChange?.(viewId);
  }, [userRole, onViewChange, onUploadClick]);


  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <TooltipProvider>
      <Sidebar className={`${className} smooth-transition gpu-accelerated`} collapsible="icon">
        <SidebarHeader className="border-b border-border !p-0" style={{ padding: '0 !important' }}>
          {isCollapsed ? (
            <div className="flex items-center justify-center w-full h-full" style={{ paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}>
              <SidebarTrigger className="flex items-center justify-center hover:bg-accent rounded-md transition-colors duration-200" />
            </div>
          ) : (
            <div className="flex items-center gap-3 px-6 py-4 w-full h-full" style={{ paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px' }}>
              <SidebarTrigger className="flex items-center justify-center hover:bg-accent rounded-md transition-colors duration-200 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <WorkspaceDropdown isCollapsed={isCollapsed} />
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="px-1 py-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="flex flex-col gap-0.5">
              {filteredNavigationItems.map((item) => {
                const isActive = item.id === 'uploads' ? uploadSheetOpen : activeView === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleNavClick(item.id)}
                      isActive={isActive}
                      size="sm"
                      tooltip={item.label}
                      data-active={isActive}
                      className={`group/menu-item ${isCollapsed ? 'pl-[0.4rem]' : ''}`}
                    >
                      <div 
                        className={`flex-shrink-0 relative ${
                          isCollapsed ? 'w-[24px] h-[24px]' : 'w-[18px] h-[18px]'
                        }`}
                      >
                        {isActive ? (
                          <>
                            {/* Gradient background layer */}
                            <div 
                              className="absolute inset-0 rounded-md"
                              style={{
                                background: item.gradient,
                                maskImage: 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9ImJsYWNrIi8+PC9zdmc+)',
                                WebkitMaskImage: 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iY3VycmVudENvbG9yIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIGZpbGw9ImJsYWNrIi8+PC9zdmc+)',
                              }}
                            />
                            {/* Icon with gradient via custom rendering */}
                            <div 
                              className="absolute inset-0 flex items-center justify-center"
                              style={{
                                background: item.gradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                              }}
                            >
                              <item.icon className="w-full h-full" />
                            </div>
                          </>
                        ) : (
                          <item.icon 
                            className={`w-full h-full text-[#8A8C8E] group-hover/menu-item:text-[#CFCFF6] transition-colors duration-150`}
                          />
                        )}
                      </div>
                      {!isCollapsed && (
                        <>
                          <span 
                            className={`text-[15px] font-normal transition-colors duration-150 ${
                              isActive 
                                ? 'text-white' 
                                : 'text-[#8A8C8E] group-hover/menu-item:text-[#CFCFF6]'
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.id === 'uploads' && activeUploads.length > 0 && (
                            <Badge variant="info" size="sm" className="ml-auto animate-pulse">
                              {activeUploads.length}
                            </Badge>
                          )}
                        </>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Employee Notice */}
        {userRole === 'employee' && !isCollapsed && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Employee Account</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Limited access. Contact admin for additional permissions.
                </p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

        <SidebarFooter className="border-t border-border">
          {/* Theme Toggle Button */}
          <div className="px-2 py-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      text-[#8A8C8E] hover:text-[#CFCFF6] hover:bg-[hsl(240,30%,8%)]/50
                      transition-all duration-150
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    {isDarkMode ? (
                      <Moon className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    ) : (
                      <Sun className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                    )}
                    {!isCollapsed && (
                      <span className="text-sm font-medium">
                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="bg-[#1A1C3A] border border-[#2A2C45] text-[#CFCFF6] text-xs px-2 py-1">
                    {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <AccountSwitcher 
            currentRole={userRole} 
            onAdminDashboard={onViewChange ? () => onViewChange('admin') : undefined}
            isCollapsed={isCollapsed}
          />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
};

export default SidebarNew;
