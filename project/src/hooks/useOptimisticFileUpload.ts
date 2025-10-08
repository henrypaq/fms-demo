import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useToast } from '../components/ui/toast';
import { FileItem } from '../components/features/FileCard';

/**
 * N8N Auto-Tagging Webhook for Optimistic File Uploads
 * 
 * This hook uses the same webhook as useFileUpload and useAutoTagging
 * to ensure consistent auto-tagging across all upload methods.
 * 
 * Webhook URL: https://callistoai.app.n8n.cloud/webhook/d2855857-3e7b-4465-b627-89ed188f2151
 * 
 * See useAutoTagging.ts for complete webhook documentation.
 */
const N8N_WEBHOOK_URL = 'https://callistoai.app.n8n.cloud/webhook/d2855857-3e7b-4465-b627-89ed188f2151';

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

  // Send file to n8n webhook for auto-tagging
  const sendToN8nWebhook = useCallback(async (fileData: any, autoTaggingEnabled: boolean) => {
    if (!autoTaggingEnabled) {
      console.log('⏭️ Auto-tagging disabled, skipping n8n webhook');
      return;
    }

    try {
      console.log('🏷️ Sending file to n8n webhook for auto-tagging:', fileData.name);

      // Generate public URL for file
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(fileData.file_path);
      const fileUrl = urlData.publicUrl;

      // Generate thumbnail URL if available
      let thumbnailUrl = null;
      if (fileData.thumbnail_url) {
        thumbnailUrl = fileData.thumbnail_url;
      } else if (fileData.file_category === 'image') {
        thumbnailUrl = fileUrl; // Use file itself as thumbnail for images
      }

      // Prepare webhook payload
      const webhookPayload = {
        fileId: fileData.id,
        fileName: fileData.name,
        originalName: fileData.original_name,
        fileType: fileData.file_type,
        fileCategory: fileData.file_category,
        fileSize: fileData.file_size,
        fileUrl: fileUrl,
        thumbnailUrl: thumbnailUrl,
        filePath: fileData.file_path,
        workspaceId: fileData.workspace_id,
        projectId: fileData.project_id,
        folderId: fileData.folder_id,
        timestamp: new Date().toISOString(),
        context: {
          workspace: currentWorkspace?.name,
          uploadSource: 'filevault-optimistic-upload'
        }
      };

      console.log('📤 Sending payload to n8n:', {
        url: N8N_WEBHOOK_URL,
        fileId: webhookPayload.fileId,
        fileName: webhookPayload.fileName,
        fileCategory: webhookPayload.fileCategory,
        thumbnailUrl: webhookPayload.thumbnailUrl ? 'Present' : 'Not available'
      });

      // Send to n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });

      console.log('📡 n8n webhook response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ n8n webhook response:', result);
      console.log('📋 Full webhook response data:', JSON.stringify(result, null, 2));

      // n8n workflow is asynchronous - it returns {"message":"Workflow was started"}
      // n8n will analyze the file and update the database directly with tags
      // Our Realtime subscription will detect the update and refresh the file list
      
      if (result.message === 'Workflow was started') {
        console.log('🚀 n8n workflow started successfully - tags will be added asynchronously');
        console.log('⏳ n8n will analyze the file and update tags in the database');
        console.log('🔄 Realtime subscription will auto-refresh when tags are updated');
      }

      // If n8n returns tags immediately (synchronous mode), update the file
      if (result.tags && Array.isArray(result.tags) && result.tags.length > 0) {
        console.log('🏷️ n8n returned tags immediately:', result.tags);
        console.log('📝 Updating file with tags:', result.tags);
        console.log('📊 Number of tags:', result.tags.length);
        console.log('🔍 Tag details:', result.tags.map((tag: string, idx: number) => `${idx + 1}. "${tag}"`).join(', '));
        
        const { error: updateError } = await supabase
          .from('files')
          .update({ tags: result.tags })
          .eq('id', fileData.id);

        if (updateError) {
          console.error('❌ Failed to update file tags:', updateError);
        } else {
          console.log('✅ File tags updated successfully');
          // Trigger a refresh of the file list
          queryClient.invalidateQueries({ queryKey: ['files'] });
        }
      } else {
        console.log('⏭️ No immediate tags returned - waiting for n8n to update database');
      }

    } catch (error) {
      console.error('❌ Failed to send file to n8n webhook:', error);
      // Don't throw - auto-tagging failure shouldn't break the upload flow
    }
  }, [currentWorkspace, queryClient]);

  // Generate a temporary file item for optimistic updates
  const createOptimisticFile = useCallback((file: File, uploadId: string): OptimisticFileItem => {
    const now = new Date().toISOString();
    const formatFileSize = (bytes: number): string => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Create thumbnail preview for videos
    let thumbnailPreview: string | undefined = undefined;
    if (file.type.startsWith('image/')) {
      thumbnailPreview = URL.createObjectURL(file);
    } else if (file.type.startsWith('video/')) {
      // For videos, we'll generate a quick preview
      thumbnailPreview = URL.createObjectURL(file);
    }

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
      thumbnail: thumbnailPreview,
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
        // Generate video thumbnail from first frame
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        const videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;
        
        video.onloadedmetadata = async () => {
          // Seek to 1 second or 10% of video duration for better thumbnail
          const seekTime = Math.min(1, video.duration * 0.1);
          video.currentTime = seekTime;
        };
        
        video.onseeked = async () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxSize = 600;
            
            let { videoWidth: width, videoHeight: height } = video;
            
            // Scale to max size while maintaining aspect ratio
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
            ctx?.drawImage(video, 0, 0, width, height);
            
            const thumbnailBlob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
            });
            
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2);
            const thumbnailPath = `thumbnails/${currentWorkspace?.id}/thumb-video-${timestamp}-${randomId}.jpg`;
            
            const { error: thumbError } = await supabase.storage
              .from('files')
              .upload(thumbnailPath, thumbnailBlob, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (thumbError) {
              console.warn('Video thumbnail upload failed:', thumbError);
              URL.revokeObjectURL(videoUrl);
              resolve({ thumbnailPath: null, thumbnailUrl: null });
              return;
            }
            
            const { data: urlData } = supabase.storage.from('files').getPublicUrl(thumbnailPath);
            console.log('✅ Video thumbnail generated:', thumbnailPath);
            URL.revokeObjectURL(videoUrl);
            resolve({ thumbnailPath, thumbnailUrl: urlData.publicUrl });
          } catch (error) {
            console.warn('Video thumbnail generation failed:', error);
            URL.revokeObjectURL(videoUrl);
            resolve({ thumbnailPath: null, thumbnailUrl: null });
          }
        };
        
        video.onerror = () => {
          console.warn('Video loading error');
          URL.revokeObjectURL(videoUrl);
          resolve({ thumbnailPath: null, thumbnailUrl: null });
        };
        
        // Timeout fallback
        setTimeout(() => {
          URL.revokeObjectURL(videoUrl);
          resolve({ thumbnailPath: null, thumbnailUrl: null });
        }, 10000); // 10 second timeout
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
      const fileRecord: any = {
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
        workspace_id: currentWorkspace.id,
        project_id: projectId || null,
        folder_id: folderId || null,
        is_favorite: false,
      };

      // Add thumbnail_url only if it exists (avoid null issues)
      if (thumbnailUrl) {
        fileRecord.thumbnail_url = thumbnailUrl;
      }

      // Add tags as empty array or null (let database use default)
      // Don't include tags field at all to use database default
      // tags: [] might be causing issues with PostgreSQL array handling

      console.log('📝 Inserting file record:', {
        name: fileRecord.name,
        project_id: fileRecord.project_id,
        folder_id: fileRecord.folder_id,
        workspace_id: fileRecord.workspace_id,
        file_category: fileRecord.file_category
      });

      const { data: dbData, error: dbError } = await supabase
        .from('files')
        .insert([fileRecord])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database insert error:', {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details,
          hint: dbError.hint,
          fileRecord: fileRecord
        });
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('✅ File record inserted successfully:', dbData.id);
      return dbData;
    },
    onMutate: async ({ file }) => {
      // Optimistic file is already created in uploadFile function
      // Just return the file name for reference
      return { fileName: file.name };
    },
    onSuccess: async (data, variables, context) => {
      // Remove optimistic file by matching the file name
      setOptimisticFiles(prev => prev.filter(f => f.name !== context.fileName));
      
      // Send to n8n webhook for auto-tagging
      if (variables.autoTagging !== false) {
        await sendToN8nWebhook(data, variables.autoTagging ?? true);
      }
      
      // Invalidate and refetch files - force immediate refetch
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.refetchQueries({ queryKey: ['files'] });
      
      // Also trigger workspace context update
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('filesUpdated'));
      }
      
      addToast({
        type: 'success',
        title: 'Upload Complete',
        description: `${variables.file.name} has been uploaded ${variables.autoTagging !== false ? 'and sent for auto-tagging' : 'successfully'}.`,
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
    
    setOptimisticFiles(prev => [optimisticFile, ...prev]);

    // Update progress immediately
    const updateProgress = (progress: number, status: OptimisticFileItem['uploadStatus']) => {
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
