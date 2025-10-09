import React, { useRef, useState } from 'react';
import { X, Upload, File, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useFileUpload } from '@/hooks/useFileUpload';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
  projectId?: string;
  folderId?: string;
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete, projectId, folderId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { uploadFiles, isUploading } = useFileUpload();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!currentWorkspace || selectedFiles.length === 0) return;

    try {
      // uploadFiles signature: (files, manualTags, autoTaggingEnabled, projectId, folderId)
      // Always enable auto-tagging (3rd parameter = true)
      console.log('📤 [UploadModal] Uploading to:', { projectId, folderId });
      await uploadFiles(selectedFiles, [], true, projectId || undefined, folderId || undefined);
      setSelectedFiles([]);
      
      // Call completion callback to refresh file list
      if (onUploadComplete) {
        console.log('📢 [UploadModal] Calling onUploadComplete callback');
        onUploadComplete();
      }
      
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFiles([]);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-[#080A15]/90 backdrop-blur-md border border-[#2A2C45]/60 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
          >
        <div className="p-6 border-b border-[#2A2C45]/40">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#CFCFF6]">Upload Files</h3>
            <Button 
              onClick={handleClose} 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
              ${dragActive 
                ? 'border-[#6049E3] bg-[#6049E3]/10' 
                : 'border-slate-600 hover:border-slate-500 bg-slate-700/30'
              }
              ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${
              dragActive ? 'text-[#6049E3]' : 'text-[#CFCFF6]/60'
            }`} />
            <p className="text-[#CFCFF6] font-medium mb-2">
              {dragActive ? 'Drop files here' : 'Drop files here or click to browse'}
            </p>
            <p className="text-[#CFCFF6]/50 text-xs">
              Support for multiple files up to 10GB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-[#CFCFF6]/70 mb-3">
                Selected Files ({selectedFiles.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[#080A15]/40 rounded-lg border border-[#2A2C45]/40"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-[#6049E3] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#CFCFF6] truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-[#CFCFF6]/60">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    {!isUploading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="ml-3 p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#2A2C45]/40 flex justify-between items-center">
          <p className="text-sm text-[#CFCFF6]/60">
            {selectedFiles.length > 0 
              ? `${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''} selected`
              : 'No files selected'
            }
          </p>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 bg-[#080A15]/60 hover:bg-[#080A15] text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
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
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UploadModal;
