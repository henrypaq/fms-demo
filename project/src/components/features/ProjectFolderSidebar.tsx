import React from 'react';
import { Home, ChevronRight, ChevronDown, FolderPlus, Move } from 'lucide-react';
import { RiFolder3Line } from '@remixicon/react';
import { Icon, IconSizes } from '../ui/Icon';

interface Folder {
  id: string;
  name: string;
  path: string;
  parent_folder_id: string | null;
  children?: Folder[];
}

interface ProjectFolderSidebarProps {
  folderTree: Folder[];
  currentFolder: Folder | null;
  expandedFolders: Set<string>;
  draggedItem: any;
  dragOverFolder: string | null;
  onSelectFolder: (folder: Folder | null) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  onDragStart: (e: React.DragEvent, folder: Folder) => void;
  onFolderContextMenu?: (e: React.MouseEvent, folder: Folder) => void;
}

export const ProjectFolderSidebar: React.FC<ProjectFolderSidebarProps> = ({
  folderTree,
  currentFolder,
  expandedFolders,
  draggedItem,
  dragOverFolder,
  onSelectFolder,
  onToggleFolder,
  onCreateFolder,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onFolderContextMenu,
}) => {
  const renderFolder = (folder: Folder, level = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolder?.id === folder.id;
    const isDragOver = dragOverFolder === folder.id;

    return (
      <div key={folder.id} className="select-none">
        <div
          draggable
          onDragStart={(e) => onDragStart(e, folder)}
          onDragOver={(e) => onDragOver(e, folder.id)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, folder.id)}
          onContextMenu={(e) => {
            console.log('📌 Folder right-clicked:', folder.name);
            e.preventDefault();
            e.stopPropagation();
            if (onFolderContextMenu) {
              console.log('✅ Calling onFolderContextMenu');
              onFolderContextMenu(e, folder);
            } else {
              console.warn('⚠️ onFolderContextMenu not provided!');
            }
          }}
          style={{ 
            paddingLeft: `${level * 16 + 12}px`,
            backgroundColor: isSelected ? 'rgba(26, 28, 58, 0.5)' : isDragOver ? '#059669' : 'transparent',
            color: '#CFCFF6',
            border: isSelected ? '1px solid rgba(96, 73, 227, 0.4)' : '1px solid transparent',
            transition: 'all 0.2s ease-out',
          }}
          onMouseEnter={(e) => {
            if (!isSelected && !isDragOver) {
              e.currentTarget.style.backgroundColor = 'rgba(26, 28, 58, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(96, 73, 227, 0.25)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected && !isDragOver) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }
          }}
          className="flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer group"
          onClick={() => onSelectFolder(folder)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-white/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          <Icon Icon={RiFolder3Line} size={16} className="flex-shrink-0" />
          <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
          {isDragOver && draggedItem && (
            <Move className="w-3 h-3 text-green-400 flex-shrink-0" />
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {folder.children!.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="w-[280px] bg-card/95 rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.3)] flex flex-col flex-shrink-0 overflow-hidden h-full" 
      style={{ pointerEvents: 'auto' }}
      onContextMenu={(e) => {
        console.log('🔍 Sidebar root context menu (should be prevented by child)');
      }}
    >
      <div className="p-4 border-b border-[#1A1C3A]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#CFCFF6]">Folders</h3>
          <button
            onClick={onCreateFolder}
            className="p-1.5 rounded-md text-[#8A8C8E] hover:text-[#CFCFF6] hover:bg-[#6049E3]/20 transition-colors duration-200"
            title="Create Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* Project Root */}
        <div
          style={{
            backgroundColor: !currentFolder ? 'rgba(96, 73, 227, 0.2)' : (dragOverFolder === null && draggedItem) ? '#059669' : 'transparent',
            border: !currentFolder ? '2px solid #6049E3' : (dragOverFolder === null && draggedItem) ? '2px solid #059669' : '2px solid transparent',
            color: '#CFCFF6',
            fontWeight: !currentFolder ? '500' : '400',
          }}
          onMouseEnter={(e) => {
            if (currentFolder && (!draggedItem || dragOverFolder !== null)) {
              e.currentTarget.style.backgroundColor = 'rgba(96, 73, 227, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(96, 73, 227, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentFolder && (!draggedItem || dragOverFolder !== null)) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }
          }}
          className="flex items-center space-x-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 mb-1"
          onClick={() => onSelectFolder(null)}
          onDragOver={(e) => onDragOver(e, null)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, null)}
        >
          <Home className="w-4 h-4" />
          <span className="text-sm font-medium">Project Root</span>
          {dragOverFolder === null && draggedItem && (
            <Move className="w-3 h-3 text-green-400" />
          )}
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {folderTree.map((folder) => renderFolder(folder))}
        </div>

        {folderTree.length === 0 && (
          <div className="text-center py-8">
            <Icon Icon={RiFolder3Line} size={IconSizes.card} color="#8A8C8E" className="mx-auto mb-2" />
            <p className="text-[#8A8C8E] text-sm">No folders yet</p>
            <button
              onClick={onCreateFolder}
              className="text-[#6049E3] hover:text-[#6049E3]/80 text-sm mt-1 font-medium"
            >
              Create your first folder
            </button>
          </div>
        )}
      </div>

      {/* Drag Instructions */}
      {draggedItem && (
        <div className="p-3 border-t border-[#1A1C3A] bg-[#6049E3]/10">
          <p className="text-xs text-[#CFCFF6] text-center">
            Drop on a folder or Project Root to move {draggedItem.type}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectFolderSidebar;


