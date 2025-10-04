import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  MoreHorizontal, 
  X, 
  Folder,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface UploadItem {
  id: string;
  name: string;
  project: string;
  status: 'uploading' | 'completed' | 'failed' | 'paused';
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: string;
  timeRemaining: string;
  completedAt?: string;
  thumbnail?: string;
}

const UploadsView: React.FC = () => {
  const [uploads, setUploads] = useState<UploadItem[]>([
    {
      id: '1',
      name: 'Harve knife 4.MP4',
      project: "Roger's First Project",
      status: 'uploading',
      progress: 44,
      uploadedBytes: 66.2,
      totalBytes: 401,
      speed: '60.6 Mbit/s',
      timeRemaining: '44s'
    },
    {
      id: '2',
      name: 'Harve knife 4.MP4',
      project: "Roger's First Project",
      status: 'completed',
      progress: 100,
      uploadedBytes: 401,
      totalBytes: 401,
      speed: '0 Mbit/s',
      timeRemaining: '0s',
      completedAt: '9h ago',
      thumbnail: '/api/placeholder/60/40'
    }
  ]);

  const activeUploads = uploads.filter(upload => upload.status === 'uploading');
  const completedUploads = uploads.filter(upload => upload.status === 'completed');

  const formatBytes = (bytes: number) => {
    return `${bytes} MB`;
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
        return `Uploaded · ${upload.completedAt}`;
      case 'failed':
        return 'Upload failed';
      case 'paused':
        return 'Upload paused';
      default:
        return '';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-dark-bg">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-dark-surface">
        <h1 className="text-2xl font-bold text-light-text">Uploads</h1>
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-lg text-light-text/70 hover:text-light-text hover:bg-dark-surface transition-colors duration-200">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg text-light-text/70 hover:text-light-text hover:bg-dark-surface transition-colors duration-200">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Today Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-light-text mb-4">Today</h2>
          
          {/* Active Uploads */}
          {activeUploads.map((upload) => (
            <div key={upload.id} className="bg-dark-surface rounded-lg p-4 mb-4 border border-dark-bg">
              <div className="flex items-start space-x-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(upload.status)}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-light-text font-medium truncate">{upload.name}</h3>
                    <button className="p-1 rounded-lg text-light-text/70 hover:text-light-text hover:bg-dark-bg transition-colors duration-200">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-light-text/70 text-sm">{upload.project}</span>
                    <Folder className="w-3 h-3 text-light-text/70" />
                    <span className="text-light-text/70 text-sm">root</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-dark-bg rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-light-text/70 text-sm">{getStatusText(upload)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Completed Uploads */}
          {completedUploads.map((upload) => (
            <div key={upload.id} className="bg-dark-surface rounded-lg p-4 mb-4 border border-dark-bg">
              <div className="flex items-start space-x-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  {upload.thumbnail ? (
                    <img 
                      src={upload.thumbnail} 
                      alt={upload.name}
                      className="w-12 h-12 rounded-lg object-cover bg-dark-bg"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-dark-bg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  )}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-light-text font-medium truncate">{upload.name}</h3>
                    <button className="p-1 rounded-lg text-light-text/70 hover:text-light-text hover:bg-dark-bg transition-colors duration-200">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-light-text/70 text-sm">{upload.project}</span>
                    <Folder className="w-3 h-3 text-light-text/70" />
                    <span className="text-light-text/70 text-sm">root</span>
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-light-text/70 text-sm">{getStatusText(upload)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Status Bar */}
      {activeUploads.length > 0 && (
        <div className="border-t border-dark-surface bg-dark-surface p-4">
          <div className="flex items-center space-x-4">
            {/* Overall Progress */}
            <div className="flex-1">
              <div className="w-full bg-dark-bg rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${activeUploads.reduce((acc, upload) => acc + upload.progress, 0) / activeUploads.length}%` }}
                />
              </div>
            </div>
            
            {/* Status Text */}
            <div className="flex items-center space-x-4 text-light-text text-sm">
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
  );
};

export default UploadsView;
