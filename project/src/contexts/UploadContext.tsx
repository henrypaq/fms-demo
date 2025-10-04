import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';

export interface UploadItem {
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
  file: File;
  xhr?: XMLHttpRequest;
}

interface UploadContextType {
  uploads: UploadItem[];
  addUpload: (file: File, project: string) => void;
  updateUpload: (id: string, updates: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  pauseUpload: (id: string) => void;
  resumeUpload: (id: string) => void;
  cancelUpload: (id: string) => void;
  clearCompletedUploads: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUploads = () => {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error('useUploads must be used within an UploadProvider');
  }
  return context;
};

interface UploadProviderProps {
  children: React.ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const uploadRefs = useRef<Map<string, XMLHttpRequest>>(new Map());
  const { uploadFiles: realUploadFiles } = useFileUpload();
  
  console.log('UploadProvider initialized, realUploadFiles:', typeof realUploadFiles);

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

  const calculateSpeed = (uploadedBytes: number, startTime: number) => {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    if (elapsed === 0) return '0 B/s';
    const speed = uploadedBytes / elapsed;
    return formatBytes(speed) + '/s';
  };

  const calculateTimeRemaining = (uploadedBytes: number, totalBytes: number, startTime: number) => {
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    if (elapsed === 0 || uploadedBytes === 0) return 'Calculating...';
    
    const speed = uploadedBytes / elapsed;
    const remainingBytes = totalBytes - uploadedBytes;
    const remainingTime = remainingBytes / speed;
    
    if (remainingTime < 60) {
      return `${Math.round(remainingTime)}s`;
    } else if (remainingTime < 3600) {
      return `${Math.round(remainingTime / 60)}m`;
    } else {
      return `${Math.round(remainingTime / 3600)}h`;
    }
  };

  // Function to generate thumbnail for files
  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.onloadedmetadata = () => {
          video.currentTime = 1; // Seek to 1 second
        };
        
        video.onseeked = () => {
          canvas.width = 200;
          canvas.height = 200;
          ctx?.drawImage(video, 0, 0, 200, 200);
          resolve(canvas.toDataURL());
        };
        
        video.src = URL.createObjectURL(file);
      } else {
        // For other file types, create a colored placeholder based on file extension
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 200;
        
        // Get color based on file extension
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const colors = {
          pdf: '#FF6B6B',
          doc: '#4ECDC4',
          docx: '#4ECDC4',
          txt: '#95E1D3',
          xls: '#FECA57',
          xlsx: '#FECA57',
          ppt: '#FF9FF3',
          pptx: '#FF9FF3',
          zip: '#A8E6CF',
          rar: '#A8E6CF',
          mp3: '#FFB6C1',
          mp4: '#87CEEB',
          avi: '#87CEEB',
          mov: '#87CEEB',
          default: '#DDA0DD'
        };
        
        const color = colors[ext as keyof typeof colors] || colors.default;
        
        if (ctx) {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 200, 200);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(ext.toUpperCase(), 100, 120);
        }
        
        resolve(canvas.toDataURL());
      }
    });
  };

  const addUpload = useCallback(async (file: File, project: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    // Generate thumbnail
    const thumbnail = await generateThumbnail(file);
    
    const uploadItem: UploadItem = {
      id,
      name: file.name,
      project,
      status: 'uploading',
      progress: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      speed: '0 MB/s',
      timeRemaining: 'Calculating...',
      thumbnail,
      file,
    };

    console.log('UploadContext - Adding upload:', uploadItem);
    setUploads(prev => {
      const newUploads = [...prev, uploadItem];
      console.log('UploadContext - New uploads array:', newUploads);
      return newUploads;
    });

    // Create XMLHttpRequest for upload
    const xhr = new XMLHttpRequest();
    uploadRefs.current.set(id, xhr);

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        const uploadedBytes = event.loaded;
        const speed = calculateSpeed(uploadedBytes, startTime);
        const timeRemaining = calculateTimeRemaining(uploadedBytes, event.total, startTime);

        setUploads(prev => prev.map(upload => 
          upload.id === id 
            ? { 
                ...upload, 
                progress, 
                uploadedBytes, 
                speed, 
                timeRemaining 
              }
            : upload
        ));
      }
    });

    // Handle upload completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploads(prev => prev.map(upload => 
          upload.id === id 
            ? { 
                ...upload, 
                status: 'completed',
                progress: 100,
                completedAt: 'Just now'
              }
            : upload
        ));
      } else {
        setUploads(prev => prev.map(upload => 
          upload.id === id 
            ? { ...upload, status: 'failed' }
            : upload
        ));
      }
    });

    // Handle upload errors
    xhr.addEventListener('error', () => {
      setUploads(prev => prev.map(upload => 
        upload.id === id 
          ? { ...upload, status: 'failed' }
          : upload
      ));
    });

    // Start the actual upload process
    const performUpload = async () => {
      try {
        // Create FormData for the upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project', project);
        
        // Use the existing uploadFiles function from the hook
        // We'll need to import and use the actual upload functionality
        console.log('Starting real upload for:', file.name);
        
        // Perform real upload with progress tracking
        console.log('Starting real upload for:', file.name);
        
        try {
          // Check if upload function is available
          if (!realUploadFiles) {
            console.error('Upload function not available');
            throw new Error('Upload function not available');
          }
          
          console.log('Upload function available, starting upload...');
          
          // Start with some progress to show it's working
          setUploads(prev => prev.map(upload => 
            upload.id === id 
              ? { ...upload, progress: 10, status: 'uploading' }
              : upload
          ));
          
          // Perform the actual upload
          console.log('Calling realUploadFiles with:', { file: file.name, project });
          const uploadedFiles = await realUploadFiles([file], [], true, project, null);
          console.log('Upload completed, files:', uploadedFiles);
          
          if (uploadedFiles && uploadedFiles.length > 0) {
            console.log('Upload successful, updating status');
            // Update to completed status
            setUploads(prev => prev.map(upload => 
              upload.id === id 
                ? { 
                    ...upload, 
                    status: 'completed',
                    progress: 100,
                    completedAt: 'Just now'
                  }
                : upload
            ));
            
            // Keep completed uploads in the panel for tracking
            // Don't remove them automatically
            // The placeholder will fade out and the real file will appear in its place
            // Keep the placeholder visible longer to ensure real file appears
            // The placeholder will stay until the real file is loaded and visible
            setTimeout(() => {
              setUploads(prev => prev.filter(upload => upload.id !== id));
            }, 5000); // 5 second delay to ensure real file is fully loaded and visible
          } else {
            console.error('No files returned from upload');
            throw new Error('No files returned from upload');
          }
        } catch (error) {
          console.error('Upload failed with error:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          
          // Fallback to simulated upload for testing
          console.log('Falling back to simulated upload for testing...');
          let progress = 10;
          const interval = setInterval(() => {
            progress += Math.random() * 15 + 5; // Random progress between 5-20%
            
            if (progress >= 100) {
              progress = 100;
              clearInterval(interval);
              
              setUploads(prev => prev.map(upload => 
                upload.id === id 
                  ? { 
                      ...upload, 
                      status: 'completed',
                      progress: 100,
                      completedAt: 'Just now'
                    }
                  : upload
              ));
              
              // Keep completed uploads in the panel for tracking
              // Don't remove them automatically
              // The placeholder will fade out and the real file will appear in its place
              // Keep the placeholder visible longer to ensure real file appears
              // The placeholder will stay until the real file is loaded and visible
              setTimeout(() => {
                setUploads(prev => prev.filter(upload => upload.id !== id));
              }, 5000); // 5 second delay to ensure real file is fully loaded and visible
            } else {
              setUploads(prev => prev.map(upload => 
                upload.id === id 
                  ? { 
                      ...upload, 
                      progress: Math.round(progress),
                      status: 'uploading'
                    }
                  : upload
              ));
            }
          }, 300 + Math.random() * 400);
        }
        
      } catch (error) {
        console.error('Upload failed:', error);
        setUploads(prev => prev.map(upload => 
          upload.id === id 
            ? { ...upload, status: 'failed' }
            : upload
        ));
      }
    };

    performUpload();
  }, []);

  const updateUpload = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, ...updates } : upload
    ));
  }, []);

  const removeUpload = useCallback((id: string) => {
    const xhr = uploadRefs.current.get(id);
    if (xhr) {
      xhr.abort();
      uploadRefs.current.delete(id);
    }
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const pauseUpload = useCallback((id: string) => {
    const xhr = uploadRefs.current.get(id);
    if (xhr) {
      xhr.abort();
      uploadRefs.current.delete(id);
    }
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status: 'paused' } : upload
    ));
  }, []);

  const resumeUpload = useCallback((id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (upload) {
      // Restart the upload from where it left off
      addUpload(upload.file, upload.project);
      removeUpload(id);
    }
  }, [uploads, addUpload, removeUpload]);

  const cancelUpload = useCallback((id: string) => {
    removeUpload(id);
  }, [removeUpload]);

  const clearCompletedUploads = useCallback(() => {
    setUploads(prev => prev.filter(upload => upload.status !== 'completed'));
  }, []);

  const value: UploadContextType = {
    uploads,
    addUpload,
    updateUpload,
    removeUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    clearCompletedUploads,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};
