import React, { useState, useEffect } from 'react';
import { 
  X, 
  Move, 
  Tag, 
  Plus, 
  Minus,
  Folder,
  Home,
  CheckCircle,
  AlertCircle,
  Loader,
  Star,
  Edit3,
  Download,
  Share2,
  Trash2
} from 'lucide-react';
import { FileItem } from './features/FileCard';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { supabase } from '../lib/supabase';

interface BatchActionBarProps {
  selectedFiles: FileItem[];
  onClearSelection: () => void;
  onBatchMove?: (fileIds: string[], projectId: string | null, folderId: string | null) => Promise<void>;
  onBatchAddTags?: (fileIds: string[], tags: string[]) => Promise<void>;
  onBatchRemoveTags?: (fileIds: string[], tags: string[]) => Promise<void>;
  onBatchToggleFavorite?: (fileIds: string[]) => Promise<void>;
  onBatchDownload?: (fileIds: string[]) => Promise<void>;
  onBatchShare?: (fileIds: string[]) => Promise<void>;
  onBatchDelete?: (fileIds: string[]) => Promise<void>;
  userRole?: 'admin' | 'employee';
  userProjectAccess?: string[];
  className?: string;
}

const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedFiles,
  onClearSelection,
  onBatchMove,
  onBatchAddTags,
  onBatchRemoveTags,
  onBatchToggleFavorite,
  onBatchDownload,
  onBatchShare,
  onBatchDelete,
  userRole = 'admin',
  userProjectAccess = [],
  className = ''
}) => {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string>('');
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allFolders, setAllFolders] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showMoveSuccess, setShowMoveSuccess] = useState(false);
  const [showDownloadSuccess, setShowDownloadSuccess] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  const { currentWorkspace } = useWorkspace();

  // Load all projects and folders when move modal is opened
  useEffect(() => {
    if (showMoveModal && currentWorkspace?.id) {
      loadAllProjectsAndFolders();
    }
  }, [showMoveModal, currentWorkspace]);

  const loadAllProjectsAndFolders = async () => {
    if (!currentWorkspace?.id) return;

    setLoadingProjects(true);
    try {
      // Load all projects for current workspace
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (projectsError) {
        console.error('Error loading projects:', projectsError);
        setAllProjects([]);
      } else {
        setAllProjects(projectsData || []);
      }

      // Load all folders for all projects in workspace
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select(`
          *,
          project:projects!inner(workspace_id)
        `)
        .eq('project.workspace_id', currentWorkspace.id)
        .order('path');

      if (foldersError) {
        console.error('Error loading folders:', foldersError);
        setAllFolders([]);
      } else {
        setAllFolders(foldersData || []);
      }

    } catch (error) {
      console.error('Error loading projects and folders:', error);
      setAllProjects([]);
      setAllFolders([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Filter projects based on user access
  const accessibleProjects = userRole === 'admin' 
    ? allProjects 
    : allProjects.filter(p => userProjectAccess?.includes(p.id));

  const handleBatchMove = async (projectId: string | null, folderId: string | null) => {
    if (!onBatchMove) return;

    setIsProcessing(true);
    setProcessingAction('Moving files...');
    
    try {
      const fileIds = selectedFiles.map(f => f.id);
      await onBatchMove(fileIds, projectId, folderId);
      
      setShowMoveSuccess(true);
      setTimeout(() => {
        setShowMoveSuccess(false);
        setShowMoveModal(false);
        onClearSelection();
      }, 2000);
    } catch (error) {
      console.error('Batch move failed:', error);
      alert('Failed to move files. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleBatchDownload = async () => {
    setIsProcessing(true);
    setProcessingAction('Preparing downloads...');
    
    try {
      // Download each file individually
      for (const file of selectedFiles) {
        try {
          const { data, error } = await supabase.storage
            .from('files')
            .download(file.filePath);

          if (error) throw error;

          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.originalName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Small delay between downloads to prevent browser issues
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error(`Error downloading file ${file.name}:`, error);
        }
      }
      
      setShowDownloadSuccess(true);
      setTimeout(() => {
        setShowDownloadSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Batch download failed:', error);
      alert('Failed to download files. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const handleBatchDelete = async () => {
    if (!onBatchDelete || userRole !== 'admin') return;

    setIsProcessing(true);
    setProcessingAction('Deleting files...');
    
    try {
      const fileIds = selectedFiles.map(f => f.id);
      await onBatchDelete(fileIds);
      
      setShowDeleteSuccess(true);
      setTimeout(() => {
        setShowDeleteSuccess(false);
        setShowDeleteConfirm(false);
        onClearSelection();
      }, 2000);
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('Failed to delete files. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingAction('');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getTotalSize = () => {
    const totalBytes = selectedFiles.reduce((sum, file) => sum + file.fileSize, 0);
    return formatFileSize(totalBytes);
  };

  if (selectedFiles.length === 0) return null;

  return (
    <>
      {/* Floating Action Bar */}
      <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
        <div className="bg-[#111111]/90 backdrop-blur-md border border-[#2A2A2A]/60 rounded-xl shadow-2xl p-4 min-w-96">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#00C28C]/20 border border-[#00C28C]/40 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#00C28C]" />
              </div>
              <div>
                <h3 className="text-[#CFCFF6] font-medium">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </h3>
                <p className="text-[#CFCFF6]/60 text-sm">Total size: {getTotalSize()}</p>
              </div>
            </div>
            <button
              onClick={onClearSelection}
              disabled={isProcessing}
              className="p-2 rounded-lg text-[#CFCFF6]/60 hover:text-white hover:bg-[#22243E] transition-colors duration-200 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="mb-4 p-3 bg-[#00C28C]/10 border border-[#00C28C]/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <Loader className="w-5 h-5 text-[#00C28C] animate-spin" />
                <span className="text-[#00C28C] font-medium">{processingAction}</span>
              </div>
            </div>
          )}

          {/* Success Messages */}
          {showMoveSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Files moved successfully!</span>
              </div>
            </div>
          )}

          {showDownloadSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Files downloaded successfully!</span>
              </div>
            </div>
          )}

          {showDeleteSuccess && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Files deleted successfully!</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {/* Move */}
            <button
              onClick={() => setShowMoveModal(true)}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-4 py-2 bg-[#111111]/60 hover:bg-[#111111] disabled:opacity-50 text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-all duration-200"
            >
              <Move className="w-4 h-4" />
              <span>Move</span>
            </button>

            {/* Download */}
            <button
              onClick={handleBatchDownload}
              disabled={isProcessing}
              className="flex items-center space-x-2 px-4 py-2 border-2 border-[#00C28C] bg-[#00C28C]/20 disabled:opacity-50 text-[#CFCFF6] hover:bg-[#00C28C]/30 hover:text-white rounded-lg font-medium transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            {/* Delete - Only for admins */}
            {userRole === 'admin' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-4 py-2 border-2 border-red-500 bg-red-500/20 disabled:opacity-50 text-[#CFCFF6] hover:bg-red-500/30 hover:text-white rounded-lg font-medium transition-all duration-200"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-[#111111]/90 backdrop-blur-md border border-[#2A2A2A]/60 rounded-xl shadow-2xl w-full max-w-md max-h-96 overflow-hidden">
            <div className="p-4 border-b border-[#2A2A2A]/40">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-[#CFCFF6]">Move Files</h3>
                <button
                  onClick={() => setShowMoveModal(false)}
                  className="text-[#CFCFF6]/60 hover:text-white transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[#CFCFF6]/60 text-sm mt-1">Choose destination for {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#00C28C] border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-[#CFCFF6]/60">Loading projects...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Workspace Root Option */}
                  <button
                    onClick={() => handleBatchMove(null, null)}
                    disabled={isProcessing}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-[#CFCFF6] hover:bg-[#22243E] hover:text-white disabled:opacity-50"
                  >
                    <Home className="w-4 h-4" />
                    <span>Workspace Root</span>
                  </button>

                  {/* Projects and Folders */}
                  {accessibleProjects.map((project) => {
                    const projectFolders = allFolders.filter(f => f.project_id === project.id);
                    
                    return (
                      <div key={project.id} className="space-y-1">
                        {/* Project Root */}
                        <button
                          onClick={() => handleBatchMove(project.id, null)}
                          disabled={isProcessing}
                          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-[#CFCFF6] hover:bg-[#22243E] hover:text-white disabled:opacity-50"
                        >
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: project.color }}
                          />
                          <span className="truncate">{project.name}</span>
                        </button>

                        {/* Project Folders */}
                        {projectFolders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => handleBatchMove(project.id, folder.id)}
                            disabled={isProcessing}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ml-4 text-[#CFCFF6] hover:bg-[#22243E] hover:text-white disabled:opacity-50"
                          >
                            <Folder className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{folder.name}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}

                  {accessibleProjects.length === 0 && !loadingProjects && (
                    <div className="text-center py-4">
                      <Folder className="w-8 h-8 text-[#CFCFF6]/30 mx-auto mb-2" />
                      <p className="text-[#CFCFF6]/50 text-xs">No accessible projects</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-[#111111]/90 backdrop-blur-md border border-[#2A2A2A]/60 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#CFCFF6]">Delete Files</h3>
                  <p className="text-[#CFCFF6]/60 text-sm">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-[#CFCFF6]/80 mb-6">
                Are you sure you want to delete <span className="font-medium text-[#CFCFF6]">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}</span>?
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={handleBatchDelete}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 border-2 border-red-500 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-all duration-200"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    "Delete Files"
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#111111]/60 hover:bg-[#111111] disabled:opacity-50 text-[#CFCFF6] hover:text-white rounded-lg font-medium transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BatchActionBar;