import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Upload,
  X,
  Loader,
  Home,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Save,
  Move,
  AlertTriangle,
  CheckSquare,
  Square,
  Eye,
  Star,
  Download,
  Image,
  Video,
  Music,
  Archive,
  File,
  FileText
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import FileCard, { FileItem } from './FileCard';
import UploadSheet from './UploadSheet';
import { markFilesAsUpdated } from '../../contexts/WorkspaceContext';
import BatchActionBar from '../BatchActionBar';
import { FilterType } from '../../types/ui';
import FilePreviewModal from '../FilePreviewModal';
import { RiFolder3Line, RiFile3Line, RiVideoLine } from '@remixicon/react';
import { Icon, IconSizes, IconColors } from '../ui/Icon';

interface ProjectWorkspaceViewProps {
  project: any;
  onBack: () => void;
  renderSidebar?: boolean;
  onSidebarDataChange?: (data: any) => void;
}

type SortOption = 'name' | 'date' | 'size' | 'type';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

// Convert database file to FileItem
const convertFileRecord = (record: any): FileItem => ({
  id: record.id,
  name: record.name,
  type: record.file_category,
  size: formatFileSize(record.file_size),
  modifiedDate: new Date(record.updated_at).toLocaleDateString(),
  thumbnail: record.thumbnail_url || undefined,
  isFavorite: record.is_favorite,
  tags: record.tags || [],
  originalName: record.original_name,
  filePath: record.file_path,
  fileType: record.file_type,
  fileSize: record.file_size,
  fileUrl: record.file_url || undefined,
  workspaceId: record.workspace_id,
  projectId: record.project_id || undefined,
  folderId: record.folder_id || undefined,
});

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Create Folder Modal - REWRITTEN for better reliability
const CreateFolderModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  currentProject: any;
  currentFolder: any;
}> = ({ isOpen, onClose, onSubmit, currentProject, currentFolder }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Folder name is required');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Folder name must be 50 characters or less');
      return;
    }

    // Check for invalid characters
    if (/[<>:"/\\|?*]/.test(trimmedName)) {
      setError('Folder name contains invalid characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({ name: trimmedName });
      // Modal will be closed by parent component on success
    } catch (err) {
      console.error('Error creating folder:', err);
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  console.log('CreateFolderModal rendering, isOpen:', isOpen);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1C3A]/90 backdrop-blur-md border border-[#2A2C45]/60 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#CFCFF6]">Create Folder</h3>
            <button 
              onClick={onClose} 
              disabled={isSubmitting}
              className="p-2 rounded-lg text-[#CFCFF6]/60 hover:text-white hover:bg-[#1A1C3A]/60 transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">
                <Icon Icon={RiFolder3Line} size={IconSizes.small} color={IconColors.muted} className="inline mr-1" />
                Folder Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null); // Clear error when user types
                }}
                placeholder="Enter folder name..."
                className="w-full px-3 py-2 bg-[#1A1C3A]/40 border border-[#2A2C45]/40 rounded-lg text-[#CFCFF6] placeholder-[#CFCFF6]/40 focus:outline-none focus:ring-2 focus:ring-[#6049E3]/50 focus:border-[#6049E3]/50"
                autoFocus
                disabled={isSubmitting}
                maxLength={50}
              />
              {error && (
                <p className="text-red-400 text-sm mt-1">{error}</p>
              )}
            </div>

            <div className="text-sm text-[#CFCFF6]/60">
              <p>Creating folder in:</p>
              <p className="font-medium text-[#CFCFF6]">
                {currentProject?.name}
                {currentFolder && ` > ${currentFolder.path}`}
                {!currentFolder && ' > Root'}
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create Folder</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#1A1C3A]/60 hover:bg-[#1A1C3A] text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({ 
  project, 
  onBack, 
  renderSidebar = true,
  onSidebarDataChange 
}) => {
  const { currentWorkspace } = useWorkspace();
  
  // Data state
  const [folders, setFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<FileItem | null>(null);

  // UI state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // Enhanced drag and drop state for both files and folders
  const [draggedItem, setDraggedItem] = useState<{id: string, type: 'file' | 'folder'} | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  
  // Batch selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [folderMenu, setFolderMenu] = useState<{folder: any, x: number, y: number} | null>(null);
  const [showRenameFolder, setShowRenameFolder] = useState<{folder: any} | null>(null);
  const [showDeleteFolder, setShowDeleteFolder] = useState<{folder: any} | null>(null);
  const [renameFolderName, setRenameFolderName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showMoveFolder, setShowMoveFolder] = useState<{ folder: any } | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const loadFolders = async () => {
    try {
      console.log('📂 Loading folders for project:', project.id);
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', project.id)
        .is('deleted_at', null)
        .order('path');

      if (foldersError) {
        console.error('❌ Supabase error loading folders:', {
          message: foldersError.message,
          details: foldersError.details,
          hint: foldersError.hint,
          code: foldersError.code,
          fullError: foldersError
        });
        throw foldersError;
      }

      console.log('✅ Successfully loaded folders:', foldersData?.length || 0, foldersData);
      setFolders(foldersData || []);
    } catch (err) {
      console.error('❌ Error loading folders - Full error object:', err);
      console.error('❌ Error message:', err instanceof Error ? err.message : 'Unknown error');
      console.error('❌ Error details:', JSON.stringify(err, null, 2));
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      if (!currentWorkspace) throw new Error('No workspace selected');
      let query = supabase
        .from('files')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('project_id', project.id)
        .is('deleted_at', null);

      // Filter by folder
      if (currentFolder) {
        query = query.eq('folder_id', currentFolder.id);
      } else {
        query = query.is('folder_id', null);
      }

      const { data: filesData, error: filesError } = await query
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      const convertedFiles = (filesData || []).map(convertFileRecord);
      setFiles(convertedFiles);
      setError(null);

    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load: load folders, then files
  useEffect(() => {
    if (project && currentWorkspace) {
      (async () => {
        await loadFolders();
        await loadFiles();
      })();
    }
  }, [project, currentWorkspace]);

  // When navigating folders, load files for the selected folder
  useEffect(() => {
    if (project && currentWorkspace && currentFolder !== undefined) {
      loadFiles();
    }
  }, [currentFolder]);

  const createFolder = async (folderData: any) => {
    try {
      // Calculate the path based on parent folder
      let path = folderData.name;
      if (currentFolder?.path) {
        path = `${currentFolder.path}/${folderData.name}`;
      }
      
      const { data, error } = await supabase
        .from('folders')
        .insert([{
          name: folderData.name,
          project_id: project.id,
          parent_id: currentFolder?.id || null,
          path: path
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating folder:', error);
        throw new Error(`Failed to create folder: ${error.message}`);
      }

      
      // Reload folders to get updated tree
      await loadFolders();
      setShowCreateFolder(false);
      
    } catch (err) {
      console.error('Error creating folder:', err);
      throw err; // Re-throw to be handled by modal
    }
  };

  const moveFolder = async (folderId: string, newParentId: string | null) => {
    try {
      // Prevent moving folder into itself or its children
      if (folderId === newParentId) return;
      
      // Check if target is a child of the folder being moved
      const isChildOfMovedFolder = (targetId: string | null, movedFolderId: string): boolean => {
        if (!targetId) return false;
        
        const targetFolder = folders.find(f => f.id === targetId);
        if (!targetFolder) return false;
        
        if (targetFolder.parent_id === movedFolderId) return true;
        
        return isChildOfMovedFolder(targetFolder.parent_id, movedFolderId);
      };

      if (newParentId && isChildOfMovedFolder(newParentId, folderId)) {
        return;
      }

      const { error } = await supabase
        .from('folders')
        .update({ parent_id: newParentId })
        .eq('id', folderId);

      if (error) throw error;

      await loadFolders(); // Reload to get updated tree structure
    } catch (err) {
      console.error('Error moving folder:', err);
    }
  };

  // Move file to folder
  const moveFile = async (fileId: string, newFolderId: string | null) => {
    try {
      
      const { error } = await supabase
        .from('files')
        .update({ 
          folder_id: newFolderId,
          project_id: project.id // Ensure it stays in the same project
        })
        .eq('id', fileId);

      if (error) throw error;

      markFilesAsUpdated();
      await loadFiles(); // Reload files to update the view
    } catch (err) {
      console.error('Error moving file:', err);
    }
  };

  const handleFileUpdate = async (fileId: string, updates: Partial<FileItem>) => {
    try {
      const { supabase } = await import('../../lib/supabase');
      
      const dbUpdates: any = {};
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
      if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite;
      if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId || null;
      if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId || null;
      
      const { error } = await supabase
        .from('files')
        .update(dbUpdates)
        .eq('id', fileId);
      
      if (error) throw error;
      
      // Update local state
      setFiles(prev => prev.map(file => 
        file.id === fileId ? { ...file, ...updates } : file
      ));
      
      markFilesAsUpdated();
      
      // If we moved the file, refresh the view
      if (updates.projectId !== undefined || updates.folderId !== undefined) {
        await loadFiles();
      }
      
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  };

  const handleFileMove = async (fileId: string, projectId: string | null, folderId: string | null) => {
    try {
      
      const { error } = await supabase
        .from('files')
        .update({ 
          project_id: projectId,
          folder_id: folderId
        })
        .eq('id', fileId);
      
      if (error) throw error;
      
      markFilesAsUpdated();
      await loadFiles(); // Reload to update the view
      
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  };

  const handleToggleFavorite = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) return;
      
      await handleFileUpdate(fileId, { isFavorite: !file.isFavorite });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: null
        })
        .eq('id', fileId);
      
      if (error) throw error;
      
      // Remove from local state
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  };

  const selectFolder = (folder: any) => {
    setCurrentFolder(folder);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Add folder rename handler
  const renameFolder = async (folderId: string, newName: string) => {
    setIsRenaming(true);
    setRenameError(null);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folderId);
      if (error) throw error;
      await loadFolders();
      setShowRenameFolder(null);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename folder');
    } finally {
      setIsRenaming(false);
    }
  };

  // Add folder delete handler (soft delete)
  const deleteFolder = async (folderId: string) => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('folders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', folderId);
      if (error) throw error;
      await loadFolders();
      setShowDeleteFolder(null);
    } catch (err) {
      alert('Failed to delete folder.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Build folder tree
  const folderTree = useMemo(() => {
    console.log('🌳 Building folder tree from', folders.length, 'folders');
    const folderMap = new Map();
    const rootFolders: any[] = [];

    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id);
      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children.push(folderNode);
        } else {
          rootFolders.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    console.log('🌳 Built folder tree with', rootFolders.length, 'root folders:', rootFolders);
    return rootFolders;
  }, [folders]);

  // Folders to show in the main content area (children of currentFolder)
  const childFolders = useMemo(() => {
    const result = folders.filter(f => (currentFolder ? f.parent_id === currentFolder.id : !f.parent_id));
    console.log('📁 Child folders for main grid:', {
      currentFolder: currentFolder?.name || 'Root',
      totalFolders: folders.length,
      childFoldersCount: result.length,
      childFolders: result.map(f => f.name)
    });
    return result;
  }, [folders, currentFolder]);

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(file => 
        file.name.toLowerCase().includes(query) ||
        file.originalName.toLowerCase().includes(query) ||
        (file.tags && file.tags.some(tag => tag.toLowerCase().includes(query)))
      );
    }

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'favorites') {
        result = result.filter(file => file.isFavorite);
      } else {
        result = result.filter(file => file.type === filterType);
      }
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.modifiedDate).getTime() - new Date(b.modifiedDate).getTime();
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [files, searchQuery, filterType, sortBy, sortDirection]);

  // Enhanced drag and drop handlers for both files and folders
  const handleDragStart = (e: React.DragEvent, itemId: string, itemType: 'file' | 'folder') => {
    console.log('🎬 Drag started:', itemType, itemId);
    setDraggedItem({ id: itemId, type: itemType });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${itemType}:${itemId}`);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset drag state when drag operation ends (whether successful or cancelled)
    setDraggedItem(null);
    setDragOverFolder(null);
  };

  const handleDragOver = (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolder(targetFolderId);
  };

  const handleDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    console.log('📦 Drop event:', {
      draggedItem,
      targetFolder: targetFolderId || 'Project Root'
    });
    
    if (!draggedItem) {
      console.warn('⚠️ No dragged item');
      return;
    }
    
    const { id: draggedId, type: draggedType } = draggedItem;
    
    // Handle folder drops
    if (draggedType === 'folder' && draggedId !== targetFolderId) {
      console.log('📁 Moving folder:', draggedId, 'to', targetFolderId || 'root');
      await moveFolder(draggedId, targetFolderId);
    }
    
    // Handle file drops
    if (draggedType === 'file') {
      console.log('📄 Moving file:', draggedId, 'to folder', targetFolderId || 'root');
      await moveFile(draggedId, targetFolderId);
    }
    
    setDraggedItem(null);
    setDragOverFolder(null);
  };

  // Batch selection handlers
  const handleSelectionChange = (fileId: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(fileId);
      } else {
        newSelection.delete(fileId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0) {
      // Deselect all
      setSelectedFiles(new Set());
    } else {
      // Select all visible files
      setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedFiles(new Set());
  };

  const handleBatchMove = async (fileIds: string[], projectId: string | null, folderId: string | null) => {
    try {
      // Move files one by one
      for (const fileId of fileIds) {
        await handleFileMove(fileId, projectId, folderId);
      }
      // Refresh the view
      await loadFiles();
    } catch (error) {
      console.error('Batch move failed:', error);
      throw error;
    }
  };

  const handleBatchAddTags = async (fileIds: string[], tagsToAdd: string[]) => {
    try {
      // Add tags to each file
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (file) {
          const currentTags = file.tags || [];
          const newTags = [...new Set([...currentTags, ...tagsToAdd])];
          await handleFileUpdate(fileId, { tags: newTags });
        }
      }
    } catch (error) {
      console.error('Batch add tags failed:', error);
      throw error;
    }
  };

  const handleBatchRemoveTags = async (fileIds: string[], tagsToRemove: string[]) => {
    try {
      // Remove tags from each file
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (file && file.tags) {
          const newTags = file.tags.filter(tag => !tagsToRemove.includes(tag));
          await handleFileUpdate(fileId, { tags: newTags });
        }
      }
    } catch (error) {
      console.error('Batch remove tags failed:', error);
      throw error;
    }
  };

  const handleBatchToggleFavorite = async (fileIds: string[]) => {
    try {
      for (const fileId of fileIds) {
        await handleToggleFavorite(fileId);
      }
    } catch (error) {
      console.error('Batch toggle favorite failed:', error);
      throw error;
    }
  };

  const handleBatchDelete = async (fileIds: string[]) => {
    try {
      // Delete each file
      for (const fileId of fileIds) {
        await handleFileDelete(fileId);
      }
    } catch (error) {
      console.error('Batch delete failed:', error);
      throw error;
    }
  };

  const renderFolder = (folder: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolder?.id === folder.id;
    const hasChildren = folder.children && folder.children.length > 0;
    const isDraggedOver = dragOverFolder === folder.id;
    const isDragging = draggedItem?.type === 'folder' && draggedItem?.id === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center space-x-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${
            isSelected 
              ? 'bg-blue-600 text-white' 
              : isDraggedOver
              ? 'bg-green-600 text-white'
              : isDragging
              ? 'opacity-50'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => selectFolder(folder)}
          onContextMenu={(e) => {
            console.log('📌 Inline sidebar folder right-clicked:', folder.name);
            e.preventDefault();
            e.stopPropagation();
            console.log('📍 Setting inline folder menu at:', e.clientX, e.clientY);
            setFolderMenu({ folder, x: e.clientX, y: e.clientY });
          }}
          draggable
          onDragStart={(e) => {
            console.log('🎬 Inline sidebar drag started:', folder.name);
            handleDragStart(e, folder.id, 'folder');
          }}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-slate-600 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          <Icon Icon={RiFolder3Line} size={IconSizes.small} color={IconColors.muted} className="flex-shrink-0" />
          <span className="text-sm truncate flex-1">{folder.name}</span>
          {isDraggedOver && (
            <Move className="w-3 h-3 text-green-400" />
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {folder.children.map((child: any) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleUploadComplete = () => {
    loadFiles();
  };

  // Get file type icon with color
  const getFileTypeIcon = (type: FileItem['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'document':
        return <Icon Icon={RiFile3Line} size={IconSizes.medium} color="#60a5fa" className={iconClass} />;
      case 'image':
        return <Icon Icon={Image} size={IconSizes.medium} color="#4ade80" className={iconClass} />;
      case 'video':
        return <Icon Icon={RiVideoLine} size={IconSizes.medium} color="#a855f7" className={iconClass} />;
      case 'audio':
        return <Icon Icon={Music} size={IconSizes.medium} color="#fb923c" className={iconClass} />;
      case 'archive':
        return <Icon Icon={Archive} size={IconSizes.medium} color="#eab308" className={iconClass} />;
      default:
        return <Icon Icon={File} size={IconSizes.medium} color="#94a3b8" className={iconClass} />;
    }
  };

  // Get tag color based on tag name
  const getTagColor = (tag: string, index: number) => {
    const colors = [
      'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'bg-green-500/20 text-green-300 border-green-500/30',
      'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      'bg-red-500/20 text-red-300 border-red-500/30',
      'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'bg-orange-500/20 text-orange-300 border-orange-500/30'
    ];
    
    // Use tag name to generate consistent color
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Get selected files as array
  const selectedFilesList = Array.from(selectedFiles)
    .map(id => files.find(f => f.id === id))
    .filter(Boolean) as FileItem[];

  // Render list view
  const renderFilesList = () => {
    if (viewMode === 'list') {
      return (
        <div className="bg-dark-surface border border-dark-surface rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {/* Folders Row */}
            {childFolders.length > 0 && (
              <table className="w-full">
                <tbody>
                  {childFolders.map(folder => (
                    <tr
                      key={folder.id}
                      className={`hover:bg-slate-700 transition-colors duration-200 cursor-pointer ${
                        dragOverFolder === folder.id ? 'bg-[#6049E3]/20 ring-2 ring-[#6049E3]' : ''
                      } ${
                        draggedItem?.type === 'folder' && draggedItem?.id === folder.id ? 'opacity-50' : ''
                      }`}
                      draggable
                      onDragStart={(e) => {
                        console.log('🎬 List folder drag started:', folder.name);
                        handleDragStart(e, folder.id, 'folder');
                      }}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, folder.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, folder.id)}
                      onClick={() => selectFolder(folder)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFolderMenu({ folder, x: e.clientX, y: e.clientY });
                      }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Icon Icon={RiFolder3Line} size={IconSizes.medium} color="#60a5fa" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-white font-medium" colSpan={6}>
                        {folder.name}
                        {dragOverFolder === folder.id && draggedItem && (
                          <span className="ml-2 text-[#6049E3] text-xs">
                            Drop to move here
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors duration-200"
                    >
                      {selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left w-12">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Type</span>
                  </th>
                  <th className="px-4 py-3 text-left w-48">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">File</span>
                  </th>
                  <th className="px-4 py-3 text-left flex-1">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Tags</span>
                  </th>
                  <th className="px-4 py-3 text-left w-20">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Size</span>
                  </th>
                  <th className="px-4 py-3 text-left w-24">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Modified</span>
                  </th>
                  <th className="px-4 py-3 text-left w-32">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredAndSortedFiles.map((file) => (
                  <tr
                    key={file.id}
                    className={`hover:bg-slate-700 transition-colors duration-200 ${
                      selectedFiles.has(file.id) ? 'bg-blue-600/10' : 'cursor-pointer'
                    }`}
                    onClick={(e) => {
                      // Reset drag state when clicking on a file
                      if (draggedItem?.type === 'file' && draggedItem?.id === file.id) {
                        setDraggedItem(null);
                        setDragOverFolder(null);
                      }
                      
                      if (e.ctrlKey || e.metaKey) {
                        handleSelectionChange(file.id, !selectedFiles.has(file.id));
                      } else {
                        // onFileClick?.(file);
                      }
                    }}
                    onDoubleClick={() => {
                  // Reset drag state when double-clicking to open preview
                  if (draggedItem?.type === 'file' && draggedItem?.id === file.id) {
                    setDraggedItem(null);
                    setDragOverFolder(null);
                  }
                  setShowPreviewModal(file);
                }}
                    draggable={selectedFiles.has(file.id)}
                    onDragStart={(e) => handleDragStart(e, file.id, 'file')}
                    onDragEnd={handleDragEnd}
                  >
                    {/* Selection Checkbox */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectionChange(file.id, !selectedFiles.has(file.id));
                        }}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                          selectedFiles.has(file.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-400 hover:border-blue-400'
                        }`}
                      >
                        {selectedFiles.has(file.id) && <CheckSquare className="w-3 h-3" />}
                      </button>
                    </td>

                    {/* File Type Icon */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {getFileTypeIcon(file.type)}
                      </div>
                    </td>

                    {/* Thumbnail + Name (Fixed Width) */}
                    <td className="px-4 py-3 whitespace-nowrap w-48">
                      <div className="flex items-center space-x-3">
                        {/* Small Thumbnail */}
                        <div className="w-10 h-10 rounded bg-[#262626] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {file.thumbnail ? (
                            <img
                              src={file.thumbnail}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getFileTypeIcon(file.type)
                          )}
                        </div>
                        
                        {/* File Name + Favorite */}
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          {file.isFavorite && (
                            <span className="text-yellow-400 text-xs flex-shrink-0">★</span>
                          )}
                          <span className="text-white font-medium text-sm truncate">
                            {file.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Tags (Two Rows, Maximum Visibility) */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-full">
                        {file.tags?.map((tag, index) => (
                          <span
                            key={index}
                            className={`inline-flex items-center px-2 py-0.5 text-xs rounded-md border font-medium ${getTagColor(tag, index)} mb-1 mr-1`}
                          >
                            {tag}
                          </span>
                        ))}
                        
                        {/* No Tags */}
                        {(!file.tags || file.tags.length === 0) && (
                          <span className="text-xs text-slate-500 italic">No tags</span>
                        )}
                      </div>
                    </td>

                    {/* File Size */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300 text-xs">
                      {file.size}
                    </td>

                    {/* Modified Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300 text-xs">
                      {file.modifiedDate}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {/* Preview Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPreviewModal(file);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-600 transition-colors duration-200"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Favorite Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(file.id);
                          }}
                          className={`p-1.5 rounded transition-colors duration-200 ${
                            file.isFavorite 
                              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10' 
                              : 'text-slate-400 hover:text-yellow-400 hover:bg-slate-600'
                          }`}
                          title={file.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Star className={`w-4 h-4 ${file.isFavorite ? 'fill-current' : ''}`} />
                        </button>

                        {/* Download Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Download file
                            const fileUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/files/${file.filePath}`;
                            const a = document.createElement('a');
                            a.href = fileUrl;
                            a.download = file.originalName;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }}
                          className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-600 transition-colors duration-200"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Grid view
    return (
      <>
        {/* Folders Grid */}
        {childFolders.length > 0 && (
          <div className="mb-4 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 gap-y-16 items-start overflow-visible">
            {childFolders.map(folder => (
              <div
                key={folder.id}
                className={`group bg-[#262626] border rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-[#262626]/80 transition-all duration-200 ${
                  dragOverFolder === folder.id
                    ? 'border-[#6049E3] ring-2 ring-[#6049E3]/50 bg-[#6049E3]/10'
                    : 'border-slate-600'
                } ${
                  draggedItem?.type === 'folder' && draggedItem?.id === folder.id
                    ? 'opacity-50 scale-95'
                    : ''
                }`}
                onClick={() => selectFolder(folder)}
                onContextMenu={(e) => {
                  console.log('📌 Grid folder right-clicked:', folder.name);
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('📍 Setting grid folder menu at:', e.clientX, e.clientY);
                  setFolderMenu({ folder, x: e.clientX, y: e.clientY });
                }}
                draggable={true}
                onDragStart={(e) => {
                  console.log('🎬 Grid folder drag started:', folder.name);
                  handleDragStart(e, folder.id, 'folder');
                }}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
              >
                <Icon Icon={RiFolder3Line} size={IconSizes.card} color="#60a5fa" className="mb-2" />
                <span className="text-white font-medium text-sm truncate w-full text-center">{folder.name}</span>
                {dragOverFolder === folder.id && draggedItem && (
                  <span className="text-[#6049E3] text-xs mt-1 font-medium">
                    Drop here
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Files Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 gap-y-16 items-start overflow-visible">
          {filteredAndSortedFiles.map((file) => (
            <div
              key={file.id}
              draggable
              onDragStart={(e) => handleDragStart(e, file.id, 'file')}
              onDragEnd={handleDragEnd}
              className={`transition-opacity duration-200 ${
                draggedItem?.type === 'file' && draggedItem?.id === file.id ? 'opacity-50' : ''
              }`}
            >
              <FileCard
                file={file}
                onClick={() => {
                  // Reset drag state when clicking on a file
                  if (draggedItem?.type === 'file' && draggedItem?.id === file.id) {
                    setDraggedItem(null);
                    setDragOverFolder(null);
                  }
                  handleSelectionChange(file.id, !selectedFiles.has(file.id));
                }}
                onDoubleClick={() => {
                  // Reset drag state when double-clicking to open preview
                  if (draggedItem?.type === 'file' && draggedItem?.id === file.id) {
                    setDraggedItem(null);
                    setDragOverFolder(null);
                  }
                  setShowPreviewModal(file);
                }}
                onToggleFavorite={handleToggleFavorite}
                onUpdate={handleFileUpdate}
                onMove={handleFileMove}
                onDelete={handleFileDelete}
                isSelected={selectedFiles.has(file.id)}
                onSelectionChange={handleSelectionChange}
                selectionMode={selectedFiles.size > 0}
                userRole="admin"
                className="w-full"
              />
            </div>
          ))}
        </div>
      </>
    );
  };

  const folderMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(event.target as Node)) {
        setFolderMenu(null);
      }
    };
    if (folderMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [folderMenu]);

  // Global drag end handler to reset drag state
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDraggedItem(null);
      setDragOverFolder(null);
    };

    const handleGlobalDragLeave = () => {
      // Reset drag state when leaving the window
      setDraggedItem(null);
      setDragOverFolder(null);
    };

    document.addEventListener('dragend', handleGlobalDragEnd);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
    };
  }, []);

  // Expose sidebar data to parent
  useEffect(() => {
    console.log('🔄 useEffect for onSidebarDataChange triggered');
    if (onSidebarDataChange) {
      console.log('📤 Sending sidebar data to parent:', {
        folderTreeLength: folderTree.length,
        folderTreeData: folderTree,
        currentFolder: currentFolder?.name || 'Root',
        expandedCount: expandedFolders.size,
        hasFunctions: !!(selectFolder && toggleFolder)
      });
      onSidebarDataChange({
        folderTree,
        currentFolder,
        expandedFolders,
        draggedItem,
        dragOverFolder,
        onSelectFolder: selectFolder,
        onToggleFolder: toggleFolder,
        onCreateFolder: () => {
          console.log('Create folder button clicked');
          setShowCreateFolder(true);
        },
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onDragStart: (e: React.DragEvent, folder: any) => {
          e.dataTransfer.effectAllowed = 'move';
          setDraggedItem({ id: folder.id, type: 'folder' });
        },
        onFolderContextMenu: (e: React.MouseEvent, folder: any) => {
          console.log('🎯 ProjectFolderSidebar context menu triggered for:', folder.name);
          e.preventDefault();
          e.stopPropagation();
          const x = e.clientX;
          const y = e.clientY;
          console.log('📍 Menu position:', { x, y });
          console.log('📍 Setting folderMenu state...');
          setFolderMenu({ folder, x, y });
          console.log('✅ folderMenu state set:', { folder: folder.name, x, y });
        },
      });
    } else {
      console.warn('⚠️ onSidebarDataChange callback is not provided!');
    }
  }, [folderTree, currentFolder, expandedFolders, draggedItem, dragOverFolder, onSidebarDataChange]);

  return (
    <div className={`flex-1 flex flex-col h-full ${renderSidebar ? 'gap-6 p-6' : ''}`}>
      {/* Folder Sidebar Panel - Only render if renderSidebar is true */}
      {renderSidebar && (
        <div className="w-[280px] bg-[#111235] border border-[#1A1C3A] rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.3)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden">
        <div className="p-4 border-b border-[#1A1C3A]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#CFCFF6]">Folders</h3>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="p-1.5 rounded-md text-[#8A8C8E] hover:text-[#CFCFF6] hover:bg-[#6049E3]/20 transition-colors duration-200"
              title="Create Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Project Root */}
          <div
            className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 mb-1 ${
              !currentFolder 
                ? 'bg-[#6049E3] text-white' 
                : dragOverFolder === null
                ? 'bg-green-600 text-white'
                : 'text-[#CFCFF6] hover:bg-[#1A1C3A] hover:text-white'
            }`}
            onClick={() => selectFolder(null)}
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, null)}
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Project Root</span>
            {dragOverFolder === null && draggedItem && (
              <Move className="w-3 h-3 text-green-400" />
            )}
          </div>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-0.5">
            {folderTree.map(folder => renderFolder(folder))}
          </div>
          
          {folderTree.length === 0 && (
            <div className="text-center py-8">
              <Icon Icon={RiFolder3Line} size={IconSizes.card} color="#8A8C8E" className="mx-auto mb-2" />
              <p className="text-[#8A8C8E] text-sm">No folders yet</p>
              <button
                onClick={() => setShowCreateFolder(true)}
                className="text-[#6049E3] hover:text-[#6049E3]/80 text-sm mt-1 font-medium"
              >
                Create your first folder
              </button>
            </div>
          )}
        </div>

        {/* Drag Instructions */}
        {draggedItem && (
          <div className="p-3 border-t border-[#1A1C3A] bg-[#6049E3]/10">
            <p className="text-xs text-[#CFCFF6] text-center">
              Drop on a folder or Project Root to move {draggedItem.type}
            </p>
          </div>
        )}
        </div>
      )}

      {/* Main Content Panel */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${renderSidebar ? 'bg-[#111235] border border-[#1A1C3A] rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.3)]' : ''}`}>
        {/* File Display - Only show files */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader className="w-8 h-8 text-[#6049E3] animate-spin mx-auto mb-4" />
                <p className="text-[#8A8C8E]">Loading files...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-[#CFCFF6] mb-2">Error Loading Files</h3>
                <p className="text-[#8A8C8E] mb-4">{error}</p>
                <button 
                  onClick={loadFiles}
                  className="px-6 py-2 border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white hover:border-[#6049E3] rounded-lg font-medium transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (filteredAndSortedFiles.length === 0 && childFolders.length === 0) ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Files or Folders</h3>
              <p className="text-slate-400">
                {currentFolder 
                  ? `No files or folders in "${currentFolder.name}" folder.`
                  : `No files or folders in "${project.name}" project.`
                }
              </p>
              <button
                onClick={() => setShowUploadSheet(true)}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                Upload Files
              </button>
            </div>
          ) : (
            renderFilesList()
          )}
        </div>
      </div>

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedFiles={selectedFilesList}
        onClearSelection={handleClearSelection}
        onBatchMove={handleBatchMove}
        onBatchAddTags={handleBatchAddTags}
        onBatchRemoveTags={handleBatchRemoveTags}
        onBatchToggleFavorite={handleBatchToggleFavorite}
        onBatchDelete={handleBatchDelete}
        userRole="admin" // Allow all operations in project view
      />

      {/* Modals */}
      <UploadSheet
        isOpen={showUploadSheet}
        onOpenChange={setShowUploadSheet}
        onUploadComplete={handleUploadComplete}
        projectContext={true}
        projectId={project.id}
        folderId={currentFolder?.id}
      />

      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onSubmit={createFolder}
        currentProject={project}
        currentFolder={currentFolder}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={showPreviewModal}
        isOpen={!!showPreviewModal}
        onClose={() => setShowPreviewModal(null)}
        onUpdate={handleFileUpdate}
        onToggleFavorite={handleToggleFavorite}
        userRole="admin"
        isPreviewMode={true}
      />

      {/* Folder Context Menu */}
      {folderMenu && (() => {
        console.log('🎨 Rendering context menu for:', folderMenu.folder?.name, 'at', folderMenu.x, folderMenu.y);
        return true;
      })() && (
        <div
          ref={folderMenuRef}
          className="fixed z-[100] bg-[#1A1C3A] border border-[#2A2C45] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] py-1.5 px-1 min-w-[160px]"
          style={{ left: folderMenu.x, top: folderMenu.y }}
        >
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-[#CFCFF6] hover:bg-[#22243E] hover:text-white rounded-md transition-colors duration-150 font-medium"
            onClick={() => {
              console.log('✏️ Rename clicked for:', folderMenu.folder.name);
              setShowRenameFolder({ folder: folderMenu.folder });
              setRenameFolderName(folderMenu.folder.name);
              setFolderMenu(null);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Rename
          </button>
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-[#CFCFF6] hover:bg-[#22243E] hover:text-white rounded-md transition-colors duration-150 font-medium"
            onClick={() => {
              console.log('📦 Move clicked for:', folderMenu.folder.name);
              setShowMoveFolder({ folder: folderMenu.folder });
              setFolderMenu(null);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Move
          </button>
          <button
            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#22243E] hover:text-red-300 rounded-md transition-colors duration-150 font-medium"
            onClick={() => {
              console.log('🗑️ Delete clicked for:', folderMenu.folder.name);
              setShowDeleteFolder({ folder: folderMenu.folder });
              setFolderMenu(null);
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
      {/* Rename Folder Modal */}
      {showRenameFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-surface rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-white mb-4">Rename Folder</h3>
            <input
              type="text"
              value={renameFolderName}
              onChange={e => setRenameFolderName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white mb-4"
              autoFocus
              maxLength={50}
              disabled={isRenaming}
            />
            {renameError && <p className="text-red-400 text-sm mb-2">{renameError}</p>}
            <div className="flex space-x-2">
              <button
                onClick={() => renameFolder(showRenameFolder.folder.id, renameFolderName)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
                disabled={isRenaming || !renameFolderName.trim()}
              >{isRenaming ? 'Renaming...' : 'Rename'}</button>
              <button
                onClick={() => setShowRenameFolder(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                disabled={isRenaming}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Folder Modal */}
      {showDeleteFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-surface rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-white mb-4">Delete Folder</h3>
            <p className="text-slate-400 mb-4">Are you sure you want to delete the folder <span className="text-white font-semibold">{showDeleteFolder.folder.name}</span>?</p>
            <div className="flex space-x-2">
              <button
                onClick={() => deleteFolder(showDeleteFolder.folder.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
                disabled={isDeleting}
              >{isDeleting ? 'Deleting...' : 'Delete'}</button>
              <button
                onClick={() => setShowDeleteFolder(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                disabled={isDeleting}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Folder Modal */}
      {showMoveFolder && (() => {
        const folderToMove = showMoveFolder.folder;
        
        // Recursive function to check if a folder is a child of the folder being moved
        const isChildOfMovedFolder = (folderId: string): boolean => {
          if (folderId === folderToMove.id) return true;
          const folder = folders.find(f => f.id === folderId);
          if (!folder || !folder.parent_id) return false;
          return isChildOfMovedFolder(folder.parent_id);
        };

        // Recursive function to render folder tree with selection
        const renderFolderOption = (folder: any, level: number = 0): JSX.Element | null => {
          const isDisabled = folder.id === folderToMove.id || isChildOfMovedFolder(folder.id);
          
          return (
            <div key={folder.id}>
              <button
                type="button"
                disabled={isDisabled || isMoving}
                onClick={() => {
                  setIsMoving(true);
                  moveFolder(folderToMove.id, folder.id).finally(() => {
                    setIsMoving(false);
                    setShowMoveFolder(null);
                  });
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isDisabled
                    ? 'text-[#8A8C8E] opacity-50 cursor-not-allowed'
                    : 'text-[#CFCFF6] hover:bg-[#22243E] hover:text-white'
                }`}
                style={{ paddingLeft: `${(level + 1) * 16 + 12}px` }}
              >
                <span className="flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  {folder.name}
                  {isDisabled && ' (cannot move here)'}
                </span>
              </button>
              {folder.children && folder.children.map((child: any) => renderFolderOption(child, level + 1))}
            </div>
          );
        };

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1C3A]/90 backdrop-blur-md border border-[#2A2C45]/60 rounded-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-[#CFCFF6]">Move Folder</h3>
                  <button
                    onClick={() => setShowMoveFolder(null)}
                    disabled={isMoving}
                    className="p-2 rounded-lg text-[#CFCFF6]/60 hover:text-white hover:bg-[#1A1C3A]/60 transition-colors duration-200 disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-[#CFCFF6]/70 mb-2">
                    Moving: <span className="text-[#CFCFF6] font-medium">{folderToMove.name}</span>
                  </p>
                  <p className="text-sm text-[#CFCFF6]/70 mb-4">Select destination folder:</p>
                </div>

                <div className="max-h-[400px] overflow-y-auto border border-[#2A2C45]/40 rounded-lg bg-[#1A1C3A]/40 p-2">
                  {/* Root / Project Root option */}
                  <button
                    type="button"
                    disabled={isMoving}
                    onClick={() => {
                      setIsMoving(true);
                      moveFolder(folderToMove.id, null).finally(() => {
                        setIsMoving(false);
                        setShowMoveFolder(null);
                      });
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-[#CFCFF6] hover:bg-[#22243E] hover:text-white transition-colors duration-150"
                  >
                    <span className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Project Root
                    </span>
                  </button>

                  {/* Folder tree */}
                  {folderTree.map(folder => renderFolderOption(folder, 0))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowMoveFolder(null)}
                    disabled={isMoving}
                    className="flex-1 px-4 py-2 bg-[#1A1C3A]/60 hover:bg-[#1A1C3A] text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ProjectWorkspaceView;