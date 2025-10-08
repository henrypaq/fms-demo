import React from 'react';
import { 
  X, 
  MoreHorizontal, 
  Play, 
  Pause, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { RiFolder3Line } from '@remixicon/react';
import { Icon, IconSizes, IconColors } from '../ui/Icon';
import { useUploads, UploadItem } from '../../contexts/UploadContext';
import { Button } from '../ui';

interface UploadsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadsPanel: React.FC<UploadsPanelProps> = ({ isOpen, onClose }) => {
  const { uploads, pauseUpload, resumeUpload, cancelUpload, removeUpload, clearCompletedUploads } = useUploads();

  // Debug logging

  const activeUploads = uploads.filter(upload => upload.status === 'uploading' || upload.status === 'paused');
  const completedUploads = uploads.filter(upload => upload.status === 'completed');
  const allUploads = [...activeUploads, ...completedUploads].sort((a, b) => {
    // Sort by status (uploading first, then completed) and then by time
    if (a.status === 'uploading' && b.status === 'completed') return -1;
    if (a.status === 'completed' && b.status === 'uploading') return 1;
    return 0;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    
    // Format with appropriate decimal places
    if (size < 10) {
      return size.toFixed(1) + ' ' + sizes[i];
    } else {
      return Math.round(size) + ' ' + sizes[i];
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Play className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />;
      default:
        return <Play className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusText = (upload: UploadItem) => {
    switch (upload.status) {
      case 'uploading':
        return `↑ Uploading ${formatBytes(upload.uploadedBytes)} of ${formatBytes(upload.totalBytes)} ${upload.timeRemaining}`;
      case 'completed':
        return `Uploaded · ${upload.completedAt || 'Just now'}`;
      case 'failed':
        return 'Upload failed';
      case 'paused':
        return 'Upload paused';
      default:
        return '';
    }
  };

  const handlePauseResume = (uploadId: string) => {
    const upload = uploads.find(u => u.id === uploadId);
    if (upload) {
      if (upload.status === 'uploading') {
        pauseUpload(uploadId);
      } else if (upload.status === 'paused') {
        resumeUpload(uploadId);
      }
    }
  };

  const handleCancel = (uploadId: string) => {
    cancelUpload(uploadId);
  };

  const handleClearAll = () => {
    clearCompletedUploads();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Sliding Panel - matches sidebar positioning */}
      <div className={`fixed top-4 left-64 h-[calc(100vh-2rem)] w-96 bg-dark-surface shadow-2xl transform transition-all duration-500 ease-out z-50 rounded-2xl ${
        isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-bg">
          <h1 className="text-lg font-bold text-light-text">Uploads</h1>
          <div className="flex items-center space-x-3">
            {completedUploads.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-xs text-light-text/70 hover:text-light-text transition-colors duration-200"
              >
                Clear All
              </button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            <Button 
              onClick={onClose}
              variant="ghost" 
              size="icon"
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-full">
          <div className={`p-4 transition-all duration-700 ease-out delay-100 ${
            isOpen ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
          }`}>
            {/* All Uploads Section */}
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-light-text mb-3">Uploads</h2>
              
              {allUploads.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-[#262626] rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon Icon={RiFolder3Line} size={IconSizes.medium} color="#94a3b8" className="w-6 h-6" />
                  </div>
                  <p className="text-light-text/70 text-sm">No uploads yet</p>
                  <p className="text-light-text/50 text-xs mt-1">Upload files to see them here</p>
                </div>
              ) : (
                allUploads.map((upload) => (
                  <div key={upload.id} className="bg-dark-bg rounded-lg p-3 mb-3 border border-dark-surface">
                    <div className="flex items-start space-x-3">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0">
                        {upload.thumbnail ? (
                          <img 
                            src={upload.thumbnail} 
                            alt={upload.name}
                            className="w-10 h-10 rounded-lg object-cover bg-dark-surface"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-dark-surface flex items-center justify-center">
                            {getStatusIcon(upload.status)}
                          </div>
                        )}
                      </div>
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-light-text font-medium text-sm truncate">{upload.name}</h3>
                          <div className="flex items-center space-x-1.5">
                            {upload.status === 'uploading' || upload.status === 'paused' ? (
                              <>
                                <button 
                                  onClick={() => handlePauseResume(upload.id)}
                                  className="p-1 rounded-lg text-light-text/70 hover:text-light-text hover:bg-dark-surface transition-colors duration-200"
                                >
                                  {upload.status === 'uploading' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                </button>
                                <button 
                                  onClick={() => handleCancel(upload.id)}
                                  className="p-1 rounded-lg text-light-text/70 hover:text-light-text hover:bg-dark-surface transition-colors duration-200"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : null}
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-light-text/70 text-xs">{upload.project}</span>
                          <Icon Icon={RiFolder3Line} size={12} color="#94a3b8" className="w-3 h-3" />
                          <span className="text-light-text/70 text-xs">root</span>
                        </div>
                        
                        {/* Progress Bar for active uploads */}
                        {(upload.status === 'uploading' || upload.status === 'paused') && (
                          <div className="mt-2">
                            <div className="w-full bg-dark-surface rounded-full h-1.5">
                              <div 
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${upload.progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-light-text/70 text-xs">{getStatusText(upload)}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Status text for completed uploads */}
                        {upload.status === 'completed' && (
                          <div className="mt-1.5">
                            <span className="text-light-text/70 text-xs">{getStatusText(upload)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Status Bar */}
        {activeUploads.length > 0 && (
          <div className="border-t border-dark-bg bg-dark-bg p-3">
            <div className="flex items-center space-x-3">
              {/* Overall Progress */}
              <div className="flex-1">
                <div className="w-full bg-dark-surface rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${activeUploads.reduce((acc, upload) => acc + upload.progress, 0) / activeUploads.length}%` }}
                  />
                </div>
              </div>
              
              {/* Status Text */}
              <div className="flex items-center space-x-3 text-light-text text-xs">
                <span>{activeUploads[0]?.timeRemaining} left</span>
                <span>·</span>
                <span>{activeUploads.length} Item{activeUploads.length !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{activeUploads[0]?.speed}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UploadsPanel;
