import React, { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckSquare, Square, Image, Music, Archive, File, Download, Eye, Info, Star, Share2, Edit3, Tag, Move } from 'lucide-react';
import { RiFile3Line, RiVideoLine, RiMoreFill } from '@remixicon/react';
import { Icon, IconSizes, IconColors } from '../../ui/Icon';
import FileCard, { FileItem } from './FileCard';
import { ViewMode, SortOption, SortDirection, FilterType } from '../../types/ui';
import BatchActionBar from '../BatchActionBar';
import FileMenuDropdown from '../FileMenuDropdown';
import FilePreviewModal from '../FilePreviewModal';
import UploadPlaceholder from '../UploadPlaceholder';
import { markFilesAsUpdated } from '../../contexts/WorkspaceContext';
import { useUploads } from '../../contexts/UploadContext';
import { Card, CardContent } from '../ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui';

interface FileGridProps {
  files: FileItem[];
  onFileClick?: (file: FileItem) => void;
  onFileDoubleClick?: (file: FileItem) => void;
  onToggleFavorite?: (fileId: string) => void;
  onFileUpdate?: (fileId: string, updates: Partial<FileItem>) => void;
  onFileMove?: (fileId: string, projectId: string | null, folderId: string | null) => void;
  onFilesDragStart?: (fileIds: string[]) => void;
  onFilesDragEnd?: () => void;
  // Pagination props
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
  // Filter props
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  sortBy?: SortOption;
  onSortByChange?: (sort: SortOption) => void;
  sortDirection?: SortDirection;
  onSortDirectionChange?: (direction: SortDirection) => void;
  filterType?: FilterType;
  onFilterTypeChange?: (filter: FilterType) => void;
  showFilters?: boolean;
  // Server-side sorting
  onServerSortChange?: (sortBy: SortOption, sortDirection: SortDirection) => void;
  // Delete function
  onFileDelete?: (fileId: string) => Promise<void>;
  // User role props
  userRole?: 'admin' | 'employee';
  userProjectAccess?: string[];
  // Active view for context
  activeView?: string;
  className?: string;
}

const FileGrid: React.FC<FileGridProps> = React.memo(({ 
  files, 
  onFileClick, 
  onFileDoubleClick,
  onToggleFavorite,
  onFileUpdate,
  onFileMove,
  onFilesDragStart,
  onFilesDragEnd,
  currentPage,
  totalPages,
  totalCount,
  hasNextPage,
  hasPrevPage,
  onNextPage,
  onPrevPage,
  onGoToPage,
  viewMode = 'grid',
  onViewModeChange,
  sortBy = 'date',
  onSortByChange,
  sortDirection = 'desc',
  onSortDirectionChange,
  filterType = 'all',
  onFilterTypeChange,
  showFilters = true,
  onServerSortChange,
  onFileDelete,
  userRole = 'admin',
  userProjectAccess = [],
  activeView = 'dashboard',
  className = '' 
}) => {
  // Get uploads from context
  const { uploads, cancelUpload } = useUploads();
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<FileItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<FileItem | null>(null);

  // Apply client-side filters for view-specific filtering (favorites, recent, etc.)
  const filteredFiles = React.useMemo(() => {
    let result = [...files];

    // Apply type filter - this works like the search feature
    switch (filterType) {
      case 'favorites':
        result = files.filter(file => file.isFavorite);
        break;
      case 'recent':
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        result = files.filter(file => {
          const fileDate = new Date(file.modifiedDate);
          return fileDate > sevenDaysAgo;
        });
        break;
      case 'documents':
        result = files.filter(file => file.type === 'document');
        break;
      case 'images':
        result = files.filter(file => file.type === 'image');
        break;
      case 'videos':
        result = files.filter(file => file.type === 'video');
        break;
      case 'audio':
        result = files.filter(file => file.type === 'audio');
        break;
      case 'archives':
        result = files.filter(file => file.type === 'archive');
        break;
      case 'all':
      default:
        // No additional filtering - server already sorted
        break;
    }

    return result;
  }, [files, filterType]);

  const handleSelectionChange = useCallback((fileId: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSelection = new Set(prev);
      if (selected) {
        newSelection.add(fileId);
      } else {
        newSelection.delete(fileId);
      }
      return newSelection;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedFiles.size === filteredFiles.length && filteredFiles.length > 0) {
      // Deselect all
      setSelectedFiles(new Set());
    } else {
      // Select all visible files
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  }, [filteredFiles, selectedFiles.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // Handle drag start for selected files
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (selectedFiles.size === 0) return;
    
    const fileIds = Array.from(selectedFiles);
    
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `files:${JSON.stringify(fileIds)}`);
    
    // Call the drag start handler if provided
    onFilesDragStart?.(fileIds);
  }, [selectedFiles, onFilesDragStart]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onFilesDragEnd?.();
  }, [onFilesDragEnd]);

  const handleBatchToggleFavorite = useCallback(async (fileIds: string[]) => {
    if (!onToggleFavorite) return;

    // Toggle favorite for each file
    const errors: string[] = [];
    for (const fileId of fileIds) {
      try {
        await onToggleFavorite(fileId);
      } catch (error) {
        errors.push(fileId);
        console.error(`Failed to toggle favorite for file ${fileId}:`, error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to update favorites for ${errors.length} file(s)`);
    }

    // Mark files as updated for smart refresh
    markFilesAsUpdated();
  }, [onToggleFavorite]);

  const handleBatchMove = useCallback(async (fileIds: string[], projectId: string | null, folderId: string | null) => {
    if (!onFileMove) return;


    // Move files one by one for proper error handling
    const errors: string[] = [];
    for (const fileId of fileIds) {
      try {
        await onFileMove(fileId, projectId, folderId);
      } catch (error) {
        errors.push(fileId);
        console.error(`Failed to move file ${fileId}:`, error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to move ${errors.length} file(s)`);
    }

    // Mark files as updated for smart refresh
    markFilesAsUpdated();
  }, [onFileMove]);

  const handleBatchDelete = useCallback(async (fileIds: string[]) => {
    if (!onFileDelete || userRole !== 'admin') return;

    // Delete files one by one for proper error handling
    const errors: string[] = [];
    for (const fileId of fileIds) {
      try {
        await onFileDelete(fileId);
      } catch (error) {
        errors.push(fileId);
        console.error(`Failed to delete file ${fileId}:`, error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to delete ${errors.length} file(s)`);
    }

    // Mark files as updated for smart refresh
    markFilesAsUpdated();
  }, [onFileDelete, userRole]);

  const handleBatchAddTags = useCallback(async (fileIds: string[], tagsToAdd: string[]) => {
    if (!onFileUpdate || userRole !== 'admin') return;

    const errors: string[] = [];
    for (const fileId of fileIds) {
      try {
        const file = filteredFiles.find(f => f.id === fileId);
        if (file) {
          const currentTags = file.tags || [];
          const newTags = [...new Set([...currentTags, ...tagsToAdd])]; // Merge and deduplicate
          await onFileUpdate(fileId, { tags: newTags });
        }
      } catch (error) {
        errors.push(fileId);
        console.error(`Failed to add tags to file ${fileId}:`, error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to add tags to ${errors.length} file(s)`);
    }

    // Mark files as updated for smart refresh
    markFilesAsUpdated();
  }, [filteredFiles, onFileUpdate, userRole]);

  const handleBatchRemoveTags = useCallback(async (fileIds: string[], tagsToRemove: string[]) => {
    if (!onFileUpdate || userRole !== 'admin') return;

    const errors: string[] = [];
    for (const fileId of fileIds) {
      try {
        const file = filteredFiles.find(f => f.id === fileId);
        if (file) {
          const currentTags = file.tags || [];
          const newTags = currentTags.filter(tag => !tagsToRemove.includes(tag));
          await onFileUpdate(fileId, { tags: newTags });
        }
      } catch (error) {
        errors.push(fileId);
        console.error(`Failed to remove tags from file ${fileId}:`, error);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Failed to remove tags from ${errors.length} file(s)`);
    }

    // Mark files as updated for smart refresh
    markFilesAsUpdated();
  }, [filteredFiles, onFileUpdate, userRole]);

  // Handle file deletion
  const handleFileDelete = useCallback(async (fileId: string) => {
    if (onFileDelete) {
      try {
        await onFileDelete(fileId);
      } catch (error) {
        console.error('FileGrid: Delete failed:', error);
        throw error;
      }
    } else {
      console.error('FileGrid: onFileDelete not provided');
    }
  }, [onFileDelete]);

  // Get file type icon with color
  const getFileTypeIcon = (type: FileItem['type']) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'document':
        return <Icon Icon={RiFile3Line} size={IconSizes.medium} color={IconColors.accent} className={iconClass} />;
      case 'image':
        return <Icon Icon={Image} size={IconSizes.medium} color="#10b981" className={iconClass} />;
      case 'video':
        return <Icon Icon={RiVideoLine} size={IconSizes.medium} color="#8b5cf6" className={iconClass} />;
      case 'audio':
        return <Icon Icon={Music} size={IconSizes.medium} color="#f59e0b" className={iconClass} />;
      case 'archive':
        return <Icon Icon={Archive} size={IconSizes.medium} color="#eab308" className={iconClass} />;
      default:
        return <Icon Icon={File} size={IconSizes.medium} color={IconColors.muted} className={iconClass} />;
    }
  };

  // Get tag color based on tag name
  const getTagColor = (tag: string, index: number) => {
    const colors = [
      'bg-primary/20 text-primary border-primary/30',
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

  // Handle row menu actions
  const handleRowMenuClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setActiveRowMenu(activeRowMenu === fileId ? null : fileId);
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
    setActiveRowMenu(null);
  };

  const handleShare = async (file: FileItem) => {
    try {
      const shareUrl = `${window.location.origin}/share/${file.id}`;
      await navigator.clipboard.writeText(shareUrl);
      // You could show a toast notification here
    } catch (error) {
      console.error('Share error:', error);
    }
    setActiveRowMenu(null);
  };

  const handleShowPreview = (file: FileItem) => {
    setShowPreviewModal(file);
    setActiveRowMenu(null);
  };

  const handleShowDetails = (file: FileItem) => {
    setShowDetailsModal(file);
    setActiveRowMenu(null);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 7; // Increased for better navigation
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(
        <button
          key={1}
          onClick={() => onGoToPage(1)}
          className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200"
        >
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="px-2 text-slate-500">...</span>
        );
      }
    }

    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onGoToPage(i)}
          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
            i === currentPage
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          {i}
        </button>
      );
    }

    // Add last page and ellipsis if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="ellipsis2" className="px-2 text-slate-500">...</span>
        );
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => onGoToPage(totalPages)}
          className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors duration-200"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  const renderFilesList = () => {
    if (viewMode === 'list') {
    return (
      <div className="p-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors duration-200"
                    >
                      {selectedFiles.size === filteredFiles.length && filteredFiles.length > 0 ? (
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
                {filteredFiles.map((file) => {
                  // Check if employee has access to this file's project
                  const hasAccess = userRole === 'admin' || 
                    !file.projectId || 
                    userProjectAccess.includes(file.projectId);
                  
                  return (
                    <tr
                      key={file.id}
                      className={`hover:bg-slate-700 transition-colors duration-200 ${
                        !hasAccess 
                          ? 'opacity-50 cursor-not-allowed' 
                          : selectedFiles.has(file.id) 
                          ? 'bg-blue-600/10' 
                          : 'cursor-pointer'
                      }`}
                      onClick={hasAccess ? (e) => {
                        if (e.ctrlKey || e.metaKey) {
                          handleSelectionChange(file.id, !selectedFiles.has(file.id));
                        } else {
                          onFileClick?.(file);
                        }
                      }
                      : undefined}
                      onDoubleClick={hasAccess ? () => handleShowPreview(file) : undefined}
                      draggable={hasAccess && selectedFiles.has(file.id)}
                      onDragStart={hasAccess && selectedFiles.has(file.id) ? handleDragStart : undefined}
                      onDragEnd={hasAccess && selectedFiles.has(file.id) ? handleDragEnd : undefined}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasAccess) {
                              handleSelectionChange(file.id, !selectedFiles.has(file.id));
                            }
                          }}
                          disabled={!hasAccess}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                            !hasAccess
                              ? 'border-slate-600 opacity-50 cursor-not-allowed'
                              : selectedFiles.has(file.id)
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
                          <div className="w-10 h-10 rounded bg-slate-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                              handleShowPreview(file);
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
                              if (onToggleFavorite) {
                                onToggleFavorite(file.id);
                              }
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
                              handleDownload(file);
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-600 transition-colors duration-200"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
    }

    // Create a combined list of uploads and files for seamless transition
    const combinedItems = React.useMemo(() => {
      const items: Array<{ type: 'upload' | 'file'; data: any; id: string }> = [];
      
      // Add upload placeholders first (they should appear at the top)
      uploads.forEach(upload => {
        items.push({
          type: 'upload',
          data: upload,
          id: upload.id
        });
      });
      
      // Add regular files (they will appear after placeholders)
      filteredFiles.forEach(file => {
        items.push({
          type: 'file',
          data: file,
          id: file.id
        });
      });
      
      return items;
    }, [uploads, filteredFiles]);

    // Responsive grid view with shadcn/ui Cards
    return (
      <div className="py-6 overflow-visible">
        <div 
          className={`grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 gap-y-16 items-start overflow-visible ${
            isDragging ? 'opacity-75' : ''
          }`}
          draggable={selectedFiles.size > 0}
          onDragStart={selectedFiles.size > 0 ? handleDragStart : undefined}
          onDragEnd={selectedFiles.size > 0 ? handleDragEnd : undefined}
        >
          {/* Combined items for seamless transition */}
          {combinedItems.map((item) => {
            if (item.type === 'upload') {
              return (
                <Card key={item.id} className="rounded-xl bg-card/80 border border-border/50 transition-transform hover:scale-[1.01] hover:shadow-md">
                  <CardContent className="p-4">
                    <UploadPlaceholder
                      id={item.data.id}
                      name={item.data.name}
                      progress={item.data.progress}
                      status={item.data.status}
                      onCancel={cancelUpload}
                      className="transition-all duration-500"
                    />
                  </CardContent>
                </Card>
              );
            } else {
              const file = item.data;
              const hasAccess = userRole === 'admin' || file.projectAccess.some(pa => userProjectAccess.includes(pa));
              
              // Get file type icon
              const getFileIcon = (fileType: string) => {
                const type = fileType.toLowerCase();
                if (type.includes('image')) return <Icon Icon={Image} size={IconSizes.card} color="#3b82f6" className="w-8 h-8" />;
                if (type.includes('video')) return <Icon Icon={RiVideoLine} size={IconSizes.card} color="#8b5cf6" className="w-8 h-8" />;
                if (type.includes('audio')) return <Icon Icon={Music} size={IconSizes.card} color="#10b981" className="w-8 h-8" />;
                if (type.includes('pdf') || type.includes('document')) return <Icon Icon={RiFile3Line} size={IconSizes.card} color="#ef4444" className="w-8 h-8" />;
                if (type.includes('zip') || type.includes('archive')) return <Icon Icon={Archive} size={IconSizes.card} color="#eab308" className="w-8 h-8" />;
                return <Icon Icon={File} size={IconSizes.card} color="#6b7280" className="w-8 h-8" />;
              };

              return (
                <Card 
                  key={item.id} 
                  className={`rounded-xl bg-card/80 border border-border/50 transition-transform hover:scale-[1.01] hover:shadow-md cursor-pointer ${
                    selectedFiles.has(item.id) ? 'ring-2 ring-primary' : ''
                  } ${!hasAccess ? 'opacity-50' : ''}`}
                  onClick={hasAccess ? () => onFileClick?.(file) : undefined}
                  onDoubleClick={hasAccess ? () => onFileDoubleClick?.(file) : undefined}
                >
                  <CardContent className="p-4 relative">
                    {/* Selection checkbox */}
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(item.id)}
                        onChange={() => handleSelectionChange(item.id, !selectedFiles.has(item.id))}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        disabled={!hasAccess}
                      />
                    </div>

                    {/* Overflow menu */}
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="p-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={e => e.stopPropagation()}
                            disabled={!hasAccess}
                          >
                            <Icon Icon={RiMoreFill} size={IconSizes.small} color={IconColors.muted} className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onFileClick?.(file)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleFavorite?.(file.id)}>
                            <Star className="w-4 h-4 mr-2" />
                            {file.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onFileUpdate?.(file.id, { tags: [...(file.tags || []), 'new-tag'] })}>
                            <Tag className="w-4 h-4 mr-2" />
                            Add Tag
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onFileMove?.(file.id, null, null)}>
                            <Move className="w-4 h-4 mr-2" />
                            Move
                          </DropdownMenuItem>
                          {userRole === 'admin' && (
                            <DropdownMenuItem 
                              onClick={() => onFileDelete?.(file.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* File thumbnail/icon */}
                    <div className="flex items-center justify-center h-32 mb-4">
                      {getFileIcon(file.type)}
                    </div>

                    {/* File info */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm text-foreground truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {file.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.modifiedDate).toLocaleDateString()}
                      </p>
                      
                      {/* Tags */}
                      {file.tags && file.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {file.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {file.tags.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                              +{file.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })}
        </div>
      </div>
    );
  };

  const selectedFilesList = Array.from(selectedFiles).map(id => filteredFiles.find(f => f.id === id)).filter(Boolean) as FileItem[];

  // Close row menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveRowMenu(null);
    };

    if (activeRowMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeRowMenu]);

  const getViewDisplayName = (view: string) => {
    switch (view) {
      case 'favorites':
        return 'Favorites';
      case 'recent':
        return 'Recent Files';
      case 'all-files':
        return 'All Files';
      case 'dashboard':
        return 'Dashboard';
      default:
        return 'Current View';
    }
  };

  return (
    <div className={`h-full bg-background ${className}`}>
      {/* Files Display */}
      <div className="h-full overflow-auto bg-background">
        {filteredFiles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6 max-w-md p-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <span className="text-muted-foreground text-2xl">📁</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">No files found</h3>
                <p className="text-sm text-muted-foreground">
                  {filterType !== 'all' 
                    ? `No files match the current filter: ${filterType}`
                    : activeView && activeView !== 'dashboard'
                    ? `No files found in ${getViewDisplayName(activeView)}`
                    : 'Start by uploading your first file or creating a folder.'
                  }
                </p>
              </div>
              {filterType !== 'all' && onFilterTypeChange && (
                <div className="flex items-center justify-center">
                  <button 
                    onClick={() => onFilterTypeChange('all')}
                    className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors duration-200"
                  >
                    Show All Files
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          renderFilesList()
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border bg-background">
          {/* Page Info */}
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * 50) + 1} to {Math.min(currentPage * 50, totalCount)} of {totalCount} files
            {activeView && activeView !== 'dashboard' && ` in ${getViewDisplayName(activeView)}`}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevPage}
              disabled={!hasPrevPage}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:text-muted-foreground/50 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-md transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-1">
              {renderPageNumbers()}
            </div>

            <button
              onClick={onNextPage}
              disabled={!hasNextPage}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:text-muted-foreground/50 disabled:hover:bg-transparent disabled:cursor-not-allowed rounded-md transition-colors duration-200"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* Batch Action Bar */}
      <BatchActionBar
        selectedFiles={selectedFilesList}
        onClearSelection={handleClearSelection}
        onBatchMove={handleBatchMove}
        onBatchAddTags={handleBatchAddTags}
        onBatchRemoveTags={handleBatchRemoveTags}
        onBatchToggleFavorite={handleBatchToggleFavorite}
        onBatchDelete={handleBatchDelete}
        userRole={userRole}
        userProjectAccess={userProjectAccess}
      />

      {/* File Details Modal */}
      <FilePreviewModal
        file={showDetailsModal}
        isOpen={!!showDetailsModal}
        onClose={() => setShowDetailsModal(null)}
        onUpdate={onFileUpdate}
        onToggleFavorite={onToggleFavorite}
        userRole={userRole}
      />

      {/* File Preview Modal */}
      {showPreviewModal && (
        <FilePreviewModal
          file={showPreviewModal}
          isOpen={!!showPreviewModal}
          onClose={() => setShowPreviewModal(null)}
          onUpdate={onFileUpdate}
          onToggleFavorite={onToggleFavorite}
          userRole={userRole}
          isPreviewMode={true}
        />
      )}
    </div>
  );
});

export default FileGrid;