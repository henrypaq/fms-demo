import React, { useState, useCallback } from 'react';
import SidebarNew from './components/layout/SidebarNew';
import FileGridSimple from './components/features/FileGridSimple';
import FilePreviewModal from './components/FilePreviewModal';
import SharePage from './components/SharePage';
import ProjectV3View from './components/features/ProjectV3View';
import ProjectFolderSidebar from './components/features/ProjectFolderSidebar';
import TagView from './components/features/TagView';
import AdminDashboard from './components/AdminDashboard';
import UploadsPanel from './components/features/UploadsPanel';
import LoginPage from './components/LoginPage';
import GlobalSearchResults from './components/GlobalSearchResults';
import UploadSheet from './components/features/UploadSheet';
import UploadModal from './components/features/UploadModal';
import { AssetBar } from './components/features/AssetBar';
import { WorkspaceProvider, useWorkspace } from './contexts/WorkspaceContext';
import { UploadProvider } from './contexts/UploadContext';
import { QueryProvider } from './providers/QueryProvider';
import { ToastProvider } from './components/ui/toast';
import { useFileData } from './hooks/useFileData';
import { useFileSearch, SearchFilters } from './hooks/useFileSearch';
import { useFileFilters } from './hooks/useFileFilters';
import { useGlobalSearch } from './hooks/useGlobalSearch';
import { ViewMode, FilterType } from './types/ui';
import { FileItem } from './components/features/FileCard';
import { LoadingSpinner, EmptyState, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar-shadcn';

// Fallback component for when workspace is not available
const WorkspaceSelectFallback: React.FC = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-6">
      <LoadingSpinner size="lg" text="Setting up your workspace..." />
    </div>
  </div>
);

// Error fallback component
const ErrorFallback: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <EmptyState
      icon={<span className="text-destructive text-4xl">⚠️</span>}
      title="Something went wrong"
      description={error}
      action={onRetry ? { label: "Try Again", onClick: onRetry } : undefined}
    />
  </div>
);

function AppContent() {
  // Check if we're on a share page first (this doesn't require workspace)
  const isSharePage = window.location.pathname.startsWith('/share/');
  const shareFileId = isSharePage ? window.location.pathname.split('/share/')[1] : null;

  if (isSharePage && shareFileId) {
    return <SharePage fileId={shareFileId} />;
  }

  // For non-share pages, we need workspace context
  return <AppWithWorkspace />;
}

function AppWithWorkspace() {
  const { currentWorkspace, loading: workspaceLoading, error: workspaceError } = useWorkspace();
  
  // Show loading state while workspace is loading
  if (workspaceLoading) {
    return <WorkspaceSelectFallback />;
  }

  // Show error state if workspace failed to load
  if (workspaceError) {
    return (
      <ErrorFallback 
        error={workspaceError} 
        onRetry={() => window.location.reload()} 
      />
    );
  }

  // Show fallback if no workspace is available
  if (!currentWorkspace) {
    return <WorkspaceSelectFallback />;
  }

  // Only render main content when workspace is fully loaded
  return <AppWithAuth currentWorkspace={currentWorkspace} />;
}

// Authentication wrapper component
function AppWithAuth({ currentWorkspace }: { currentWorkspace: any }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Demo mode: Set up mock user
  React.useEffect(() => {
    // Simulate user loading delay
    setTimeout(() => {
      setCurrentUser({
        id: 'demo-user-id',
        email: 'demo@njordgear.com',
        role: 'admin',
        projectAccess: []
      });
      setIsAuthenticated(true);
      setUserLoading(false);
    }, 500);
  }, []);

  // Show loading state while user is loading
  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {
      setCurrentUser({
        id: 'demo-user-id',
        email: 'demo@njordgear.com',
        role: 'admin',
        projectAccess: []
      });
      setIsAuthenticated(true);
      setUserLoading(false);
    }} />;
  }

  // Render the main app content
  return <AppWithFileData currentWorkspace={currentWorkspace} currentUser={currentUser} />;
}

// File data wrapper component to handle loading/error states
function AppWithFileData({ currentWorkspace, currentUser }: { currentWorkspace: any; currentUser: any }) {
  // Get files for current workspace context with server-side sorting
  const { 
    files, 
    loading, 
    error, 
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPrevPage,
    sortBy: serverSortBy,
    sortDirection: serverSortDirection,
    activeView: currentActiveView,
    toggleFavorite, 
    updateFile, 
    deleteFile,
    addFiles, 
    refreshFiles,
    changeView,
    nextPage,
    prevPage,
    goToPage,
    handleSortChange
  } = useFileData(false, false); // No trash view

  // Optimistic uploads disabled for now

  // Handle loading and error states
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your files..." />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorFallback 
        error={error} 
        onRetry={refreshFiles} 
      />
    );
  }

  // Render the main app content with file data
  return (
    <AppContentWithWorkspace 
      currentWorkspace={currentWorkspace} 
      currentUser={currentUser}
      files={files}
      loading={loading}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      hasNextPage={hasNextPage}
      hasPrevPage={hasPrevPage}
      serverSortBy={serverSortBy}
      serverSortDirection={serverSortDirection}
      currentActiveView={currentActiveView}
      toggleFavorite={toggleFavorite}
      updateFile={updateFile}
      deleteFile={deleteFile}
      addFiles={addFiles}
      refreshFiles={refreshFiles}
      changeView={changeView}
      nextPage={nextPage}
      prevPage={prevPage}
      goToPage={goToPage}
      handleSortChange={handleSortChange}
    />
  );
}

function AppContentWithWorkspace({ 
  currentUser,
  files,
  loading,
  currentPage,
  totalPages,
  totalCount,
  hasNextPage,
  hasPrevPage,
  serverSortBy,
  serverSortDirection,
  currentActiveView,
  toggleFavorite,
  updateFile,
  deleteFile,
  addFiles,
  refreshFiles,
  changeView,
  nextPage,
  prevPage,
  goToPage,
  handleSortChange
}: { 
  currentWorkspace: unknown; 
  currentUser: unknown;
  files: unknown;
  loading: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  serverSortBy: string;
  serverSortDirection: string;
  currentActiveView: string;
  toggleFavorite: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<FileItem>) => void;
  deleteFile: (fileId: string) => void;
  addFiles: (files: FileItem[]) => void;
  refreshFiles: (view: string) => void;
  changeView: (view: string) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  handleSortChange: (sortBy: string, sortDirection: string) => void;
}) {
  // All hooks are called at the top level without any early returns
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [showProjectV3View, setShowProjectV3View] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showUploadsView, setShowUploadsView] = useState(false);
  const [showTagsView, setShowTagsView] = useState(false);
  const [showFilesView, setShowFilesView] = useState(true);
  
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [triggerCreateProject, setTriggerCreateProject] = useState(0);
  const [triggerCreateTag, setTriggerCreateTag] = useState(0);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    tags: []
  });
  const [fileGridCollapsed, setFileGridCollapsed] = useState(false);
  const [tagsVisible, setTagsVisible] = useState(true);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Auto-show uploads panel when uploads start
  // Auto-show uploads panel when there are active uploads (disabled for now)
  // useEffect(() => {
  //   const activeUploads = uploads.filter(upload => upload.status === 'uploading');
  //   if (activeUploads.length > 0 && !showUploadsView) {
  //     setShowUploadsView(true);
  //   }
  // }, [uploads, showUploadsView]);

  // Filter state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');

  // Global search hook with smart matching
  const globalSearchResults = useGlobalSearch(
    searchFilters.query, 
    searchFilters.tags,
    currentActiveView
  );

  // Determine if we should show global search results
  const shouldShowGlobalSearch = searchFilters.query.trim().length >= 2 || searchFilters.tags.length > 0;

  // Apply search filters using the hook - must be called at top level
  const searchFilteredFiles = useFileSearch(files, searchFilters);

  // Apply additional filters using the new hook - this handles favorites filtering
  const { filteredFiles } = useFileFilters({
    files: searchFilteredFiles,
    viewMode,
    sortBy: serverSortBy,
    sortDirection: serverSortDirection,
    filterType,
    searchQuery: searchFilters.query,
    selectedTags: searchFilters.tags,
    activeView: currentActiveView
  });

  // Selection handlers - must be after filteredFiles is defined
  const handleSelectAll = useCallback(() => {
    if (selectedFileIds.size === filteredFiles.length && filteredFiles.length > 0) {
      // Deselect all
      setSelectedFileIds(new Set());
    } else {
      // Select all
      setSelectedFileIds(new Set(filteredFiles.map((f: any) => f.id)));
    }
  }, [filteredFiles, selectedFileIds]);

  const allSelected = filteredFiles.length > 0 && selectedFileIds.size === filteredFiles.length;
  const someSelected = selectedFileIds.size > 0 && selectedFileIds.size < filteredFiles.length;

  const handleFileDoubleClick = useCallback((file: FileItem) => {
    setSelectedFile(file);
    setShowPreview(true);
  }, []);

  const handleFileUpdate = useCallback(async (fileId: string, updates: Partial<FileItem>) => {
    try {
      await updateFile(fileId, updates);
      // Update the selected file if it's the one being updated
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile({ ...selectedFile, ...updates });
      }
    } catch (error) {
      console.error('Failed to update file:', error);
      throw error;
    }
  }, [updateFile, selectedFile]);

  const handleFileDelete = useCallback(async (fileId: string) => {
    try {
      await deleteFile(fileId);
      
      // Close preview if the deleted file was being previewed
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile(null);
        setShowPreview(false);
      }
    } catch (error) {
      console.error('App: Failed to delete file:', error);
      throw error;
    }
  }, [deleteFile, selectedFile]);

  const handleFileMove = useCallback(async (fileId: string, projectId: string | null, folderId: string | null) => {
    try {
      
      await updateFile(fileId, { 
        projectId: projectId || undefined, 
        folderId: folderId || undefined 
      });
      
      
      // Refresh files to update the view
      setTimeout(() => {
        refreshFiles(currentActiveView);
      }, 5);
    } catch (error) {
      console.error('Failed to move file:', error);
      throw error;
    }
  }, [updateFile, refreshFiles, currentActiveView]);



  const handleSearchChange = useCallback((query: string) => {
    setSearchFilters(prev => ({ ...prev, query }));
  }, []);



  const handleViewChange = useCallback((view: string) => {
    console.log('View change:', view);
    
    // Reset all view flags first
    setShowAdminDashboard(false);
    setShowProjectV3View(false);
    setShowUploadsView(false);
    setShowTagsView(false);
    setShowFilesView(false);
    
    // Reset project-specific state when leaving project view
    if (view !== 'project-v3') {
      setSelectedProject(null);
      setSidebarData(null);
    }
    
    // Handle special views
    if (view === 'project-v3') {
      setActiveView('project-v3');
      setShowProjectV3View(true);
      return;
    }

    if (view === 'admin-dashboard') {
      setActiveView('admin-dashboard');
      setShowAdminDashboard(true);
      return;
    }

    if (view === 'uploads') {
      setActiveView('dashboard'); // Keep main content visible
      setShowUploadsView(true);
      return;
    }

    if (view === 'tags') {
      setActiveView('tags');
      setShowTagsView(true);
      return;
    }

    // Handle Files view like Projects/Uploads - ULTRA-FAST
    if (view === 'dashboard') {
      setActiveView('dashboard');
      setShowFilesView(true);
      return;
    }
    
    // Fallback for any other views
    setActiveView(view);
  }, []);

  const handleBackFromProjectV3 = useCallback(() => {
    setShowProjectV3View(false);
    setActiveView('dashboard');
    setShowFilesView(true);
    changeView('dashboard');
  }, [changeView]);

  const handleBackToProjectsList = useCallback(() => {
    console.log('Back to projects list clicked');
    // Clear project-specific state
    setSelectedProject(null);
    setSidebarData(null);
    // Don't need to call handleViewChange - the key prop will force remount
    // The ProjectV3View will automatically show the projects list when selectedProject is null
  }, []);

  const handleBackFromAdminDashboard = useCallback(() => {
    setShowAdminDashboard(false);
    setActiveView('dashboard');
    setShowFilesView(true);
    changeView('dashboard');
  }, [changeView]);

  // Dynamic CTA configuration based on current view
  const getCtaConfig = () => {
    if (showProjectV3View && !selectedProject) {
      return {
        label: 'New Project',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
        action: () => setTriggerCreateProject(prev => prev + 1)
      };
    }
    if (showTagsView) {
      return {
        label: 'New Tag',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
        action: () => setTriggerCreateTag(prev => prev + 1)
      };
    }
    if (showAdminDashboard) {
      return {
        label: 'New User',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        ),
        action: () => setShowUploadModal(true) // Open modal for admin
      };
    }
    // Default CTA for files view and others
    return {
      label: 'Upload',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      action: () => setShowUploadModal(true) // Open modal for header CTA
    };
  };

  const getViewTitle = () => {
    if (showProjectV3View) {
      // Show project name when inside a project, otherwise show "Projects"
      return selectedProject ? selectedProject.name : 'Projects';
    }
    if (showAdminDashboard) {
      return 'Admin Dashboard';
    }
    if (showUploadsView) {
      return 'Uploads';
    }
    if (showTagsView) {
      return 'Tags';
    }
    switch (activeView) {
      case 'dashboard':
        return 'All Files';
      case 'favorites':
        return 'Favorites';
      case 'recent':
        return 'Recent';
      case 'trash':
        return 'Recently Deleted';
      case 'tags':
        return 'Tags';
      default:
        return 'All Files';
    }
  };

  return (
    <div className="relative h-screen overflow-hidden">
      <SidebarProvider className={showUploadSheet ? 'upload-sheet-open' : ''}>
        <SidebarNew 
          activeView={showProjectV3View ? 'project-v3' : showAdminDashboard ? 'admin-dashboard' : showUploadsView ? 'uploads' : activeView}
          onViewChange={handleViewChange}
          onUploadClick={() => setShowUploadSheet(true)}
          uploadSheetOpen={showUploadSheet}
          userRole={currentUser?.role || 'employee'}
          userProjectAccess={currentUser?.projectAccess || []}
          currentUser={currentUser}
        />
        
        <SidebarInset className="flex flex-col h-screen">
        {/* Top Navigation Header - Consolidated */}
        <header className="flex h-16 shrink-0 items-center gap-2 raised-panel w-full px-6 py-4 mx-0">
          <div className="flex items-center justify-between flex-1">

            {/* Left Side - Back Button (only when inside a project) */}
            {showProjectV3View && selectedProject && (
              <button
                onClick={handleBackToProjectsList}
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
                title="Back to Projects"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}

            {/* Center - Search Bar */}
            <div className={`flex-1 flex ${showProjectV3View && selectedProject ? 'justify-center' : 'justify-center'}`}>
              <div className="w-full max-w-md">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search files, folders, or tags..."
                    value={searchFilters.query}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-card-light border border-border/60 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-border focus:bg-card-light hover:border-border hover:bg-card-light hover:brightness-125 focus:brightness-125"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground transition-colors duration-200 ease-out group-hover:text-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

              {/* Right Side - Actions */}
              <div className="flex items-center gap-4">
                {/* Dynamic CTA Button */}
                {(() => {
                  const ctaConfig = getCtaConfig();
                  return (
                    <Button 
                      onClick={ctaConfig.action}
                      variant="outline"
                      size="sm"
                      className="gap-2 border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white hover:border-[#6049E3] transition-all"
                    >
                      {ctaConfig.icon}
                      <span className="hidden sm:inline">{ctaConfig.label}</span>
                    </Button>
                  );
                })()}
              </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden content-gutter">
          <div className="h-full flex gap-1">
            {/* Project Sidebar - Only show when inside a project */}
            {showProjectV3View && selectedProject && sidebarData && (
              <ProjectFolderSidebar
                key={selectedProject?.id} // Force remount when project changes
                folderTree={sidebarData.folderTree}
                currentFolder={sidebarData.currentFolder}
                expandedFolders={sidebarData.expandedFolders}
                draggedItem={sidebarData.draggedItem}
                dragOverFolder={sidebarData.dragOverFolder}
                onSelectFolder={sidebarData.onSelectFolder}
                onToggleFolder={sidebarData.onToggleFolder}
                onCreateFolder={sidebarData.onCreateFolder}
                onDragOver={sidebarData.onDragOver}
                onDragLeave={sidebarData.onDragLeave}
                onDrop={sidebarData.onDrop}
                onDragStart={sidebarData.onDragStart}
              />
            )}
            
            <div className={`h-full raised-panel w-full mx-0 overflow-y-auto overflow-x-visible ${showProjectV3View && selectedProject ? 'flex-1' : ''}`}>
            {/* Secondary Content Header - Filter Bar and CTA */}
            {!showAdminDashboard && (
              <div className="flex items-center justify-between py-2 border-b border-border mx-0 px-6 mb-4">
                {/* Left Side - Page Title */}
                <div className="flex items-center">
                  <h1 className="text-lg font-medium text-foreground">{getViewTitle()}</h1>
                </div>

                {/* Right Side - Filters and Controls */}
                <div className="flex items-center gap-3">
                  {/* View Toggles - Dropdown Style */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs hover:bg-muted/50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        {viewMode === 'grid' ? 'Grid' : 'List'}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setViewMode('grid')}>
                        Grid View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setViewMode('list')}>
                        List View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Filter Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs hover:bg-muted/50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {filterType === 'all' ? 'All Files' : 
                         filterType === 'favorites' ? 'Favorites' :
                         filterType === 'recent' ? 'Recent' :
                         filterType === 'images' ? 'Images' :
                         filterType === 'documents' ? 'Documents' :
                         filterType === 'videos' ? 'Videos' :
                         filterType === 'audio' ? 'Audio' :
                         filterType === 'archives' ? 'Archives' :
                         'All Files'}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => setFilterType('all')}>
                        All Files
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('favorites')}>
                        Favorites
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('recent')}>
                        Recent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('images')}>
                        Images
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('documents')}>
                        Documents
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('videos')}>
                        Videos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('audio')}>
                        Audio
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterType('archives')}>
                        Archives
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs hover:bg-muted/50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                        </svg>
                        Sort: {serverSortBy === 'date' ? 'Date Modified' : serverSortBy === 'name' ? 'Name' : serverSortBy === 'size' ? 'Size' : 'Type'}
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleSortChange('date', 'desc')}>
                        Date Modified
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('name', 'asc')}>
                        Name A-Z
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('name', 'desc')}>
                        Name Z-A
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('size', 'desc')}>
                        Size
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleSortChange('type', 'asc')}>
                        Type
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {/* Assets Bar - Show on pages that don't have their own assets bar */}
            {!showAdminDashboard && !showProjectV3View && (
              <AssetBar
                assetCount={filteredFiles.length}
                totalSize={filteredFiles.reduce((total: number, file: any) => total + (file.fileSize || 0), 0)}
                assetType={showUploadsView ? 'Uploads' : 'Assets'}
                isCollapsed={fileGridCollapsed}
                onToggleCollapse={() => setFileGridCollapsed(!fileGridCollapsed)}
                showTagsToggle={true}
                tagsVisible={tagsVisible}
                onToggleTags={() => setTagsVisible(!tagsVisible)}
                allSelected={allSelected}
                someSelected={someSelected}
                onSelectAll={handleSelectAll}
              />
            )}

            {/* Mutually exclusive view rendering - only ONE view shows at a time */}
            
            {/* Projects View - no wrapper padding as it manages its own */}
            {showProjectV3View ? (
              <ProjectV3View 
                key={selectedProject?.id || 'projects-list'} // Force remount on project change
                onBack={handleBackFromProjectV3}
                onProjectChange={setSelectedProject}
                onSidebarDataChange={setSidebarData}
                onProjectBackClick={handleBackToProjectsList}
                triggerCreateProject={triggerCreateProject}
              />
            ) : showTagsView ? (
              /* Tags View - no wrapper padding as it manages its own */
              <TagView 
                userRole={currentUser?.role || 'employee'}
                triggerCreateTag={triggerCreateTag}
              />
            ) : showAdminDashboard ? (
              /* Admin Dashboard */
              <div className="px-6 py-4 overflow-visible">
                <AdminDashboard onClose={handleBackFromAdminDashboard} />
              </div>
            ) : showFilesView ? (
              /* File Views (Dashboard, Recent, Favorites, Trash) */
              <div className="px-6 py-4 overflow-visible h-full">
                {shouldShowGlobalSearch ? (
                  <GlobalSearchResults
                    query={searchFilters.query}
                    selectedTags={searchFilters.tags}
                    files={globalSearchResults.files}
                    loading={globalSearchResults.loading}
                  />
                ) : (
                  <FileGridSimple
                    files={filteredFiles}
                    onFileClick={(file) => setSelectedFile(file)}
                    onFileDoubleClick={handleFileDoubleClick}
                    onFileUpdate={handleFileUpdate}
                    onFileDelete={handleFileDelete}
                    onFileMove={handleFileMove}
                    filterType={activeView as any}
                    loading={loading}
                    totalCount={totalCount}
                    hasNextPage={hasNextPage}
                    hasPrevPage={hasPrevPage}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onNextPage={nextPage}
                    onPrevPage={prevPage}
                    onGoToPage={goToPage}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    sortBy={serverSortBy}
                    sortDirection={serverSortDirection}
                    onSortChange={handleSortChange}
                    isCollapsed={fileGridCollapsed}
                    tagsVisible={tagsVisible}
                    selectedFileIds={selectedFileIds}
                    onSelectionChange={setSelectedFileIds}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
        </div>

        {/* Uploads Panel */}
          {showUploadsView && (
            <UploadsPanel 
              isOpen={showUploadsView}
              onClose={() => setShowUploadsView(false)}
            />
          )}

        {/* Upload Sheet (for sidebar button) */}
        <UploadSheet
          isOpen={showUploadSheet}
          onOpenChange={setShowUploadSheet}
        />

        {/* Upload Modal (for header CTA) */}
        <UploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
        />

        {/* File Preview Modal */}
        {showPreview && selectedFile && (
          <FilePreviewModal
            file={selectedFile}
            isOpen={showPreview}
            onClose={() => {
              setShowPreview(false);
              setSelectedFile(null);
            }}
            onUpdate={handleFileUpdate}
            onToggleFavorite={toggleFavorite}
          />
        )}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

// Main App component with providers
function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <WorkspaceProvider>
          <UploadProvider>
            <AppContent />
          </UploadProvider>
        </WorkspaceProvider>
      </ToastProvider>
    </QueryProvider>
  );
}

export default App;

