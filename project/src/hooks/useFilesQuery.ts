import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { FileItem } from '../components/features/FileCard';

// Format file size helper
const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Convert database record to FileItem
const convertFileRecord = (record: any): FileItem => ({
  id: record.id,
  name: record.name,
  size: formatFileSize(record.file_size),
  type: record.file_category || 'other',
  modifiedDate: new Date(record.updated_at || record.created_at).toLocaleDateString(),
  thumbnail: record.thumbnail_url || undefined,
  isFavorite: record.is_favorite || false,
  tags: record.tags || [],
  originalName: record.original_name,
  filePath: record.file_path,
  fileType: record.file_type,
  fileSize: record.file_size,
  fileUrl: record.file_url || undefined,
  workspaceId: record.workspace_id,
  projectId: record.project_id || undefined,
  folderId: record.folder_id || undefined,
});

interface UseFilesQueryOptions {
  projectId?: string;
  folderId?: string;
  sortBy?: 'name' | 'date' | 'size' | 'type';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const useFilesQuery = (options: UseFilesQueryOptions = {}) => {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const {
    projectId,
    folderId,
    sortBy = 'date',
    sortDirection = 'desc',
    page = 1,
    limit = 50,
  } = options;

  // Build query key
  const queryKey = [
    'files',
    currentWorkspace?.id,
    projectId,
    folderId,
    sortBy,
    sortDirection,
    page,
    limit,
  ];

  // Fetch files
  const {
    data: files = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return [];
      }

      let query = supabase
        .from('files')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .is('deleted_at', null);

      // Apply filters
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else if (projectId) {
        query = query.is('folder_id', null);
      }

      // Apply sorting
      const sortField = sortBy === 'date' ? 'created_at' : 
                      sortBy === 'name' ? 'name' :
                      sortBy === 'size' ? 'file_size' : 'file_type';
      
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      return (data || []).map(convertFileRecord);
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const channel = supabase
      .channel('files-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        (payload) => {

          // Invalidate and refetch files when changes occur
          queryClient.invalidateQueries({ queryKey: ['files'] });

          // Show toast notifications for new files
          if (payload.eventType === 'INSERT') {
            // This will be handled by the toast system in the upload hook
          } else if (payload.eventType === 'DELETE') {
            // File was deleted
          } else if (payload.eventType === 'UPDATE') {
            // File was updated
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace?.id, queryClient]);

  return {
    files,
    isLoading,
    error,
    refetch,
  };
};

// Hook for file counts
export const useFilesCount = (options: UseFilesQueryOptions = {}) => {
  const { currentWorkspace } = useWorkspace();
  const { projectId, folderId } = options;

  const queryKey = [
    'files-count',
    currentWorkspace?.id,
    projectId,
    folderId,
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentWorkspace?.id) {
        return 0;
      }

      let query = supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', currentWorkspace.id)
        .is('deleted_at', null);

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }

      if (folderId) {
        query = query.eq('folder_id', folderId);
      } else if (projectId) {
        query = query.is('folder_id', null);
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
