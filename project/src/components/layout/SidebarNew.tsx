import React, { useCallback, useMemo } from 'react';
import { 
  User,
  Star
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
  
  // Count active uploads
  const activeUploads = uploads.filter(upload => upload.status === 'uploading' || upload.status === 'paused');
  

  const navigationItems = [
    { 
      id: 'dashboard', 
      icon: RiHome3Line, 
      label: 'All Files',
      adminOnly: false
    },
    { 
      id: 'project-v3', 
      icon: RiFolder3Line, 
      label: 'Projects',
      adminOnly: false
    },
    { 
      id: 'tags', 
      icon: RiPriceTag3Line, 
      label: 'Tags',
      adminOnly: false
    },
    { 
      id: 'uploads', 
      icon: RiUploadLine, 
      label: 'Uploads',
      adminOnly: false
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
                      <item.icon 
                        className={`flex-shrink-0 transition-colors duration-150 ${
                          isCollapsed ? 'w-[24px] h-[24px]' : 'w-[18px] h-[18px]'
                        } ${
                          isActive 
                            ? 'text-white' 
                            : 'text-[#8A8C8E] group-hover/menu-item:text-[#CFCFF6]'
                        }`}
                      />
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
