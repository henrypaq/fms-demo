import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from './FileCard';
import FileCard from './FileCard';
import { ChevronLeft, ChevronRight, ChevronDown, Eye, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui';
import { Button } from '../ui';
import { OptimisticFileItem } from '../../hooks/useOptimisticFileUpload';
import BatchActionBar from '../BatchActionBar';

interface FileGridSimpleProps {
  files: FileItem[];
  optimisticFiles?: OptimisticFileItem[];
  onFileClick?: (file: FileItem) => void;
  onFileDoubleClick?: (file: FileItem) => void;
  onToggleFavorite?: (fileId: string) => void;
  onFileUpdate?: (fileId: string, updates: Partial<FileItem>) => void;
  onFileMove?: (fileId: string, projectId: string | null, folderId: string | null) => void;
  onFileDelete?: (fileId: string) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNextPage: () => void;
  onPrevPage: () => void;
  onGoToPage: (page: number) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  sortBy?: 'name' | 'date' | 'size' | 'type';
  onSortByChange?: (sortBy: 'name' | 'date' | 'size' | 'type') => void;
  sortDirection?: 'asc' | 'desc';
  onSortDirectionChange?: (sortDirection: 'asc' | 'desc') => void;
  filterType?: 'all' | 'favorites' | 'recent' | 'images' | 'documents' | 'videos' | 'audio' | 'archives';
  onFilterTypeChange?: (filterType: 'all' | 'favorites' | 'recent' | 'images' | 'documents' | 'videos' | 'audio' | 'archives') => void;
  showFilters?: boolean;
  onServerSortChange?: (sortBy: 'name' | 'date' | 'size' | 'type', sortDirection: 'asc' | 'desc') => void;
  userRole?: 'admin' | 'employee';
  userProjectAccess?: string[];
  activeView?: string;
  className?: string;
  isCollapsed?: boolean;
  tagsVisible?: boolean;
  loading?: boolean;
  selectedFileIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

const FileGridSimple: React.FC<FileGridSimpleProps> = ({ 
  files, 
  optimisticFiles = [],
  onFileClick, 
  onFileDoubleClick,
  onToggleFavorite,
  onFileUpdate,
  onFileMove,
  onFileDelete,
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
  userRole = 'admin',
  userProjectAccess = [],
  activeView = 'dashboard',
  className = '',
  isCollapsed = false,
  tagsVisible = true,
  loading = false,
  selectedFileIds,
  onSelectionChange
}) => {
  // Selection state management - use external state if provided, otherwise internal
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<Set<string>>(new Set());
  const selectedFiles = selectedFileIds ?? internalSelectedFiles;

  // Handle file selection
  const handleFileSelect = (fileId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const newSelection = new Set(selectedFiles);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }
    
    if (onSelectionChange) {
      onSelectionChange(newSelection);
    } else {
      setInternalSelectedFiles(newSelection);
    }
  };


  return (
    <div className={`h-full overflow-visible ${className}`}>
      <div 
        className="pt-2 transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isCollapsed ? '0px' : '100000px',
          opacity: isCollapsed ? 0 : 1,
          overflow: isCollapsed ? 'hidden' : 'visible'
        }}
      >
        {/* List View */}
        {viewMode === 'list' ? (
          <div className="bg-[hsl(240,30%,8%)] border border-[hsl(240,25%,15%)] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[hsl(240,30%,12%)]">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <span className="text-xs font-medium text-[#CFCFF6]/70 uppercase tracking-wider">Select</span>
                    </th>
                    <th className="px-4 py-3 text-left w-12">
                      <span className="text-xs font-medium text-[#CFCFF6]/70 uppercase tracking-wider">Type</span>
                    </th>
                    <th className="px-4 py-3 text-left min-w-[200px]">
                      <span className="text-xs font-medium text-[#CFCFF6]/70 uppercase tracking-wider">File</span>
                    </th>
                    <th className="px-4 py-3 text-left flex-1">
                      <span className="text-xs font-medium text-[#CFCFF6]/70 uppercase tracking-wider">Tags</span>
                    </th>
                    <th className="px-4 py-3 text-left w-20">
                      <span className="text-xs font-medium text-[#CFCFF6]/70 uppercase tracking-wider">Size</span>
                    </th>
                    <th className="px-4 py-3 text-left w-24">
                      <span className="text-xs font-medium text-[#CFCFF6]/70 uppercase tracking-wider">Modified</span>
                    </th>
                    <th className="px-4 py-3 text-left w-32">
                      <span className="text-xs font-medium text-[#CFCFF6]/70 uppercase tracking-wider">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(240,25%,15%)]">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      className={`hover:bg-[hsl(240,30%,12%)] transition-colors duration-200 ${
                        selectedFiles.has(file.id) ? 'bg-[#6049E3]/10' : 'cursor-pointer'
                      }`}
                      onClick={() => onFileClick?.(file)}
                      onDoubleClick={() => onFileDoubleClick?.(file)}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSelection = new Set(selectedFiles);
                            if (e.target.checked) {
                              newSelection.add(file.id);
                            } else {
                              newSelection.delete(file.id);
                            }
                            if (onSelectionChange) {
                              onSelectionChange(newSelection);
                            } else {
                              setInternalSelectedFiles(newSelection);
                            }
                          }}
                          className="w-4 h-4 rounded border-2 border-[#6049E3]/50 bg-[hsl(240,30%,5%)] checked:bg-[#6049E3] checked:border-[#6049E3] cursor-pointer"
                        />
                      </td>

                      {/* File Type Icon */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center text-[#8A8C8E]">
                          {file.type === 'image' ? '🖼️' : 
                           file.type === 'video' ? '🎥' :
                           file.type === 'audio' ? '🎵' :
                           file.type === 'document' ? '📄' :
                           file.type === 'archive' ? '📦' : '📁'}
                        </div>
                      </td>

                      {/* Thumbnail + Name */}
                      <td className="px-4 py-3 whitespace-nowrap min-w-[200px]">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded bg-[hsl(240,30%,12%)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {file.thumbnail ? (
                              <img
                                src={file.thumbnail}
                                alt={file.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[#8A8C8E]">
                                {file.type === 'image' ? '🖼️' : 
                                 file.type === 'video' ? '🎥' :
                                 file.type === 'audio' ? '🎵' :
                                 file.type === 'document' ? '📄' : '📁'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            {file.isFavorite && <span className="text-yellow-400 text-xs flex-shrink-0">★</span>}
                            <span className="text-[#CFCFF6] font-medium text-sm truncate">{file.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Tags */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-full">
                          {file.tags && file.tags.length > 0 ? (
                            file.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-[#6049E3]/20 text-[#CFCFF6] border border-[#6049E3]/30"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[#8A8C8E] italic">No tags</span>
                          )}
                        </div>
                      </td>

                      {/* File Size */}
                      <td className="px-4 py-3 whitespace-nowrap text-[#8A8C8E] text-xs">
                        {file.size}
                      </td>

                      {/* Modified Date */}
                      <td className="px-4 py-3 whitespace-nowrap text-[#8A8C8E] text-xs">
                        {file.modifiedDate}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onFileDoubleClick?.(file);
                            }}
                            className="p-1.5 rounded text-[#8A8C8E] hover:text-[#CFCFF6] hover:bg-[hsl(240,30%,12%)] transition-colors duration-200"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite?.(file.id);
                            }}
                            className={`p-1.5 rounded transition-colors duration-200 ${
                              file.isFavorite 
                                ? 'text-yellow-400 hover:text-yellow-300' 
                                : 'text-[#8A8C8E] hover:text-yellow-400'
                            }`}
                            title={file.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={`w-4 h-4 ${file.isFavorite ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {files.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-[hsl(240,30%,12%)] rounded-full flex items-center justify-center mx-auto">
                    <span className="text-[#8A8C8E] text-2xl">📁</span>
                  </div>
                  <h3 className="text-lg font-semibold text-[#CFCFF6]">No files found</h3>
                  <p className="text-sm text-[#8A8C8E]">Start by uploading your first file.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Grid View */
          <div className={`grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 ${tagsVisible ? 'gap-y-16' : 'gap-y-6'} items-start pb-12`}>
          <AnimatePresence>
            {/* Render optimistic files first */}
            {optimisticFiles.map((file) => {
              const isSelected = selectedFiles.has(file.id);
              
              return (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ 
                    layout: { duration: 0.3, ease: "easeOut" },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 }
                  }}
                  className="relative group"
                >
                  <FileCard
                    file={file}
                    onClick={onFileClick}
                    onDoubleClick={onFileDoubleClick}
                    onDelete={onFileDelete}
                    onToggleFavorite={onToggleFavorite}
                    onUpdate={onFileUpdate}
                    onMove={onFileMove}
                    isSelected={isSelected}
                    onSelectionChange={(fileId, selected) => {
                      const newSelection = new Set(selectedFiles);
                        if (selected) {
                          newSelection.add(fileId);
                        } else {
                          newSelection.delete(fileId);
                        }
                      if (onSelectionChange) {
                        onSelectionChange(newSelection);
                      } else {
                        setInternalSelectedFiles(newSelection);
                      }
                    }}
                    selectionMode={selectedFiles.size > 0}
                    userRole={userRole}
                    userProjectAccess={userProjectAccess}
                    tagsVisible={tagsVisible}
                  />
                </motion.div>
              );
            })}

            {/* Render regular files */}
            {files.map((file) => {
            const isSelected = selectedFiles.has(file.id);
            
            return (
              <motion.div 
                key={file.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ 
                  layout: { duration: 0.3, ease: "easeOut" },
                  opacity: { duration: 0.15 },
                  scale: { duration: 0.15 }
                }}
                className="relative group"
              >
                  <FileCard
                    file={file}
                    onClick={onFileClick}
                    onDoubleClick={onFileDoubleClick}
                    onDelete={onFileDelete}
                    onToggleFavorite={onToggleFavorite}
                    onUpdate={onFileUpdate}
                    onMove={onFileMove}
                    isSelected={isSelected}
                    onSelectionChange={(fileId, selected) => {
                      const newSelection = new Set(selectedFiles);
                        if (selected) {
                          newSelection.add(fileId);
                        } else {
                          newSelection.delete(fileId);
                        }
                      if (onSelectionChange) {
                        onSelectionChange(newSelection);
                      } else {
                        setInternalSelectedFiles(newSelection);
                      }
                    }}
                    selectionMode={selectedFiles.size > 0}
                    userRole={userRole}
                    userProjectAccess={userProjectAccess}
                    tagsVisible={tagsVisible}
                />
              </motion.div>
            );
          })}
          </AnimatePresence>
        
        {files.length === 0 && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <span className="text-muted-foreground text-2xl">📁</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">No files found</h3>
              <p className="text-sm text-muted-foreground">Start by uploading your first file.</p>
            </div>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Batch Action Bar - appears when files are selected */}
      {selectedFiles.size > 0 && (
        <BatchActionBar
          selectedFiles={files.filter(f => selectedFiles.has(f.id))}
          onClearSelection={() => {
            if (onSelectionChange) {
              onSelectionChange(new Set());
            } else {
              setInternalSelectedFiles(new Set());
            }
          }}
          onBatchMove={async (fileIds, projectId, folderId) => {
            // Move each file
            if (onFileMove) {
              for (const fileId of fileIds) {
                await onFileMove(fileId, projectId, folderId);
              }
            }
          }}
          onBatchDelete={async (fileIds) => {
            // Delete each file
            if (onFileDelete) {
              for (const fileId of fileIds) {
                await onFileDelete(fileId);
              }
            }
          }}
          userRole={userRole}
          userProjectAccess={userProjectAccess}
        />
      )}
    </div>
  );
};

export default FileGridSimple;
