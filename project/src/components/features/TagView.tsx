import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiPriceTag3Line, RiAddLine, RiDeleteBinLine, RiAlertLine, RiLoader4Line, RiInformationLine } from '@remixicon/react';
import { useFileData } from '../../hooks/useFileData';
import { getAllTags } from '../../hooks/useFileSearch';
import FileCard, { FileItem } from './FileCard';
import TagSidebar from './TagSidebar';
import { supabase } from '../../lib/supabase';
import { markFilesAsUpdated } from '../../contexts/WorkspaceContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu-shadcn';
import { getTagHexColor } from '../ui/TagBadge';

interface TagStats {
  tag: string;
  count: number;
  files: FileItem[];
  color?: string;
}

interface TagViewProps {
  className?: string;
  userRole?: 'admin' | 'employee';
  triggerCreateTag?: number;
}

const TagView: React.FC<TagViewProps> = ({ 
  className = '',
  userRole = 'admin',
  triggerCreateTag
}) => {
  const { currentWorkspace } = useWorkspace();
  const { files, updateFile, toggleFavorite, loading, error, refreshFiles } = useFileData();
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('count');
  const [filterType, setFilterType] = useState<'all' | 'used' | 'unused'>('all');
  
  // Listen for trigger to open create tag modal
  useEffect(() => {
    if (triggerCreateTag && triggerCreateTag > 0) {
      setShowAddTagModal(true);
    }
  }, [triggerCreateTag]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRenameTag, setShowRenameTag] = useState<string | null>(null);
  const [renameTagValue, setRenameTagValue] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [taggedFiles, setTaggedFiles] = useState<FileItem[]>([]);
  const [loadingTaggedFiles, setLoadingTaggedFiles] = useState(false);

  // Check permissions
  const canEditTags = userRole === 'admin';

  // Normalize tag name (lowercase, trim)
  const normalizeTag = (tag: string): string => {
    return tag.toLowerCase().trim();
  };

  // Fetch ALL files with selected tags from database
  const fetchTaggedFiles = async (tags: string[]) => {
    if (tags.length === 0 || !currentWorkspace) {
      setTaggedFiles([]);
      return;
    }

    setLoadingTaggedFiles(true);
    try {
      console.log('🔍 Fetching files with tags:', tags);
      
      // For PostgreSQL array contains query, we need to match any of the selected tags
      // Using the @> operator to check if the tags array contains the search tags
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to fetch tagged files:', error);
        throw error;
      }

      console.log('📦 Fetched files:', data?.length || 0);

      // Check if "(empty)" tag is selected
      const hasEmptyTag = tags.includes('(empty)');
      
      let filteredFiles;
      if (hasEmptyTag && tags.length === 1) {
        // Show only files with no tags
        filteredFiles = (data || []).filter(file => !file.tags || file.tags.length === 0);
        console.log('📭 Showing untagged files:', filteredFiles.length);
      } else {
        // Filter files that have ALL selected tags (case-insensitive)
        // Exclude "(empty)" from the normalized tags
        const normalizedSelectedTags = tags
          .filter(t => t !== '(empty)')
          .map((t: string) => normalizeTag(t));
        
        filteredFiles = (data || []).filter(file => {
          if (!file.tags || file.tags.length === 0) return false;
          const fileTags = file.tags.map((t: string) => normalizeTag(t));
          return normalizedSelectedTags.every((selTag: string) => fileTags.includes(selTag));
        });
        
        console.log('✅ Filtered files with all selected tags:', filteredFiles.length);
      }

      // Convert to FileItem format
      const fileItems: FileItem[] = filteredFiles.map(file => ({
        id: file.id,
        name: file.name,
        type: file.file_category as any,
        size: formatBytes(file.file_size),
        modifiedDate: new Date(file.updated_at || file.created_at).toLocaleDateString(),
        thumbnail: file.thumbnail_url,
        isFavorite: file.is_favorite,
        tags: file.tags || [],
        originalName: file.original_name,
        filePath: file.file_path,
        fileType: file.file_type,
        fileSize: file.file_size,
        fileUrl: file.file_url,
        workspaceId: file.workspace_id,
        projectId: file.project_id,
        folderId: file.folder_id
      }));

      setTaggedFiles(fileItems);
    } catch (err) {
      console.error('Failed to fetch tagged files:', err);
      setTaggedFiles([]);
    } finally {
      setLoadingTaggedFiles(false);
    }
  };

  // Helper to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Fetch tagged files when selected tags change
  useEffect(() => {
    fetchTaggedFiles(selectedTags);
  }, [selectedTags, currentWorkspace]);

  // Real-time subscription for file changes
  useEffect(() => {
    if (!currentWorkspace) return;

    console.log('📡 Setting up real-time subscription for tag changes');

    const channel = supabase
      .channel('tag-files-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'files',
          filter: `workspace_id=eq.${currentWorkspace.id}`
        },
        (payload) => {
          console.log('🔄 File change detected:', payload);
          // Re-fetch tagged files if we have selected tags
          if (selectedTags.length > 0) {
            fetchTaggedFiles(selectedTags);
          }
          // Also refresh the main files list for tag stats
          refreshFiles();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Cleaning up tag changes subscription');
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace, selectedTags, refreshFiles]);

  // Don't render if workspace is not available
  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
            <RiAlertLine className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="text-lg font-medium text-[#CFCFF6]">No Workspace Selected</h3>
          <p className="text-[#8A8C8E]">Please select a workspace to manage tags.</p>
        </div>
      </div>
    );
  }

  // Get all tags with statistics from files only
  const getTagStats = (): TagStats[] => {
    const fileTags = getAllTags(files);
    const tagStats: TagStats[] = [];

    fileTags.forEach(tag => {
      const normalizedTag = normalizeTag(tag);
      const tagFiles = files.filter(file => {
        return file.tags && file.tags.some(fileTag => normalizeTag(fileTag) === normalizedTag);
      });

      tagStats.push({
        tag,
        count: tagFiles.length,
        files: tagFiles,
        color: getTagHexColor(tag)
      });
    });

    // Add special "(empty)" tag for untagged files
    const untaggedFiles = files.filter(file => !file.tags || file.tags.length === 0);
    if (untaggedFiles.length > 0) {
      tagStats.push({
        tag: '(empty)',
        count: untaggedFiles.length,
        files: untaggedFiles,
        color: '#8A8C8E' // Gray color for empty tag
      });
    }

    // Apply filtering
    let filteredStats = tagStats;
    if (filterType === 'used') {
      filteredStats = tagStats.filter(stat => stat.count > 0);
    } else if (filterType === 'unused') {
      filteredStats = tagStats.filter(stat => stat.count === 0);
    }

    // Apply sorting
    filteredStats.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.tag.localeCompare(b.tag);
        case 'count':
          return b.count - a.count;
        case 'recent':
          const aLatest = Math.max(...a.files.map(f => new Date(f.modifiedDate).getTime()));
          const bLatest = Math.max(...b.files.map(f => new Date(f.modifiedDate).getTime()));
          return bLatest - aLatest;
        default:
          return 0;
      }
    });

    return filteredStats;
  };

  const handleAddTag = async () => {
    if (!canEditTags || !newTagName.trim()) {
      return;
    }

    setIsProcessing(true);
    try {
      const normalizedNewTag = normalizeTag(newTagName.trim());
      const allTags = getAllTags(files);
      const existingTag = allTags.find(tag => normalizeTag(tag) === normalizedNewTag);

      if (existingTag) {
        alert(`Tag "${existingTag}" already exists`);
        setIsProcessing(false);
        return;
      }

      const { error: fileError } = await supabase
        .from('files')
        .insert({
          name: `Tag: ${newTagName.trim()}`,
          original_name: `tag_${Date.now()}.txt`,
          file_path: `tags/${currentWorkspace.id}/${Date.now()}.txt`,
          file_type: 'text/plain',
          file_category: 'document',
          file_size: 0,
          tags: [newTagName.trim()],
          workspace_id: currentWorkspace.id,
          is_favorite: false
        })
        .select()
        .single();

      if (fileError) {
        throw new Error(`Failed to create tag: ${fileError.message}`);
      }

      setShowAddTagModal(false);
      setNewTagName('');
      await refreshFiles();
      
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert(`Failed to add tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRenameTag = async (oldTag: string, newTag: string) => {
    if (!canEditTags || !newTag.trim() || normalizeTag(oldTag) === normalizeTag(newTag)) return;

    const normalizedNewTag = normalizeTag(newTag.trim());
    const normalizedOldTag = normalizeTag(oldTag);

    const allTags = getAllTags(files);
    const existingTag = allTags.find(tag => 
      normalizeTag(tag) === normalizedNewTag && normalizeTag(tag) !== normalizedOldTag
    );

    if (existingTag) {
      if (window.confirm(`Tag "${existingTag}" already exists. Do you want to merge "${oldTag}" into "${existingTag}"?`)) {
        await handleMergeTags(oldTag, existingTag);
      }
      return;
    }

    setIsProcessing(true);
    try {
      const filesToUpdate = files.filter(file => 
        file.tags && file.tags.some(tag => normalizeTag(tag) === normalizedOldTag)
      );

      if (filesToUpdate.length > 0) {
        for (const file of filesToUpdate) {
          if (file.tags && file.tags.some(tag => normalizeTag(tag) === normalizedOldTag)) {
            const updatedTags = file.tags.map(tag => 
              normalizeTag(tag) === normalizedOldTag ? newTag.trim() : tag
            );
            
            const { error: updateError } = await supabase
              .from('files')
              .update({ tags: updatedTags })
              .eq('id', file.id);

            if (updateError) {
              throw new Error(`Failed to update file: ${updateError.message}`);
            }
          }
        }

        markFilesAsUpdated();
      }

      setShowRenameTag(null);
      await refreshFiles();
      // Re-fetch tagged files if we have any selected
      if (selectedTags.length > 0) {
        await fetchTaggedFiles(selectedTags);
      }
      
    } catch (error) {
      console.error('Failed to rename tag:', error);
      alert(`Failed to rename tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeTags = async (sourceTag: string, targetTag: string) => {
    if (!canEditTags) return;
    
    const normalizedSourceTag = normalizeTag(sourceTag);
    const normalizedTargetTag = normalizeTag(targetTag);

    if (normalizedSourceTag === normalizedTargetTag) return;

    setIsProcessing(true);
    try {
      const filesToUpdate = files.filter(file => 
        file.tags && file.tags.some(tag => normalizeTag(tag) === normalizedSourceTag)
      );

      if (filesToUpdate.length > 0) {
        for (const file of filesToUpdate) {
          if (file.tags && file.tags.some(tag => normalizeTag(tag) === normalizedSourceTag)) {
            let updatedTags = file.tags.filter(tag => normalizeTag(tag) !== normalizedSourceTag);
            
            if (!updatedTags.some(tag => normalizeTag(tag) === normalizedTargetTag)) {
              updatedTags.push(targetTag);
            }
            
            const { error: updateError } = await supabase
              .from('files')
              .update({ tags: updatedTags })
              .eq('id', file.id);

            if (updateError) {
              throw new Error(`Failed to update file: ${updateError.message}`);
            }
          }
        }

        markFilesAsUpdated();
      }

      await refreshFiles();
      // Re-fetch tagged files if we have any selected
      if (selectedTags.length > 0) {
        await fetchTaggedFiles(selectedTags);
      }
      
    } catch (error) {
      console.error('Failed to merge tags:', error);
      alert(`Failed to merge tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteTag = async (tagToDelete: string) => {
    if (!canEditTags) return;
    
    const normalizedTagToDelete = normalizeTag(tagToDelete);
    
    setIsProcessing(true);
    try {
      console.log('🗑️ Deleting tag:', { original: tagToDelete, normalized: normalizedTagToDelete, isEmpty: normalizedTagToDelete === '' });
      
      const filesToUpdate = files.filter(file => 
        file.tags && file.tags.some(tag => {
          const normalizedFileTag = normalizeTag(tag);
          // For empty tags, match both empty normalized tags AND exact empty/whitespace strings
          if (normalizedTagToDelete === '') {
            return normalizedFileTag === '' || tag.trim() === '';
          }
          return normalizedFileTag === normalizedTagToDelete;
        })
      );

      console.log('📝 Files to update:', filesToUpdate.length);

      if (filesToUpdate.length > 0) {
        for (const file of filesToUpdate) {
          if (file.tags) {
            // Filter out the tag to delete
            const updatedTags = file.tags.filter(tag => {
              const normalizedFileTag = normalizeTag(tag);
              // For empty tags, remove both empty normalized tags AND exact empty/whitespace strings
              if (normalizedTagToDelete === '') {
                return normalizedFileTag !== '' && tag.trim() !== '';
              }
              return normalizedFileTag !== normalizedTagToDelete;
            });
            
            console.log('🔄 Updating file:', file.name, 'from', file.tags.length, 'to', updatedTags.length, 'tags');
            
            const { error: updateError } = await supabase
              .from('files')
              .update({ tags: updatedTags })
              .eq('id', file.id);

            if (updateError) {
              console.error('❌ Update error:', updateError);
              throw new Error(`Failed to update file: ${updateError.message}`);
            }
          }
        }

        markFilesAsUpdated();
      } else {
        console.log('⚠️ No files found with this tag');
      }

      setShowDeleteConfirm(null);
      await refreshFiles();
      // Re-fetch tagged files if we have any selected
      if (selectedTags.length > 0) {
        await fetchTaggedFiles(selectedTags);
      }
      
      console.log('✅ Tag deleted successfully');
      
    } catch (error) {
      console.error('Failed to delete tag:', error);
      alert(`Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const tagStats = getTagStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <RiLoader4Line className="w-8 h-8 text-[#6049E3] animate-spin mx-auto" />
          <p className="text-[#8A8C8E]">Loading tags...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <RiAlertLine className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-[#CFCFF6]">Failed to load tags</h3>
          <p className="text-[#8A8C8E]">{error}</p>
        </div>
      </div>
    );
  }

  const handleTagSelect = (tag: string) => {
    const isSelected = selectedTags.some(selTag => normalizeTag(selTag) === normalizeTag(tag));
    if (isSelected) {
      setSelectedTags(selectedTags.filter(selTag => normalizeTag(selTag) !== normalizeTag(tag)));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleRenameTagStart = (tag: string) => {
    setShowRenameTag(tag);
    setRenameTagValue(tag);
  };

  return (
    <>
    <div className="flex gap-1 h-full overflow-hidden flex-1">
      {/* Tag Sidebar */}
      <TagSidebar
        tagStats={tagStats}
        selectedTags={selectedTags}
        tagSearch={tagSearch}
        onTagSearchChange={setTagSearch}
        onTagSelect={handleTagSelect}
        onAddTag={() => setShowAddTagModal(true)}
        onRenameTag={handleRenameTagStart}
        onDeleteTag={(tag) => setShowDeleteConfirm(tag)}
        canEditTags={canEditTags}
        showRenameTag={showRenameTag}
        renameTagValue={renameTagValue}
        onRenameTagValueChange={setRenameTagValue}
        onRenameTagSubmit={handleRenameTag}
        onRenameTagCancel={() => setShowRenameTag(null)}
        normalizeTag={normalizeTag}
      />

      {/* Main Content Area */}
      <div className="h-full raised-panel flex-1 mx-0 overflow-y-auto overflow-x-visible">
        {/* Top Bar - Filter Bar and Controls */}
        <div className="flex items-center justify-between py-2 border-b border-border mx-0 px-6 mb-4">
          {/* Left Side - Page Title */}
          <div className="flex items-center">
            <h1 className="text-lg font-medium text-foreground">
              {selectedTags.length > 0 
                ? `Files with ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} (${taggedFiles.length})`
                : 'Tagged Files'
              }
            </h1>
          </div>

          {/* Right Side - Filters and Controls */}
          <div className="flex items-center gap-3">
            {/* View Toggle (Grid only for now) */}
            <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs hover:bg-muted/50">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Grid
            </Button>

            {/* Tag Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs hover:bg-muted/50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {filterType === 'all' ? 'All Tags' : filterType === 'used' ? 'Used Tags' : 'Unused Tags'}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setFilterType('all')}>
                  All Tags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('used')}>
                  Used Tags
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType('unused')}>
                  Unused Tags
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 px-2 text-xs hover:bg-muted/50">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  Sort: {sortBy === 'count' ? 'Usage' : sortBy === 'name' ? 'Name' : 'Recent'}
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setSortBy('count')}>
                  Sort by Usage
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('name')}>
                  Sort by Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('recent')}>
                  Sort by Recent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        <div className={`px-6 pb-6 ${className}`}>
          {/* Employee Permission Notice */}
          {userRole === 'employee' && (
            <div className="p-4 bg-[#6049E3]/10 border border-[#6049E3]/20 rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <RiInformationLine className="w-5 h-5 text-[#6049E3] flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-[#6049E3] font-medium text-sm">Employee View Mode</p>
                  <p className="text-[#8A8C8E] text-xs">You can view tags and tagged files, but only administrators can edit tags.</p>
                </div>
              </div>
            </div>
          )}

          {/* Files List */}
          {selectedTags.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <RiPriceTag3Line className="w-12 h-12 mx-auto text-[#8A8C8E]" />
                <p className="text-[#8A8C8E]">Select one or more tags to view files with those tags.</p>
              </div>
            </div>
          ) : loadingTaggedFiles ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <RiLoader4Line className="w-8 h-8 text-[#6049E3] animate-spin mx-auto" />
                <p className="text-[#8A8C8E]">Loading tagged files...</p>
              </div>
            </div>
          ) : taggedFiles.length === 0 ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-4">
                <RiPriceTag3Line className="w-12 h-12 mx-auto text-[#8A8C8E]" />
                <p className="text-[#CFCFF6]">No files found with all selected tags</p>
                <p className="text-[#8A8C8E] text-sm">
                  Selected tags: {selectedTags.map(t => `"${t}"`).join(', ')}
                </p>
              </div>
            </div>
          ) : (
        <motion.div 
          className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 md:gap-5 gap-y-16 items-start overflow-visible"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.03
              }
            }
          }}
        >
          {taggedFiles.map((file) => (
            <motion.div
              key={file.id}
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { 
                  opacity: 1, 
                  scale: 1,
                  transition: {
                    duration: 0.15,
                    ease: "easeOut"
                  }
                }
              }}
            >
                  <FileCard
                    file={file}
                    onToggleFavorite={toggleFavorite}
                    onUpdate={async (fileId, updates) => {
                      await updateFile(fileId, updates);
                      // Re-fetch tagged files to show updated tags
                      await fetchTaggedFiles(selectedTags);
                    }}
                    userRole={userRole}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>

      {/* Add Tag Modal */}
      <Dialog open={showAddTagModal} onOpenChange={setShowAddTagModal}>
        <DialogContent className="bg-[#1A1C3A]/90 backdrop-blur-md border-[#2A2C45]/60">
          <DialogHeader>
            <DialogTitle className="text-[#CFCFF6]">Add New Tag</DialogTitle>
            <DialogDescription className="text-[#CFCFF6]/60">
              Create a new tag to organize your files.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tag-name" className="text-[#CFCFF6]/70">Tag Name</Label>
              <Input
                id="tag-name"
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name..."
                className="bg-[#1A1C3A]/40 border-[#2A2C45]/40 text-[#CFCFF6] placeholder-[#CFCFF6]/40 focus:ring-[#6049E3]/50 focus:border-[#6049E3]/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagName.trim()) {
                    handleAddTag();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAddTagModal(false);
                setNewTagName('');
              }}
              disabled={isProcessing}
              className="bg-[#1A1C3A]/60 hover:bg-[#1A1C3A] text-[#CFCFF6] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTag}
              disabled={!newTagName.trim() || isProcessing}
              variant="outline"
              className="border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white hover:border-[#6049E3] transition-all"
            >
              {isProcessing ? (
                <>
                  <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <RiAddLine className="w-4 h-4 mr-2" />
                  Create Tag
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tag Confirmation Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="bg-[#1A1C3A]/90 backdrop-blur-md border-[#2A2C45]/60">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center">
                <RiAlertLine className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-[#CFCFF6]">Delete Tag</DialogTitle>
                <DialogDescription className="text-[#CFCFF6]/60">This action cannot be undone</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <p className="text-[#CFCFF6] py-4">
            Are you sure you want to delete the tag <span className="font-medium text-white">"{showDeleteConfirm || '(empty)'}"</span>? 
            This will remove it from all files.
            {showDeleteConfirm?.trim() === '' && (
              <span className="block mt-2 text-sm text-yellow-400">
                ⚠️ This is an empty/invalid tag that should be removed.
              </span>
            )}
          </p>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(null)}
              disabled={isProcessing}
              className="bg-[#1A1C3A]/60 hover:bg-[#1A1C3A] text-[#CFCFF6] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={() => showDeleteConfirm && handleDeleteTag(showDeleteConfirm)}
              disabled={isProcessing}
              className="border-2 border-red-500 bg-red-500/20 text-[#CFCFF6] hover:bg-red-500/30 hover:text-white hover:border-red-500"
            >
              {isProcessing ? (
                <>
                  <RiLoader4Line className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <RiDeleteBinLine className="w-4 h-4 mr-2" />
                  Delete Tag
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TagView;
