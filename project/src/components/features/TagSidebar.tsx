import React from 'react';
import { RiPriceTag3Line, RiAddLine, RiEditLine, RiDeleteBinLine, RiMore2Fill, RiSearchLine } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu-shadcn';
import { TagBadge } from '../ui/TagBadge';

interface TagStats {
  tag: string;
  count: number;
  files: any[];
  color?: string;
}

interface TagSidebarProps {
  tagStats: TagStats[];
  selectedTags: string[];
  tagSearch: string;
  onTagSearchChange: (search: string) => void;
  onTagSelect: (tag: string) => void;
  onAddTag: () => void;
  onRenameTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
  canEditTags: boolean;
  showRenameTag: string | null;
  renameTagValue: string;
  onRenameTagValueChange: (value: string) => void;
  onRenameTagSubmit: (oldTag: string, newTag: string) => void;
  onRenameTagCancel: () => void;
  normalizeTag: (tag: string) => string;
}

export const TagSidebar: React.FC<TagSidebarProps> = ({
  tagStats,
  selectedTags,
  tagSearch,
  onTagSearchChange,
  onTagSelect,
  onAddTag,
  onRenameTag,
  onDeleteTag,
  canEditTags,
  showRenameTag,
  renameTagValue,
  onRenameTagValueChange,
  onRenameTagSubmit,
  onRenameTagCancel,
  normalizeTag,
}) => {
  const filteredTagStats = tagStats.filter(stat =>
    stat.tag.toLowerCase().includes(tagSearch.toLowerCase())
  );

  return (
    <div className="w-[280px] bg-card/95 rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.3)] flex flex-col flex-shrink-0 overflow-hidden h-full">
      <div className="p-4 border-b border-[#1A1C3A]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#CFCFF6] flex items-center gap-2">
            <RiPriceTag3Line className="w-4 h-4 text-[#6049E3]" />
            Tags ({tagStats.length})
          </h3>
          {canEditTags && (
            <button
              onClick={onAddTag}
              className="p-1.5 rounded-md text-[#8A8C8E] hover:text-[#CFCFF6] hover:bg-[#6049E3]/20 transition-colors duration-200"
              title="Add Tag"
            >
              <RiAddLine className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8A8C8E]" />
          <Input
            type="text"
            value={tagSearch}
            onChange={e => onTagSearchChange(e.target.value)}
            placeholder="Search tags..."
            className="pl-10 bg-[#0B0C20] border-[#1A1C3A] text-[#CFCFF6] placeholder-[#8A8C8E] h-9"
          />
        </div>
      </div>

      {/* Tag List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-0.5">
          {filteredTagStats.map((stat: TagStats) => {
            const isSelected = selectedTags.some(selTag => normalizeTag(selTag) === normalizeTag(stat.tag));
            return (
              <div
                key={stat.tag}
                className="select-none"
              >
                {/* Rename input inline */}
                {showRenameTag === stat.tag ? (
                  <div className="flex items-center gap-1 p-2 bg-[#0B0C20] rounded-md">
                    <Input
                      type="text"
                      value={renameTagValue}
                      onChange={(e) => onRenameTagValueChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onRenameTagSubmit(stat.tag, renameTagValue);
                        } else if (e.key === 'Escape') {
                          onRenameTagCancel();
                        }
                      }}
                      autoFocus
                      className="flex-1 h-8 text-sm bg-[#111235] border-[#1A1C3A] text-[#CFCFF6]"
                    />
                    <Button
                      onClick={() => onRenameTagSubmit(stat.tag, renameTagValue)}
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white hover:border-[#6049E3] transition-all"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={onRenameTagCancel}
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-[#8A8C8E] hover:text-[#CFCFF6]"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-[#1A1C3A]/60 text-white'
                        : 'text-[#CFCFF6] hover:bg-[#1A1C3A]/40 hover:text-white'
                    }`}
                    onClick={() => onTagSelect(stat.tag)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TagBadge
                        tag={stat.tag || '(empty)'}
                        variant="sidebar"
                        className="max-w-[140px]"
                      />
                      <span className={`text-xs font-medium ${isSelected ? 'text-[#CFCFF6]/80' : 'text-[#8A8C8E]'}`}>
                        {stat.count}
                      </span>
                    </div>

                    {canEditTags && stat.tag !== '(empty)' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className={`opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 transition-all ${isSelected ? 'text-white' : 'text-[#8A8C8E]'}`}>
                            <RiMore2Fill className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onRenameTag(stat.tag);
                            }}
                            className="gap-2"
                          >
                            <RiEditLine className="w-4 h-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTag(stat.tag);
                            }}
                            className="gap-2 text-red-400 hover:text-red-300"
                          >
                            <RiDeleteBinLine className="w-4 h-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredTagStats.length === 0 && (
          <div className="text-center py-8">
            <RiPriceTag3Line className="w-12 h-12 text-[#8A8C8E] mx-auto mb-2" />
            <p className="text-[#8A8C8E] text-sm mb-3">
              {tagSearch ? 'No tags found' : 'No tags yet'}
            </p>
            {canEditTags && !tagSearch && (
              <button
                onClick={onAddTag}
                className="border-2 border-[#6049E3] bg-[#6049E3]/20 text-[#CFCFF6] hover:bg-[#6049E3]/30 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              >
                Create your first tag
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TagSidebar;

