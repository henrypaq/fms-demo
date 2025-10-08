import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileItem } from './FileCard';
import FileCard from './FileCard';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui';
import { Button } from '../ui';
import { OptimisticFileItem } from '../../hooks/useOptimisticFileUpload';

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
        {/* File Grid - Removed duplicate checkbox, using global assets bar checkbox */}
        <div className={`grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 ${tagsVisible ? 'gap-y-16' : 'gap-y-6'} items-start pb-12`}>
          <AnimatePresence>
            {/* Render optimistic files first */}
            {optimisticFiles.map((file) => {
              const isSelected = selectedFiles.has(file.id);
              
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
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
        </div>
        
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
    </div>
  );
};

export default FileGridSimple;
