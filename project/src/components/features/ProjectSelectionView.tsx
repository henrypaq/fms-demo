import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  X, 
  Palette,
  Save,
  Loader,
  ArrowRight,
  Edit3,
  Trash2,
  Edit,
  Settings
} from 'lucide-react';
import { RiFolder3Line, RiMoreFill } from '@remixicon/react';
import { Icon, IconSizes, IconColors } from '../ui/Icon';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu-shadcn';
import { AssetBar } from './AssetBar';

interface ProjectSelectionViewProps {
  onProjectSelect: (project: any) => void;
}

// Create Project Modal Component
const CreateProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#1E40AF');

  const colors = [
    '#1E40AF', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      color
    });

    setName('');
    setDescription('');
    setColor('#E74A3F');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1C3A]/90 backdrop-blur-md border border-[#2A2C45]/60 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#CFCFF6]">Create Project</h3>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-10 w-10">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full px-3 py-2 bg-[#1A1C3A]/40 border border-[#2A2C45]/40 rounded-lg text-[#CFCFF6] placeholder-[#CFCFF6]/40 focus:outline-none focus:ring-2 focus:ring-[#6049E3]/50 focus:border-[#6049E3]/50"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
                className="w-full px-3 py-2 bg-[#1A1C3A]/40 border border-[#2A2C45]/40 rounded-lg text-[#CFCFF6] placeholder-[#CFCFF6]/40 focus:outline-none focus:ring-2 focus:ring-[#6049E3]/50 focus:border-[#6049E3]/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">
                <Palette className="w-4 h-4 inline mr-1" />
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setColor(colorOption)}
                    className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                      color === colorOption
                        ? 'ring-2 ring-light-text ring-offset-2 ring-offset-dark-surface scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorOption }}
                  />
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>Create Project</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[#1A1C3A]/60 hover:bg-[#1A1C3A] text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Edit Project Modal Component
const EditProjectModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData: any;
}> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [color, setColor] = useState(initialData?.color || '#1E40AF');

  useEffect(() => {
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
    setColor(initialData?.color || '#1E40AF');
  }, [initialData]);

  const colors = [
    '#1E40AF', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F43F5E'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      ...initialData,
      name: name.trim(),
      description: description.trim(),
      color
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1C3A]/90 backdrop-blur-md border border-[#2A2C45]/60 rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-[#CFCFF6]">Edit Project</h3>
            <Button onClick={onClose} variant="ghost" size="icon" className="h-10 w-10">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">Project Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name..."
                className="w-full px-3 py-2 bg-[#1A1C3A]/40 border border-[#2A2C45]/40 rounded-lg text-[#CFCFF6] placeholder-[#CFCFF6]/40 focus:outline-none focus:ring-2 focus:ring-[#6049E3]/50 focus:border-[#6049E3]/50"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description..."
                rows={3}
                className="w-full px-3 py-2 bg-[#1A1C3A]/40 border border-[#2A2C45]/40 rounded-lg text-[#CFCFF6] placeholder-[#CFCFF6]/40 focus:outline-none focus:ring-2 focus:ring-[#6049E3]/50 focus:border-[#6049E3]/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#CFCFF6]/70 mb-2">
                <Palette className="w-4 h-4 inline mr-1" />
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colors.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    onClick={() => setColor(colorOption)}
                    className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                      color === colorOption
                        ? 'ring-2 ring-light-text ring-offset-2 ring-offset-dark-surface scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: colorOption }}
                  />
                ))}
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-light-text hover:bg-light-text/90 disabled:bg-dark-surface disabled:cursor-not-allowed text-dark-bg rounded-lg font-medium transition-colors duration-200"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-dark-surface hover:bg-dark-bg text-light-text rounded-lg font-medium transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const ProjectSelectionView: React.FC<ProjectSelectionViewProps> = ({ onProjectSelect, triggerCreateProject }) => {
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);
  const [editProjectData, setEditProjectData] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteProjectData, setDeleteProjectData] = useState<any>(null);
  
  // Listen for trigger to open create project modal
  useEffect(() => {
    if (triggerCreateProject && triggerCreateProject > 0) {
      setShowCreateProject(true);
    }
  }, [triggerCreateProject]);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<Set<string>>(new Set());

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedProjectIds.size === projects.length && projects.length > 0) {
      // Deselect all
      setSelectedProjectIds(new Set());
    } else {
      // Select all
      setSelectedProjectIds(new Set(projects.map(p => p.id)));
    }
  }, [projects, selectedProjectIds]);

  const allSelected = projects.length > 0 && selectedProjectIds.size === projects.length;
  const someSelected = selectedProjectIds.size > 0 && selectedProjectIds.size < projects.length;

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadProjects();
    }
  }, [currentWorkspace]);

  const loadProjects = async () => {
    if (!currentWorkspace?.id) return;
    try {
      setLoading(true);
      setError(null);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (projectsError) throw projectsError;

      setProjects(projectsData || []);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: any) => {
    if (!currentWorkspace?.id) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...projectData,
          workspace_id: currentWorkspace.id
        }])
        .select()
        .single();

      if (error) throw error;

      setProjects(prev => [...prev, data]);
      setShowCreateProject(false);
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const updateProject = async (projectData: any) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: projectData.name,
          description: projectData.description,
          color: projectData.color
        })
        .eq('id', projectData.id)
        .select()
        .single();
      if (error) throw error;
      setProjects(prev => prev.map(p => p.id === data.id ? data : p));
      setShowEditProject(false);
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };
  const deleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      if (error) throw error;
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  };


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-dark-bg">
        <div className="text-center">
          <Loader className="w-8 h-8 text-light-text animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center h-full bg-dark-bg">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Projects</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={loadProjects}
            className="px-4 py-2 bg-light-text hover:bg-light-text/90 text-dark-bg rounded-lg font-medium transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Assets Bar */}
      <AssetBar
        assetCount={projects.length}
        totalSize={0}
        assetType="Projects"
        isCollapsed={projectsCollapsed}
        onToggleCollapse={() => setProjectsCollapsed(!projectsCollapsed)}
        showTagsToggle={false}
        allSelected={allSelected}
        someSelected={someSelected}
        onSelectAll={handleSelectAll}
      />
      
      {/* Projects Grid - Aligned with Files page */}
      <div 
        className="pt-2 transition-all duration-300 ease-in-out"
        style={{
          maxHeight: projectsCollapsed ? '0px' : '100000px',
          opacity: projectsCollapsed ? 0 : 1,
          overflow: projectsCollapsed ? 'hidden' : 'visible'
        }}
      >
      <div className="px-6 pb-4 overflow-visible">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 gap-y-10 items-start pb-12">
          {/* Existing Projects */}
          {projects.map((project) => (
            <div
              key={project.id}
              className="group transition-all duration-200 ease-out cursor-pointer relative folder-card hover:scale-[1.02] hover:brightness-110"
              style={{
                background: '#111235',
                maskImage: 'url(/folder-shape.svg)',
                maskSize: 'cover',
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskImage: 'url(/folder-shape.svg)',
                WebkitMaskSize: 'cover',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                filter: 'drop-shadow(0 0 0 1px hsl(240, 25%, 15%)) drop-shadow(0 2px 8px rgba(0,0,0,0.35))',
                transition: 'filter 0.2s ease-out, transform 0.2s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 0 0 2px #6049E3) drop-shadow(0 6px 16px rgba(96, 73, 227, 0.5))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'drop-shadow(0 0 0 1px hsl(240, 25%, 15%)) drop-shadow(0 2px 8px rgba(0,0,0,0.35))';
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🖱️ Project card clicked:', project.name);
                console.log('🖱️ Calling onProjectSelect callback...');
                onProjectSelect(project);
                console.log('✅ onProjectSelect callback called');
              }}
            >
              {/* Large Image Area - covers most of the folder */}
              <div className="relative w-full h-full flex flex-col">
                {/* Main image/content area */}
                <div className="relative flex-1 overflow-hidden">
                  {/* Project thumbnail/image placeholder */}
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: project.color + '20' }}
                  >
                    <Icon
                      Icon={RiFolder3Line}
                      size={IconSizes.card}
                      color={project.color}
                      className="w-16 h-16"
                    />
                  </div>
                </div>

                {/* Floating details section - positioned at bottom */}
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-background/95 to-transparent backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200 mb-1">
                        {project.name}
                      </h3>
                      <div className="text-xs text-muted-foreground">
                        {project.size || '0 MB'}
                      </div>
                    </div>
                    
                    {/* 3-dots menu button */}
                    <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="p-2 rounded-lg bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-primary hover:bg-background/90 transition-colors duration-200"
                          >
                            <Icon Icon={RiMoreFill} size={IconSizes.small} color={IconColors.muted} className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                            <Settings className="w-4 h-4 mr-2" />
                            Project Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add New Project Card */}
          <div
            onClick={() => setShowCreateProject(true)}
            className="group transition-all duration-200 cursor-pointer flex flex-col items-center justify-center folder-card hover:scale-[1.02]"
            style={{
              background: '#111235',
              maskImage: 'url(/folder-shape.svg)',
              maskSize: 'cover',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskImage: 'url(/folder-shape.svg)',
              WebkitMaskSize: 'cover',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              filter: 'drop-shadow(0 0 0 2px #6049E3) drop-shadow(0 2px 8px rgba(96, 73, 227, 0.3))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'drop-shadow(0 0 0 2px #6049E3) drop-shadow(0 4px 12px rgba(96, 73, 227, 0.5))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'drop-shadow(0 0 0 2px #6049E3) drop-shadow(0 2px 8px rgba(96, 73, 227, 0.3))';
            }}
          >
            <div className="relative w-full h-full flex flex-col">
              {/* Main image/content area */}
              <div className="relative flex-1 overflow-hidden">
                {/* Add project placeholder */}
                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-200">
                    <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                  </div>
                </div>
              </div>

              {/* Floating details section - positioned at bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-background/95 to-transparent backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-200 mb-1">
                      New Project
                    </h3>
                    <div className="text-xs text-muted-foreground">
                      Create new project
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onSubmit={createProject}
      />
      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditProject}
        onClose={() => setShowEditProject(false)}
        onSubmit={updateProject}
        initialData={editProjectData}
      />
      {/* Delete Project Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-surface border border-dark-surface rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-4">Delete Project</h3>
              <p className="text-slate-400 mb-6">Are you sure you want to delete the project <span className="text-white font-semibold">{deleteProjectData?.name}</span>? This action cannot be undone.</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteProject(deleteProjectData.id)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelectionView;