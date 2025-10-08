import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, File, CheckCircle, AlertCircle, Loader, Clock } from 'lucide-react';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useOptimisticFileUpload } from '../../hooks/useOptimisticFileUpload';
import { FileRecord } from '../../lib/supabase';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useUploads } from '../../contexts/UploadContext';
import { useSidebar } from '../ui/sidebar-shadcn';
import { Button } from '../ui/button';
import {
  Sheet,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetPortal,
} from '../ui/sheet';
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "../../lib/utils";

// Custom SheetContent that slides from right, flush with sidebar with Framer Motion
const CustomSheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & { sidebarState?: string }
>(({ className, children, sidebarState, ...props }, ref) => {
  // Calculate left position based on sidebar state
  const leftPosition = sidebarState === 'collapsed' 
    ? 'calc(var(--sidebar-width-icon) + 4px)'  // 80px + 4px = 84px
    : 'calc(var(--sidebar-width) + 4px)';      // 256px + 4px = 260px

  return (
    <SheetPrimitive.Content
      asChild
      ref={ref}
      data-sidebar-upload-sheet
      {...props}
    >
      <motion.div
        initial={{ x: '-100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '-100%', opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 40,
          duration: 0.3
        }}
        className={cn(
          "fixed top-0 bottom-0 right-0 z-[5] h-full w-[420px] bg-[#1A1C3A] backdrop-blur-md text-[#CFCFF6] border-l border-[#2A2C45]/60 shadow-xl rounded-lg",
          className
        )}
        style={{
          left: leftPosition,
          transition: 'left 0.3s ease-in-out' // Smooth transition when sidebar state changes
        }}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </motion.div>
    </SheetPrimitive.Content>
  );
});
CustomSheetContent.displayName = SheetPrimitive.Content.displayName;

interface UploadSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (uploadedFiles: any[]) => void;
  projectContext?: boolean;
  projectId?: string;
  folderId?: string;
}

interface RecentUpload extends FileRecord {
  uploadTime: string;
}

const UploadSheet: React.FC<UploadSheetProps> = ({ 
  isOpen, 
  onOpenChange,
  onUploadComplete,
  projectContext = false,
  projectId,
  folderId
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [autoTaggingEnabled, setAutoTaggingEnabled] = useState(true);
  const [recentUploads, setRecentUploads] = useState<RecentUpload[]>([]);
  const { currentWorkspace } = useWorkspace();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { addUpload } = useUploads();
  const { state: sidebarState } = useSidebar();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploads, isUploading, uploadFiles } = useFileUpload();
  const { uploadMultipleFiles } = useOptimisticFileUpload();

  // Add/remove class to body to trigger sidebar color change
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('upload-sheet-open');
    } else {
      document.body.classList.remove('upload-sheet-open');
    }
    return () => {
      document.body.classList.remove('upload-sheet-open');
    };
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(files => files.filter((_, index) => index !== indexToRemove));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setErrorMessage(null);
    try {
      if (!currentWorkspace) {
        setErrorMessage('No workspace selected. Please select a workspace before uploading.');
        return;
      }
      
      // Determine upload location
      let targetProjectId = projectId;
      let targetFolderId = folderId;
      
      // Close the sheet immediately after starting uploads
      onOpenChange(false);
      
      // Use optimistic upload system
      try {
        const success = await uploadMultipleFiles(
          selectedFiles,
          targetProjectId,
          targetFolderId,
          autoTaggingEnabled
        );
        
        if (success && onUploadComplete) {
          // The optimistic system handles UI updates automatically
          onUploadComplete([]);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
      
      // Reset form
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    const total = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    return formatFileSize(total);
  };

  const formatUploadTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const removeRecentUpload = (fileId: string) => {
    setRecentUploads(prev => prev.filter(file => file.id !== fileId));
  };

  const getUploadLocationText = () => {
    if (projectContext && projectId) {
      if (folderId) {
        const folderName = "Selected Folder";
        return `Project > ${folderName}`;
      }
      return `Project > Root`;
    } else {
      return 'Workspace';
    }
  };

  // Calculate overlay left position based on sidebar state
  const overlayLeft = sidebarState === 'collapsed'
    ? 'calc(var(--sidebar-width-icon) + 4px)'
    : 'calc(var(--sidebar-width) + 4px)';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <SheetPortal>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              style={{
                left: overlayLeft,
                transition: 'left 0.3s ease-in-out'
              }}
              onClick={() => onOpenChange(false)}
              data-sidebar-overlay-exclude
            />
          </SheetPortal>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {isOpen && (
          <CustomSheetContent 
            className="p-0 overflow-y-auto"
            sidebarState={sidebarState}
          >
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-6 pb-4 border-b border-[#1A1C3A] space-y-1">
            <SheetTitle className="text-white text-xl font-bold flex items-center justify-between">
              Upload Files
            </SheetTitle>
            <SheetDescription className="text-[#CFCFF6]/60 text-sm">
              → {getUploadLocationText()}
            </SheetDescription>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
            {/* Auto-tagging Toggle */}
            <div className="bg-[#1A1C3A]/50 border border-[#1A1C3A] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium text-sm">Auto-tagging</h3>
                  <p className="text-[#CFCFF6]/60 text-xs mt-1">Automatically generate tags for your files</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTaggingEnabled}
                    onChange={(e) => setAutoTaggingEnabled(e.target.checked)}
                    disabled={isUploading}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#1A1C3A] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#6049E3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6049E3]"></div>
                </label>
              </div>
            </div>

            {/* File Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                dragActive 
                  ? 'border-[#6049E3] bg-[#6049E3]/10' 
                  : 'border-[#1A1C3A] hover:border-[#6049E3]/50'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${
                dragActive ? 'text-[#6049E3]' : 'text-[#CFCFF6]/40'
              }`} />
              <p className="text-white font-medium mb-2">
                {dragActive ? 'Drop files here' : 'Drop files here or click to browse'}
              </p>
              <p className="text-[#CFCFF6]/60 text-xs mb-4">Support for multiple files up to 10GB each</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                variant="outline"
                className="border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white hover:border-[#6049E3] transition-all"
              >
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="*/*"
              />
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium text-sm">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <span className="text-[#CFCFF6]/60 text-xs">
                    Total: {getTotalSize()}
                  </span>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-[#1A1C3A]/50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <File className="w-4 h-4 text-[#CFCFF6]/60 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">{file.name}</p>
                          <p className="text-[#CFCFF6]/60 text-xs">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0 hover:bg-[#1A1C3A]"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {uploads.length > 0 && (
              <div>
                <h3 className="text-white font-medium mb-3 text-sm">Upload Progress</h3>
                <div className="space-y-2">
                  {uploads.map((upload) => (
                    <div key={upload.fileId} className="p-3 bg-[#1A1C3A]/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {upload.status === 'complete' ? (
                            <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                          ) : upload.status === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          ) : upload.status === 'tagging' ? (
                            <Loader className="w-4 h-4 text-[#6049E3] flex-shrink-0" />
                          ) : (
                            <Loader className="w-4 h-4 text-[#6049E3] animate-spin flex-shrink-0" />
                          )}
                          <span className="text-white text-sm font-medium truncate">
                            {upload.fileName}
                          </span>
                        </div>
                        <span className="text-[#CFCFF6]/60 text-xs flex-shrink-0">{upload.progress}%</span>
                      </div>
                      <div className="w-full bg-[#1A1C3A] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            upload.status === 'error' ? 'bg-red-500' : 
                            upload.status === 'complete' ? 'bg-green-500' : 
                            upload.status === 'tagging' ? 'bg-[#6049E3]' : 'bg-[#6049E3]'
                          }`}
                          style={{ width: `${upload.progress}%` }}
                        />
                      </div>
                      {upload.status === 'complete' && (
                        <p className="text-green-400 text-xs mt-2">
                          ✓ Upload completed {autoTaggingEnabled ? 'and tagged' : 'successfully'}
                        </p>
                      )}
                      {upload.status === 'tagging' && (
                        <p className="text-[#6049E3] text-xs mt-2">
                          Analyzing and tagging your file...
                        </p>
                      )}
                      {upload.error && (
                        <p className="text-red-400 text-xs mt-2">✗ {upload.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Uploads */}
            {recentUploads.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium text-sm">Recent Uploads ({recentUploads.length})</h3>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto border border-[#1A1C3A] rounded-lg p-3 bg-[#1A1C3A]/20">
                  {recentUploads.map((file) => (
                    <div key={file.id} className="p-3 bg-[#1A1C3A]/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <File className="w-4 h-4 text-[#CFCFF6]/60 flex-shrink-0" />
                            <h4 className="text-white font-medium text-sm truncate">{file.name}</h4>
                            <span className="text-xs text-[#CFCFF6]/40 flex-shrink-0 flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatUploadTime(file.uploadTime)}</span>
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {file.tags && file.tags.length > 0 ? (
                              file.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 bg-[#1A1C3A] text-[#CFCFF6]/80 text-xs rounded-md"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-[#CFCFF6]/40">No tags</span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => removeRecentUpload(file.id)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 text-[#CFCFF6]/60 hover:text-red-400 hover:bg-[#1A1C3A]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <SheetFooter className="p-6 pt-4 border-t border-[#1A1C3A] flex-row justify-between items-center space-x-0">
            {errorMessage && (
              <div className="text-red-400 text-sm flex-1">{errorMessage}</div>
            )}
            <div className="flex items-center space-x-2 ml-auto">
              <Button
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
                variant="ghost"
                className="text-[#CFCFF6] hover:bg-[#1A1C3A]"
              >
                Cancel
              </Button>
              {selectedFiles.length > 0 && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !currentWorkspace}
                  variant="outline"
                  className="border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white hover:border-[#6049E3] transition-all flex items-center space-x-2"
                >
                  {isUploading && <Loader className="w-4 h-4 animate-spin" />}
                  <span>
                    {isUploading 
                      ? 'Uploading...' 
                      : `Upload ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`
                    }
                  </span>
                </Button>
              )}
            </div>
          </SheetFooter>
        </div>
      </CustomSheetContent>
        )}
      </AnimatePresence>
    </Sheet>
  );
};

export default UploadSheet;

