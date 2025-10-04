import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Workspace, WorkspaceContextType } from '../types/workspace';
import { supabase } from '../lib/supabase';

// Default context values to prevent crashes
const defaultWorkspaceContext: WorkspaceContextType = {
  currentWorkspace: null,
  workspaces: [],
  loading: true,
  error: null,
  switchWorkspace: () => {},
  createWorkspace: async () => ({ id: '', name: '', color: '', created_at: '', updated_at: '' }),
  updateWorkspace: async () => {},
  deleteWorkspace: async () => {},
  duplicateFilesToWorkspace: async () => {},
  moveFilesToWorkspace: async () => {},
};

const WorkspaceContext = createContext<WorkspaceContextType>(defaultWorkspaceContext);

interface WorkspaceProviderProps {
  children: ReactNode;
}

// Global state to track when files have been updated
let filesUpdatedFlag = false;
let lastUpdateTimestamp = 0;

// Function to mark files as updated
export const markFilesAsUpdated = () => {
  filesUpdatedFlag = true;
  lastUpdateTimestamp = Date.now();
  console.log('Files marked as updated at:', lastUpdateTimestamp);
};

// Function to check if files need refresh
export const shouldRefreshFiles = () => {
  return filesUpdatedFlag;
};

// Function to clear the update flag
export const clearFilesUpdateFlag = () => {
  filesUpdatedFlag = false;
  console.log('Files update flag cleared');
};

// Fallback component for when workspace is not available
const WorkspaceSelectFallback: React.FC = () => (
  <div className="min-h-screen bg-dark-bg flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="w-8 h-8 border-4 border-light-text border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-400 mb-6">
        Setting up your workspace...
      </p>
    </div>
  </div>
);

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load workspaces on mount
  useEffect(() => {
    let isMounted = true;
    
    const initializeWorkspaces = async () => {
      try {
        setLoading(true);
        setError(null);
        
        await loadWorkspaces();
        
        if (isMounted) {
          setInitialized(true);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to initialize workspaces:', err);
          setError(err instanceof Error ? err.message : 'Failed to initialize workspaces');
          setInitialized(true); // Still mark as initialized to prevent infinite loading
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeWorkspaces();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load saved workspace preference after workspaces are loaded
  useEffect(() => {
    if (!initialized || workspaces.length === 0) return;

    try {
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      let workspace: Workspace | undefined = undefined;
      if (savedWorkspaceId && workspaces.length > 0) {
        workspace = workspaces.find(w => w.id === savedWorkspaceId);
      }
      if (workspace) {
        setCurrentWorkspace(workspace);
      } else if (workspaces.length > 0) {
        // Fallback to first workspace if saved one doesn't exist
        const firstWorkspace = workspaces[0];
        setCurrentWorkspace(firstWorkspace);
        localStorage.setItem('currentWorkspaceId', firstWorkspace.id);
        if (savedWorkspaceId) {
          console.warn('Saved workspace not found, falling back to first workspace.');
        }
      } else {
        // No workspaces at all, try to create a default one
        (async () => {
          try {
            const defaultWorkspace = await createWorkspaceInternal({
              name: 'My Workspace',
              description: 'Default workspace for your files',
              color: '#3B82F6'
            });
            setWorkspaces([defaultWorkspace]);
            setCurrentWorkspace(defaultWorkspace);
            localStorage.setItem('currentWorkspaceId', defaultWorkspace.id);
            console.log('Created default workspace as fallback.');
          } catch (err) {
            console.error('Failed to create default workspace as fallback:', err);
          }
        })();
      }
    } catch (err) {
      console.error('Error setting current workspace:', err);
      // Fallback to first workspace if localStorage fails
      if (workspaces.length > 0) {
        setCurrentWorkspace(workspaces[0]);
        localStorage.setItem('currentWorkspaceId', workspaces[0].id);
      }
    }
  }, [initialized, workspaces]);

  // Internal create function that doesn't update state (used during initialization)
  const createWorkspaceInternal = useCallback(async (workspaceData: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>): Promise<Workspace> => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert([workspaceData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating workspace:', error);
        throw new Error(`Failed to create workspace: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from workspace creation');
      }

      return data as Workspace;
    } catch (err) {
      console.error('Error in createWorkspaceInternal:', err);
      throw err;
    }
  }, []);

  const loadWorkspaces = useCallback(async () => {
    try {
      console.log('Loading workspaces...');
      
      // Get current user to check permissions
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found, loading all workspaces');
        const { data, error: fetchError } = await supabase
          .from('workspaces')
          .select('*')
          .order('name');

        if (fetchError) {
          console.error('Supabase error loading workspaces:', fetchError);
          throw new Error(`Database error: ${fetchError.message}`);
        }

        if (!data || data.length === 0) {
          console.log('No workspaces found, creating default workspace...');
          
          try {
            const defaultWorkspace = await createWorkspaceInternal({
              name: 'My Workspace',
              description: 'Default workspace for your files',
              color: '#3B82F6'
            });
            
            setWorkspaces([defaultWorkspace]);
            console.log('Default workspace created successfully');
          } catch (createError) {
            console.error('Failed to create default workspace:', createError);
            setWorkspaces([]);
          }
        } else {
          setWorkspaces(data);
          console.log(`Loaded ${data.length} workspaces`);
        }
        return;
      }

      // Get user profile to check role and project access
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('User profile loaded:', profile);

      if (!profile) {
        console.log('No user profile found, loading all workspaces');
        const { data, error: fetchError } = await supabase
          .from('workspaces')
          .select('*')
          .order('name');

        if (fetchError) {
          console.error('Supabase error loading workspaces:', fetchError);
          throw new Error(`Database error: ${fetchError.message}`);
        }

        setWorkspaces(data || []);
        return;
      }

      // Build the workspace query based on user role
      let workspaceQuery = supabase
        .from('workspaces')
        .select('*')
        .order('name');

      if (profile.role === 'admin') {
        console.log('Admin user, loading all workspaces');
        // Admins see all workspaces - no filtering needed
      } else {
        console.log('Employee user, loading accessible workspaces only');
        console.log('Profile workspace_id:', profile.workspace_id);
        console.log('Profile project_access:', profile.project_access);
        
        // For employees, build a query that only fetches accessible workspaces
        const accessibleWorkspaceIds = new Set<string>();
        
        // Add primary workspace
        if (profile.workspace_id) {
          accessibleWorkspaceIds.add(profile.workspace_id);
          console.log('Added primary workspace:', profile.workspace_id);
        }
        
        // Add workspaces from project access
        if (profile.project_access && profile.project_access.length > 0) {
          const { data: projects } = await supabase
            .from('projects')
            .select('workspace_id')
            .in('id', profile.project_access);
            
          if (projects) {
            projects.forEach(project => {
              if (project.workspace_id) {
                accessibleWorkspaceIds.add(project.workspace_id);
                console.log('Added workspace from project:', project.workspace_id);
              }
            });
          }
        }
        
        console.log('Total accessible workspace IDs:', Array.from(accessibleWorkspaceIds));
        
        if (accessibleWorkspaceIds.size > 0) {
          // Filter the query to only include accessible workspaces
          workspaceQuery = workspaceQuery.in('id', Array.from(accessibleWorkspaceIds));
        } else {
          // No accessible workspaces - return empty array
          setWorkspaces([]);
          console.log('No accessible workspaces found for employee');
          return;
        }
      }

      // Execute the query (either all workspaces for admin, or filtered for employee)
      const { data, error: fetchError } = await workspaceQuery;

      if (fetchError) {
        console.error('Supabase error loading workspaces:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      setWorkspaces(data || []);
      console.log(`Loaded ${data?.length || 0} workspaces:`, data);
    } catch (err) {
      console.error('Error in loadWorkspaces:', err);
      throw err;
    }
  }, [createWorkspaceInternal]);

  const switchWorkspace = useCallback((workspaceId: string) => {
    try {
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        console.log('Switching to workspace:', workspace.name);
        setCurrentWorkspace(workspace);
        localStorage.setItem('currentWorkspaceId', workspaceId);
      } else if (workspaces.length > 0) {
        // Fallback to first workspace if requested one is missing
        const firstWorkspace = workspaces[0];
        setCurrentWorkspace(firstWorkspace);
        localStorage.setItem('currentWorkspaceId', firstWorkspace.id);
        console.warn('Requested workspace not found, falling back to first workspace.');
      } else {
        // No workspaces at all, try to create a default one
        (async () => {
          try {
            const defaultWorkspace = await createWorkspaceInternal({
              name: 'My Workspace',
              description: 'Default workspace for your files',
              color: '#3B82F6'
            });
            setWorkspaces([defaultWorkspace]);
            setCurrentWorkspace(defaultWorkspace);
            localStorage.setItem('currentWorkspaceId', defaultWorkspace.id);
            console.log('Created default workspace as fallback (switch).');
          } catch (err) {
            console.error('Failed to create default workspace as fallback (switch):', err);
          }
        })();
      }
    } catch (err) {
      console.error('Error switching workspace:', err);
    }
  }, [workspaces]);

  const createWorkspace = useCallback(async (workspaceData: Omit<Workspace, 'id' | 'created_at' | 'updated_at'>): Promise<Workspace> => {
    try {
      const newWorkspace = await createWorkspaceInternal(workspaceData);
      setWorkspaces(prev => [...prev, newWorkspace]);
      return newWorkspace;
    } catch (err) {
      console.error('Error creating workspace:', err);
      throw err;
    }
  }, [createWorkspaceInternal]);

  const updateWorkspace = useCallback(async (workspaceId: string, updates: Partial<Workspace>) => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId);

      if (error) {
        console.error('Supabase error updating workspace:', error);
        throw new Error(`Failed to update workspace: ${error.message}`);
      }

      setWorkspaces(prev => prev.map(w => 
        w.id === workspaceId ? { ...w, ...updates } : w
      ));

      if (currentWorkspace?.id === workspaceId) {
        setCurrentWorkspace(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (err) {
      console.error('Error updating workspace:', err);
      throw err;
    }
  }, [currentWorkspace]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    try {
      if (workspaces.length <= 1) {
        throw new Error('Cannot delete the last workspace');
      }

      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) {
        console.error('Supabase error deleting workspace:', error);
        throw new Error(`Failed to delete workspace: ${error.message}`);
      }

      const updatedWorkspaces = workspaces.filter(w => w.id !== workspaceId);
      setWorkspaces(updatedWorkspaces);

      if (currentWorkspace?.id === workspaceId) {
        if (updatedWorkspaces.length > 0) {
          const newCurrentWorkspace = updatedWorkspaces[0];
          setCurrentWorkspace(newCurrentWorkspace);
          localStorage.setItem('currentWorkspaceId', newCurrentWorkspace.id);
        } else {
          setCurrentWorkspace(null);
          localStorage.removeItem('currentWorkspaceId');
        }
      }
    } catch (err) {
      console.error('Error deleting workspace:', err);
      throw err;
    }
  }, [currentWorkspace, workspaces]);

  const duplicateFilesToWorkspace = useCallback(async (fileIds: string[], targetWorkspaceId: string) => {
    try {
      // Get the files to duplicate
      const { data: filesToDuplicate, error: fetchError } = await supabase
        .from('files')
        .select('*')
        .in('id', fileIds);

      if (fetchError) {
        console.error('Error fetching files to duplicate:', fetchError);
        throw new Error(`Failed to fetch files: ${fetchError.message}`);
      }

      if (!filesToDuplicate || filesToDuplicate.length === 0) {
        throw new Error('No files found to duplicate');
      }

      // Create new file records with new IDs and target workspace
      const duplicatedFiles = filesToDuplicate.map(file => ({
        ...file,
        id: undefined, // Let database generate new ID
        workspace_id: targetWorkspaceId,
        name: `${file.name} (Copy)`,
        created_at: undefined,
        updated_at: undefined,
      }));

      const { error: insertError } = await supabase
        .from('files')
        .insert(duplicatedFiles);

      if (insertError) {
        console.error('Error inserting duplicated files:', insertError);
        throw new Error(`Failed to duplicate files: ${insertError.message}`);
      }

      console.log(`Successfully duplicated ${fileIds.length} files to workspace ${targetWorkspaceId}`);
    } catch (err) {
      console.error('Error duplicating files:', err);
      throw err;
    }
  }, []);

  const moveFilesToWorkspace = useCallback(async (fileIds: string[], targetWorkspaceId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ workspace_id: targetWorkspaceId })
        .in('id', fileIds);

      if (error) {
        console.error('Error moving files:', error);
        throw new Error(`Failed to move files: ${error.message}`);
      }

      console.log(`Successfully moved ${fileIds.length} files to workspace ${targetWorkspaceId}`);
    } catch (err) {
      console.error('Error moving files:', err);
      throw err;
    }
  }, []);

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    loading,
    error,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    duplicateFilesToWorkspace,
    moveFilesToWorkspace,
  };

  // Show loading fallback while loading
  if (loading || !initialized) {
    return <WorkspaceSelectFallback />;
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  
  // Return default context if used outside provider (prevents crashes)
  if (!context) {
    console.warn('useWorkspace must be used within a WorkspaceProvider. Returning default values.');
    return defaultWorkspaceContext;
  }
  
  return context;
};