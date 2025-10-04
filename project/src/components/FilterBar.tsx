import React, { useState, useRef, useEffect } from 'react';
import { Grid3X3, List, SortAsc, SortDesc, ChevronDown } from 'lucide-react';

export type ViewMode = 'grid' | 'list';
export type SortOption = 'name' | 'date' | 'size' | 'type';
export type SortDirection = 'asc' | 'desc';
export type FilterType = 'all' | 'favorites' | 'recent' | 'documents' | 'images' | 'videos' | 'audio' | 'archives';

interface FilterBarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortOption;
  onSortByChange: (sort: SortOption) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
  filterType: FilterType;
  onFilterTypeChange: (filter: FilterType) => void;
  totalCount: number;
  filteredCount: number;
  // New prop for server-side sorting
  onServerSortChange?: (sortBy: SortOption, sortDirection: SortDirection) => void;
  // Selection props
  selectedCount?: number;
  onSelectAll?: () => void;
  className?: string;
}

// Custom Dropdown Component
const CustomDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ value, onChange, options, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-dark-surface border border-dark-bg rounded-xl px-3 py-2 text-light-text text-sm focus:outline-none focus:ring-2 focus:ring-light-text/50 cursor-pointer hover:bg-[#262626] transition-colors duration-200"
      >
        <span>{selectedOption?.label || 'Select...'}</span>
        <ChevronDown className={`w-4 h-4 text-light-text/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-surface border border-[#262626] rounded-xl shadow-lg z-50 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors duration-200 border-b border-[#262626]/30 last:border-b-0 ${
                value === option.value
                  ? 'bg-[#262626] text-light-text'
                  : 'text-light-text hover:bg-[#262626]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const FilterBar: React.FC<FilterBarProps> = ({
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  filterType,
  onFilterTypeChange,
  totalCount,
  filteredCount,
  onServerSortChange,
  selectedCount = 0,
  onSelectAll,
  className = ''
}) => {
  const getSortLabel = () => {
    switch (sortBy) {
      case 'name': return 'Name';
      case 'date': return 'Date Modified';
      case 'size': return 'File Size';
      case 'type': return 'File Type';
      default: return 'Recommended';
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'all': return 'All Files';
      case 'favorites': return 'Favorites';
      case 'recent': return 'Recent';
      case 'documents': return 'Documents';
      case 'images': return 'Images';
      case 'videos': return 'Videos';
      case 'audio': return 'Audio';
      case 'archives': return 'Archives';
      default: return 'All Files';
    }
  };

  const handleSortChange = (newSortBy: SortOption) => {
    if (onServerSortChange) {
      // Use server-side sorting
      const newDirection = newSortBy === sortBy && sortDirection === 'asc' ? 'desc' : 'asc';
      onServerSortChange(newSortBy, newDirection);
    } else {
      // Use client-side sorting (fallback)
      onSortByChange(newSortBy);
    }
  };

  const handleDirectionChange = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    if (onServerSortChange) {
      // Use server-side sorting
      onServerSortChange(sortBy, newDirection);
    } else {
      // Use client-side sorting (fallback)
      onSortDirectionChange(newDirection);
    }
  };

  return (
    <div className={`bg-dark-bg border-b border-dark-surface px-5 py-2 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Left Section - View Mode */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-dark-surface rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors duration-200 ${
                viewMode === 'grid'
                  ? 'bg-light-text text-dark-bg'
                  : 'text-light-text/70 hover:text-light-text hover:bg-dark-bg'
              }`}
              title="Grid View"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded-md transition-colors duration-200 ${
                viewMode === 'list'
                  ? 'bg-light-text text-dark-bg'
                  : 'text-light-text/70 hover:text-light-text hover:bg-dark-bg'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Results Count */}
          <div className="text-sm text-light-text/70">
            {filteredCount !== totalCount ? (
              <span>{filteredCount} of {totalCount} files</span>
            ) : (
              <span>{totalCount} files</span>
            )}
          </div>

          {/* Selection Controls - Only show when files are selected */}
          {selectedCount > 0 && onSelectAll && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-light-text font-medium">
                {selectedCount} selected
              </span>
              <button
                onClick={onSelectAll}
                className="flex items-center space-x-2 px-3 py-1.5 bg-[#262626] hover:bg-[#262626]/80 text-light-text rounded-lg text-sm font-medium transition-colors duration-200"
              >
                <span>Select All</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Section - Sort and Filter */}
        <div className="flex items-center space-x-3">
          {/* Filter Dropdown */}
          <CustomDropdown
            value={filterType}
            onChange={(value) => onFilterTypeChange(value as FilterType)}
            options={[
              { value: 'all', label: 'All Files' },
              { value: 'favorites', label: 'Favorites' },
              { value: 'recent', label: 'Recent' },
              { value: 'documents', label: 'Documents' },
              { value: 'images', label: 'Images' },
              { value: 'videos', label: 'Videos' },
              { value: 'audio', label: 'Audio' },
              { value: 'archives', label: 'Archives' }
            ]}
            className="min-w-[120px]"
          />

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-light-text/70">Sort:</span>
            <CustomDropdown
              value={sortBy}
              onChange={(value) => handleSortChange(value as SortOption)}
              options={[
                { value: 'date', label: 'Date Modified' },
                { value: 'name', label: 'Name' },
                { value: 'size', label: 'File Size' },
                { value: 'type', label: 'File Type' }
              ]}
              className="min-w-[120px]"
            />

            <button
              onClick={handleDirectionChange}
              className="p-2 rounded-xl text-light-text/70 hover:text-light-text hover:bg-[#262626] transition-colors duration-200"
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortDirection === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;