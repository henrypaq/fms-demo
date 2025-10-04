import React from 'react';
import { File, X } from 'lucide-react';
import CircularProgress from './CircularProgress';

interface UploadPlaceholderProps {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed' | 'paused';
  onCancel?: (id: string) => void;
  className?: string;
}

const UploadPlaceholder: React.FC<UploadPlaceholderProps> = ({
  id,
  name,
  progress,
  status,
  onCancel,
  className = ''
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'paused':
        return 'text-yellow-500';
      default:
        return 'text-blue-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return name || 'Uploading...'; // Show actual file name or fallback
      case 'completed':
        return name || 'Completed'; // Show file name or fallback
      case 'failed':
        return 'Failed';
      case 'paused':
        return 'Paused';
      default:
        return name || 'Uploading...'; // Always show the file name or fallback
    }
  };

  return (
    <div className={`group bg-dark-surface border rounded-lg overflow-hidden hover:bg-dark-bg transition-all duration-2000 border-dark-bg hover:border-dark-surface ${
      status === 'completed' ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
    } ${className}`}>
      {/* Image/Preview Area - Nearly 1:1 ratio */}
      <div className="relative aspect-square bg-[#262626] flex items-center justify-center overflow-hidden">
        {/* File Preview - Show actual file if it's an image */}
        {status === 'completed' && name && name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
          <div className="w-full h-full flex items-center justify-center bg-[#262626]">
            <span className="text-light-text/60 text-sm">Preview loading...</span>
          </div>
        ) : (
          /* Circular Progress for uploading */
          <div className="flex items-center justify-center w-full h-full">
            <CircularProgress 
              progress={progress} 
              size={100}
              strokeWidth={8}
              className="text-blue-500"
            />
          </div>
        )}
        
        {/* Cancel button */}
        {status === 'uploading' && onCancel && (
          <button
            onClick={() => onCancel(id)}
            className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* File Info */}
      <div className="p-3">
        {/* File name */}
        <h3 className="font-medium text-sm mb-2 truncate text-light-text">
          {name}
        </h3>
        
        {/* Status - More subtle for completed files */}
        <div className="flex items-center space-x-2">
          {status === 'uploading' && (
            <>
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className={`text-xs ${getStatusColor()}`}>
                Uploading...
              </span>
            </>
          )}
          {status === 'completed' && (
            <span className="text-xs text-green-500">
              ✓ Ready
            </span>
          )}
          {status === 'failed' && (
            <>
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className={`text-xs ${getStatusColor()}`}>
                Failed
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPlaceholder;
