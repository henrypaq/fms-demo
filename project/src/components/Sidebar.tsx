import React, { useState } from 'react';
import { 
  Tag, 
  Home,
  User,
  FolderTree,
  Upload,
  Star
}  from 'lucide-react';
import AccountSwitcher from './AccountSwitcher';
import NewWorkspaceSelector from './NewWorkspaceSelector';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useUploads } from '../contexts/UploadContext';

interface SidebarProps {
  className?: string;
  activeView?: string;
  onViewChange?: (view: string) => void;
  userRole?: 'admin' | 'employee';
  userProjectAccess?: string[];
}

const Sidebar: React.FC<SidebarProps> = ({ 
  className = '', 
  activeView = 'dashboard',
  onViewChange,
  userRole = 'employee',
  userProjectAccess = []
}) => {
  const { currentWorkspace } = useWorkspace();
  const { uploads } = useUploads();
  
  // Count active uploads
  const activeUploads = uploads.filter(upload => upload.status === 'uploading' || upload.status === 'paused');

  const navigationItems = [
    { 
      id: 'dashboard', 
      icon: Home, 
      label: 'Dashboard',
      adminOnly: false
    },
    { 
      id: 'project-v3', 
      icon: FolderTree, 
      label: 'Projects',
      adminOnly: false
    },
    { 
      id: 'favorites', 
      icon: Star, 
      label: 'Favorites',
      adminOnly: false
    },
    { 
      id: 'tags', 
      icon: Tag, 
      label: 'Tags',
      adminOnly: false
    },
    { 
      id: 'uploads', 
      icon: Upload, 
      label: 'Uploads',
      adminOnly: false
    }
  ];

  const secondaryItems = [
    // No secondary items for now
  ];

  const filteredNavigationItems = navigationItems.filter(item => 
    !item.adminOnly || userRole === 'admin'
  );

  const filteredSecondaryItems = secondaryItems.filter(item => 
    !item.adminOnly || userRole === 'admin'
  );

  const handleNavClick = (viewId: string) => {
    const item = [...navigationItems, ...secondaryItems].find(nav => nav.id === viewId);
    if (userRole === 'employee' && item?.adminOnly) {
      return;
    }
    onViewChange?.(viewId);
  };



  return (
    <div className={`flex flex-col w-64 h-full rounded-2xl ${className}`}>
      {/* Workspace Selector at the top */}
      <div className="p-4 border-b border-dark-surface/50">
        <NewWorkspaceSelector />
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 py-3 overflow-y-auto">
        {/* Main Navigation */}
        <nav className="space-y-1">
          {filteredNavigationItems.map((item, index) => {
            const isActive = activeView === item.id;
            const showNotification = item.id === 'uploads' && activeUploads.length > 0;
            
            // Add extra spacing after Projects (before Tags)
            const isAfterProjects = item.id === 'tags';
            
            return (
              <div key={item.id}>
                {isAfterProjects && (
                  <div className="my-4"></div>
                )}
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-[#262626] text-light-text'
                      : 'text-light-text/80 hover:bg-[#262626] hover:text-light-text'
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-light-text' : ''}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {showNotification && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-400">{activeUploads.length}</span>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-dark-surface to-transparent mb-3"></div>

        {/* Secondary Navigation */}
        <nav className="space-y-1">
          {filteredSecondaryItems.map((item) => {
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#262626] text-light-text'
                    : 'text-light-text/80 hover:bg-[#262626] hover:text-light-text'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-light-text' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Employee Notice - Only show in sidebar for employees */}
        {userRole === 'employee' && (
          <div className="mt-4 p-4 bg-dark-surface/50 border border-dark-surface/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-light-text">Employee Account</span>
            </div>
            <p className="text-xs text-light-text/70 leading-relaxed">
              Limited access. Contact admin for additional permissions.
            </p>
          </div>
        )}
      </div>

      {/* Account Switcher - Fixed at bottom */}
      <div className="p-4 border-t border-dark-surface/50 mt-auto">
        <AccountSwitcher 
          currentRole={userRole}
        />
      </div>

    </div>
  );
}

export default Sidebar;