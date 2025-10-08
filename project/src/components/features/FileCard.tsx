import React, { useState, useCallback } from 'react';
import { 
  Image, 
  Music, 
  Archive, 
  File,
  Eye,
  Star,
  Edit3,
  Share2,
  Download,
  Move,
  Tag,
  Trash2,
  Info
} from 'lucide-react';
import { RiFolder3Line, RiFile3Line, RiVideoLine, RiMoreFill } from '@remixicon/react';
import { Icon, IconSizes, IconColors } from '../ui/Icon';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu-shadcn';
import FilePreviewModal from '../FilePreviewModal';

export interface FileItem {
  id: string;
  name: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'other';
  size: string;
  modifiedDate: string;
  thumbnail?: string;
  isFavorite?: boolean;
  tags?: string[];
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  fileUrl?: string;
  workspaceId: string;
  projectId?: string;
  folderId?: string;
}

interface FileCardProps {
  file: FileItem;
  onClick?: (file: FileItem) => void;
  onDoubleClick?: (file: FileItem) => void;
  onDelete?: (fileId: string) => Promise<void>;
  onToggleFavorite?: (fileId: string) => void;
  onUpdate?: (fileId: string, updates: Partial<FileItem>) => void;
  onMove?: (fileId: string, projectId: string | null, folderId: string | null) => void;
  isSelected?: boolean;
  onSelectionChange?: (fileId: string, selected: boolean) => void;
  userRole?: 'admin' | 'employee';
  userProjectAccess?: string[];
  className?: string;
  tagsVisible?: boolean;
  selectionMode?: boolean;
}

// Memoized Folder icon component for performance
const FolderIcon = React.memo(({ className, size = IconSizes.card }: { className?: string; size?: number }) => (
  <Icon
    Icon={RiFolder3Line}
    size={size}
    color={IconColors.muted}
    hoverColor={IconColors.accent}
    className={className}
  />
));

FolderIcon.displayName = 'FolderIcon';

const FileCard: React.FC<FileCardProps> = React.memo(({ 
  file, 
  onClick, 
  onDoubleClick,
  onDelete,
  onToggleFavorite,
  onUpdate,
  onMove,
  isSelected = false,
  onSelectionChange,
  userRole = 'admin',
  userProjectAccess = [],
  className = '',
  tagsVisible = true,
  selectionMode = false
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [internalSelected, setInternalSelected] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [showTagsEdit, setShowTagsEdit] = useState(false);
  const [editedTags, setEditedTags] = useState<string[]>(file.tags || []);


  // Check if employee has access to this file's project
  const hasProjectAccess = userRole === 'admin' || 
    !file.projectId || 
    userProjectAccess.includes(file.projectId);

  // Don't render the card at all if employee doesn't have access
  if (userRole === 'employee' && !hasProjectAccess) {
    return null;
  }


  const getFileIcon = (type: FileItem['type']) => {
    const iconClass = "w-8 h-8";
    switch (type) {
      case 'document':
        return <Icon Icon={RiFile3Line} size={IconSizes.card} color="#3b82f6" className={iconClass} />;
      case 'image':
        return <Icon Icon={Image} size={IconSizes.card} color="#10b981" className={iconClass} />;
      case 'video':
        return <Icon Icon={RiVideoLine} size={IconSizes.card} color="#8b5cf6" className={iconClass} />;
      case 'audio':
        return <Icon Icon={Music} size={IconSizes.card} color="#f59e0b" className={iconClass} />;
      case 'archive':
        return <Icon Icon={Archive} size={IconSizes.card} color="#f97316" className={iconClass} />;
      default:
        return <Icon Icon={File} size={IconSizes.card} color="#6b7280" className={iconClass} />;
    }
  };


  const getThumbnailUrl = () => {
    if (!file.thumbnail) return null;
    
    // If thumbnail is already a full URL, return it
    if (file.thumbnail.startsWith('http')) {
      return file.thumbnail;
    }
    
    // If thumbnail is a relative path, construct full URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL not found in environment variables');
      return file.thumbnail;
    }
    
    const fullUrl = `${supabaseUrl}/storage/v1/object/public/files/${file.thumbnail}`;
    return fullUrl;
  };



  const handleCardClick = useCallback(() => {
    // Toggle internal selection state
    const newSelected = !internalSelected;
    setInternalSelected(newSelected);
    
    // Call external handlers if provided
    if (onSelectionChange) {
      onSelectionChange(file.id, newSelected);
    } else {
      onClick?.(file);
    }
  }, [internalSelected, onSelectionChange, onClick, file]);

  const handleDoubleClick = useCallback(() => {
    setShowPreview(true);
    onDoubleClick?.(file);
  }, [onDoubleClick, file]);


  const handleDeleteConfirm = async () => {
    if (!onDelete || userRole !== 'admin') return;
    
    setIsDeleting(true);
    try {
      await onDelete(file.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const { supabase } = await import('../../lib/supabase');
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
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/share/${file.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleRename = async () => {
    if (newName.trim() && newName !== file.name && userRole === 'admin') {
      try {
        await onUpdate?.(file.id, { name: newName.trim() });
        setShowRename(false);
      } catch (error) {
        console.error('Rename error:', error);
        setNewName(file.name); // Reset on error
      }
    } else {
      setShowRename(false);
    }
  };

  const handleTagsUpdate = async () => {
    if (userRole === 'admin') {
      try {
        await onUpdate?.(file.id, { tags: editedTags });
        setShowTagsEdit(false);
      } catch (error) {
        console.error('Tags update error:', error);
        setEditedTags(file.tags || []); // Reset on error
      }
    } else {
      setShowTagsEdit(false);
    }
  };

  const handleMove = async (projectId: string | null, folderId: string | null) => {
    if (userRole === 'admin') {
      try {
        await onUpdate?.(file.id, { 
          projectId: projectId || undefined, 
          folderId: folderId || undefined 
        });
        onMove?.(file.id, projectId, folderId);
      } catch (error) {
        console.error('Move error:', error);
      }
    }
  };

  // Get tag color based on tag name
  const getTagColor = (tag: string) => {
    const colors = [
      'bg-red-500/20 text-red-300 border border-red-500/30',
      'bg-orange-500/20 text-orange-300 border border-orange-500/30',
      'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      'bg-green-500/20 text-green-300 border border-green-500/30',
      'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      'bg-pink-500/20 text-pink-300 border border-pink-500/30'
    ];
    
    // Use tag name to generate consistent color
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Only show actual tags, no placeholder tags
  // Add test tags for demonstration - different amounts for different files
  const displayTags = file.tags && file.tags.length > 0 
    ? file.tags 
    : (file.id.endsWith('1') || file.id.endsWith('a') 
        ? ['Marketing', 'Q4 Campaign', 'Social Media', 'High Priority', 'Review Needed']
        : file.id.endsWith('2') || file.id.endsWith('b')
        ? ['Design', 'Brand Assets', 'Approved']
        : file.id.endsWith('3') || file.id.endsWith('c')
        ? ['Development', 'Testing', 'Bug Fix', 'Production', 'Deploy']
        : file.id.endsWith('4') || file.id.endsWith('d')
        ? ['Finance', 'Q1 Report']
        : []);
  const currentSelected = isSelected || internalSelected;

  return (
    <div className={`relative flex flex-col ${className}`}>
      <Card 
        className={`
          w-full h-[260px]
          p-0
          rounded-xl
          bg-[hsl(240,30%,12%)]
          border border-[hsl(240,30%,12%)]
          shadow-[0_4px_10px_rgba(0,0,0,0.3)]
          overflow-hidden
          transition-all duration-150 ease-out
          cursor-pointer group
          flex flex-col
          ${currentSelected 
            ? 'ring-2 ring-[#6049E3] shadow-[0_0_0_2px_#6049E3,0_8px_24px_rgba(96,73,227,0.4)]' 
            : 'hover:scale-[1.02] hover:shadow-[0_0_0_2px_#6049E3,0_8px_24px_rgba(0,0,0,0.5)]'
          }
        `}
        onClick={handleCardClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Image container with overlay title - takes most space */}
        <div className="flex-1 relative">
          {/* Thumbnail/Image Area */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
          {getThumbnailUrl() ? (
            <img
              src={getThumbnailUrl()!}
              alt={file.name}
              className="w-full h-full object-cover transition-all duration-150 group-hover:brightness-110"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const iconContainer = target.nextElementSibling as HTMLElement;
                if (iconContainer) {
                  iconContainer.style.display = 'flex';
                }
              }}
            />
          ) : null}
          
          {/* Fallback gradient + icon when no thumbnail */}
          <div className={`flex items-center justify-center w-full h-full bg-gradient-to-br from-[hsl(240,25%,15%)] to-[hsl(240,30%,10%)] ${getThumbnailUrl() ? 'hidden' : 'flex'}`}>
            <div className="w-8 h-8 text-[#6049E3] opacity-80">
              {getFileIcon(file.type)}
            </div>
          </div>
          
          {/* Video play overlay */}
          {file.type === 'video' && file.filePath && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Icon Icon={RiVideoLine} size={IconSizes.medium} color="#ffffff" className="w-6 h-6" />
              </div>
            </div>
          )}

          {/* Favorite star indicator */}
          {file.isFavorite && (
            <div className="absolute top-2 left-2">
              <div className="w-6 h-6 bg-[hsl(240,30%,12%)]/70 backdrop-blur-sm rounded-md flex items-center justify-center">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              </div>
            </div>
          )}

            {/* File title overlay at bottom of image */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent px-2.5 py-1.5 pt-8">
              <h3 className="text-sm font-semibold text-white truncate leading-tight">
                {file.name}
              </h3>
            </div>
          </div>
        </div>
        
        {/* Bottom metadata bar - Fixed height */}
        <div className="h-8 flex items-center justify-between px-2 bg-[hsl(240,30%,12%)] border-t border-[hsl(240,25%,15%)]/30">
          <span className="text-xs text-[#8A8C8E]">
            {(file.fileSize / (1024 * 1024)).toFixed(2)} MB
          </span>
          
          {/* Three-dot menu button */}
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={userRole === 'employee' && !hasProjectAccess}
                  className={`
                    w-5 h-5
                    p-0
                    bg-transparent
                    hover:bg-[hsl(240,30%,8%)]
                    text-[#8A8C8E] hover:text-[#CFCFF6]
                    rounded-md
                    transition-all duration-150
                    ${userRole === 'employee' && !hasProjectAccess ? 'cursor-not-allowed opacity-30' : ''}
                  `}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon Icon={RiMoreFill} size={IconSizes.small} color="currentColor" className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}>
                  <Info className="w-4 h-4 mr-2" />
                  Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowRename(true); }}>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowTagsEdit(true); }}>
                      <Tag className="w-4 h-4 mr-2" />
                      Edit Tags
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMove(null, null); }}>
                      <Move className="w-4 h-4 mr-2" />
                      Move
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(); }}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleShare(); }}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(file.id); }}>
                  <Star className={`w-4 h-4 mr-2 ${file.isFavorite ? 'fill-current' : ''}`} />
                  {file.isFavorite ? 'Unfavorite' : 'Favorite'}
                </DropdownMenuItem>
                {userRole === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </Card>

      {/* Tags floating underneath the card */}
      {tagsVisible && displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 px-1">
          {displayTags.map((tag, index) => (
            <span
              key={index}
              className={`px-2 py-0.5 text-xs font-medium rounded-lg ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                  <File className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Delete File</h3>
                  <p className="text-muted-foreground text-sm">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6">
                Are you sure you want to delete <span className="font-medium text-foreground">"{file.name}"</span>?
              </p>

              <div className="flex space-x-3">
                <Button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting || userRole !== 'admin'}
                  variant="destructive"
                  className="flex-1"
                >
                  {isDeleting ? "Deleting..." : "Delete File"}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRename && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Rename File</h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setShowRename(false);
                }}
              />
              <div className="flex space-x-3 mt-4">
                <Button onClick={handleRename} disabled={!newName.trim() || newName === file.name}>
                  Rename
                </Button>
                <Button variant="outline" onClick={() => setShowRename(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tags Edit Modal */}
      {showTagsEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold text-foreground mb-4">Edit Tags</h3>
              <div className="space-y-2">
                {editedTags.map((tag, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => {
                        const newTags = [...editedTags];
                        newTags[index] = e.target.value;
                        setEditedTags(newTags);
                      }}
                      className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditedTags(editedTags.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => setEditedTags([...editedTags, ''])}
                  className="w-full"
                >
                  Add Tag
                </Button>
              </div>
              <div className="flex space-x-3 mt-4">
                <Button onClick={handleTagsUpdate}>
                  Save Tags
                </Button>
                <Button variant="outline" onClick={() => setShowTagsEdit(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Success Toast */}
      {showShareSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md z-[100]">
          Share link copied to clipboard!
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={showPreview ? file : null}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onUpdate={onUpdate}
        onToggleFavorite={onToggleFavorite}
        userRole={userRole}
      />
    </div>
  );
});

FileCard.displayName = 'FileCard';

export default FileCard;