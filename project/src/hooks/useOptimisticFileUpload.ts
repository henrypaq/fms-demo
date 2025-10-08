import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useToast } from '../components/ui/toast';
import { FileItem } from '../components/features/FileCard';

export interface OptimisticFileItem extends FileItem {
  isOptimistic?: boolean;
  uploadProgress?: number;
  uploadStatus?: 'uploading' | 'processing' | 'complete' | 'error';
  uploadError?: string;
}

interface UploadFileParams {
  file: File;
  projectId?: string;
  folderId?: string;
  autoTagging?: boolean;
}

export const useOptimisticFileUpload = () => {
  const [optimisticFiles, setOptimisticFiles] = useState<OptimisticFileItem[]>([]);
  const { currentWorkspace } = useWorkspace();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  // Generate a temporary file item for optimistic updates
  const createOptimisticFile = useCallback((file: File, uploadId: string): OptimisticFileItem => {
    const now = new Date().toISOString();
    const formatFileSize = (bytes: number): string => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    return {
      id: uploadId,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type.includes('image/') ? 'image' : 
            file.type.includes('video/') ? 'video' :
            file.type.includes('audio/') ? 'audio' :
            file.type.includes('pdf') || file.type.includes('document') ? 'document' :
            file.type.includes('zip') || file.type.includes('archive') ? 'archive' : 'other',
      modifiedDate: new Date(now).toLocaleDateString(),
      thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      isFavorite: false,
      tags: [],
      originalName: file.name,
      filePath: '', // Will be set after upload
      fileType: file.type,
      fileSize: file.size,
      fileUrl: URL.createObjectURL(file), // Temporary URL for preview
      workspaceId: currentWorkspace?.id || '',
      projectId: undefined,
      folderId: undefined,
      // Optimistic-specific properties
      isOptimistic: true,
      uploadProgress: 0,
      uploadStatus: 'uploading',
    };
  }, [currentWorkspace]);

  // Generate thumbnail helper function
  const generateThumbnail = async (file: File): Promise<{ thumbnailPath: string | null; thumbnailUrl: string | null }> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        // Generate image thumbnail
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = async () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const maxSize = 300;
              let { width, height } = img;
              
              if (width > height) {
                if (width > maxSize) {
                  height = (height * maxSize) / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width = (width * maxSize) / height;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              
              const thumbnailBlob = await new Promise<Blob>((resolve) => {
                canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
              });
              
              const timestamp = Date.now();
              const randomId = Math.random().toString(36).substring(2);
              const thumbnailPath = `thumbnails/${currentWorkspace?.id}/thumb-${timestamp}-${randomId}.jpg`;
              
              const { error: thumbError } = await supabase.storage
                .from('files')
                .upload(thumbnailPath, thumbnailBlob, {
                  cacheControl: '3600',
                  upsert: false
                });
              
              if (thumbError) {
                console.warn('Thumbnail upload failed:', thumbError);
                resolve({ thumbnailPath: null, thumbnailUrl: null });
                return;
              }
              
              const { data: urlData } = supabase.storage.from('files').getPublicUrl(thumbnailPath);
              resolve({ thumbnailPath, thumbnailUrl: urlData.publicUrl });
            } catch (error) {
              console.warn('Thumbnail generation failed:', error);
              resolve({ thumbnailPath: null, thumbnailUrl: null });
            }
          };
          img.onerror = () => resolve({ thumbnailPath: null, thumbnailUrl: null });
          img.src = e.target?.result as string;
        };
        reader.onerror = () => resolve({ thumbnailPath: null, thumbnailUrl: null });
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        // Generate video thumbnail (simplified)
        resolve({ thumbnailPath: null, thumbnailUrl: null });
      } else {
        resolve({ thumbnailPath: null, thumbnailUrl: null });
      }
    });
  };

  // Upload mutation with optimistic updates
  const uploadMutation = useMutation({
    mutationFn: async ({ file, projectId, folderId, autoTagging = true }: UploadFileParams) => {
      if (!currentWorkspace) {
        throw new Error('No workspace selected');
      }

      // Generate unique file path
      const fileExt = file.name.split('.').pop() || 'bin';
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const fileName = `${timestamp}-${randomId}.${fileExt}`;
      
      let filePath = `workspaces/${currentWorkspace.id}`;
      if (projectId) {
        filePath += `/projects/${projectId}`;
        if (folderId) {
          filePath += `/folders/${folderId}`;
        }
      }
      filePath += `/${fileName}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Generate public URL
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath);
      const fileUrl = urlData.publicUrl;

      // Generate thumbnail for images and videos
      const { thumbnailPath, thumbnailUrl } = await generateThumbnail(file);

      // Create file record in database
      const fileRecord = {
        name: file.name,
        original_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_category: file.type.includes('image/') ? 'image' : 
                      file.type.includes('video/') ? 'video' :
                      file.type.includes('audio/') ? 'audio' :
                      file.type.includes('pdf') || file.type.includes('document') ? 'document' :
                      file.type.includes('zip') || file.type.includes('archive') ? 'archive' : 'other',
        file_path: filePath,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        workspace_id: currentWorkspace.id,
        project_id: projectId || null,
        folder_id: folderId || null,
        tags: autoTagging ? [] : [], // Auto-tagging would be implemented here
        is_favorite: false,
      };

      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert([fileRecord])
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      return dbData;
    },
    onMutate: async ({ file }) => {
      // Optimistic file is already created in uploadFile function
      // Just return the file name for reference
      return { fileName: file.name };
    },
    onSuccess: (data, variables, context) => {
      console.log('✅ Upload success, removing optimistic file:', context.fileName);
      
      // Remove optimistic file by matching the file name
      setOptimisticFiles(prev => {
        const filtered = prev.filter(f => f.name !== context.fileName);
        console.log('🗑️ Removed optimistic file, remaining:', filtered.length);
        return filtered;
      });
      
      // Invalidate and refetch files - force immediate refetch
      console.log('🔄 Triggering file refresh...');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.refetchQueries({ queryKey: ['files'] });
      
      // Also trigger workspace context update
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('filesUpdated'));
      }
      
      addToast({
        type: 'success',
        title: 'Upload Complete',
        description: `${variables.file.name} has been uploaded successfully.`,
      });
    },
    onError: (error, variables, context) => {
      // Remove optimistic file on error by matching the file name
      setOptimisticFiles(prev => prev.filter(f => f.name !== context.fileName));
      
      addToast({
        type: 'error',
        title: 'Upload Failed',
        description: `Failed to upload ${variables.file.name}: ${error.message}`,
      });
    },
  });

  const uploadFile = useCallback((params: UploadFileParams) => {
    // Create optimistic file immediately when upload is called
    const uploadId = `optimistic-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    const optimisticFile = createOptimisticFile(params.file, uploadId);
    
    console.log('🎨 Creating optimistic file:', { 
      name: params.file.name, 
      uploadId,
      isOptimistic: optimisticFile.isOptimistic,
      uploadProgress: optimisticFile.uploadProgress 
    });
    
    setOptimisticFiles(prev => {
      const newFiles = [optimisticFile, ...prev];
      console.log('📝 Updated optimistic files:', { count: newFiles.length });
      return newFiles;
    });

    // Update progress immediately
    const updateProgress = (progress: number, status: OptimisticFileItem['uploadStatus']) => {
      console.log(`⏫ Progress update: ${progress}% - ${status}`);
      setOptimisticFiles(prev => prev.map(f => 
        f.id === uploadId 
          ? { ...f, uploadProgress: progress, uploadStatus: status }
          : f
      ));
    };

    // Simulate progress updates
    setTimeout(() => updateProgress(25, 'uploading'), 100);
    setTimeout(() => updateProgress(50, 'uploading'), 500);
    setTimeout(() => updateProgress(75, 'processing'), 1000);

    return uploadMutation.mutateAsync(params);
  }, [uploadMutation, createOptimisticFile]);

  const uploadMultipleFiles = useCallback(async (files: File[], projectId?: string, folderId?: string, autoTagging = true) => {
    // Create all optimistic files immediately
    const uploadPromises = files.map(file => 
      uploadFile({ file, projectId, folderId, autoTagging })
    );
    
    try {
      await Promise.all(uploadPromises);
      return true;
    } catch (error) {
      console.error('Batch upload failed:', error);
      return false;
    }
  }, [uploadFile]);

  return {
    uploadFile,
    uploadMultipleFiles,
    optimisticFiles,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,
  };
};
