import React from 'react';

interface AssetBarProps {
  assetCount: number;
  totalSize: number; // in bytes
  assetType?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  showTagsToggle?: boolean;
  tagsVisible?: boolean;
  onToggleTags?: () => void;
  // Selection
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
}

export const AssetBar: React.FC<AssetBarProps> = ({
  assetCount,
  totalSize,
  assetType = 'Assets',
  isCollapsed,
  onToggleCollapse,
  showTagsToggle = true,
  tagsVisible = true,
  onToggleTags,
  allSelected,
  someSelected,
  onSelectAll,
}) => {
  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

  return (
    <div className="px-6 py-2">
      <div className="flex items-center gap-2">
        {/* Select All Checkbox */}
        <input
          type="checkbox"
          checked={allSelected}
          ref={(input) => {
            if (input) {
              input.indeterminate = someSelected && !allSelected;
            }
          }}
          onChange={onSelectAll}
          className="w-4 h-4 rounded border-2 border-[#6049E3]/50 bg-[hsl(240,30%,5%)] checked:bg-[#6049E3] checked:border-[#6049E3] hover:border-[#6049E3] focus:ring-2 focus:ring-[#6049E3]/30 focus:ring-offset-0 cursor-pointer transition-all appearance-none flex items-center justify-center"
          style={{
            backgroundImage: allSelected ? 'url("data:image/svg+xml,%3csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z\'/%3e%3c/svg%3e")' : someSelected ? 'url("data:image/svg+xml,%3csvg viewBox=\'0 0 16 16\' fill=\'white\' xmlns=\'http://www.w3.org/2000/svg\'%3e%3cpath d=\'M4 8h8\'/%3e%3c/svg%3e")' : 'none',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
          title={allSelected ? 'Deselect all' : 'Select all'}
        />
        
        {/* Collapse/Expand Dropdown Button */}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded border border-[#1A1C3A] bg-[hsl(240,30%,8%)] hover:bg-[hsl(240,30%,12%)] transition-all"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          <svg
            className={`w-3 h-3 text-[#8A8C8E] transition-transform duration-300 ${
              isCollapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        
        {/* Assets Count and Size */}
        <div className="text-sm text-[#8A8C8E] font-medium">
          <span>
            {assetCount} {assetType} • {sizeMB} MB
          </span>
        </div>

        {/* Tags Toggle Button */}
        {showTagsToggle && onToggleTags && (
          <button
            onClick={onToggleTags}
            className={`
              text-xs font-medium px-2 py-0.5 ml-3 rounded-md border transition-all
              ${
                tagsVisible
                  ? 'bg-[#6049E3]/20 text-[#CFCFF6] border-[#6049E3]'
                  : 'text-[#8A8C8E] hover:text-[#CFCFF6] border-[#1A1C3A] bg-transparent'
              }
            `}
            title={tagsVisible ? 'Hide tags' : 'Show tags'}
          >
            Tags
          </button>
        )}
      </div>
    </div>
  );
};

