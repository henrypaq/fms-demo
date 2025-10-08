import React, { useState } from 'react';
import { Upload, Menu } from 'lucide-react';
import UploadSheet from '../features/UploadSheet';
import EnhancedSearchBar from '../EnhancedSearchBar';
import { FileItem } from '../features/FileCard';
import { Button, Container } from '../ui';

interface TopBarProps {
  onMenuClick?: () => void;
  onUploadComplete?: () => void;
  onSearchChange?: (query: string) => void;
  onTagsChange?: (tags: string[]) => void;
  searchQuery?: string;
  selectedTags?: string[];
  files?: FileItem[];
  currentPageTitle?: string;
  className?: string;
}

const TopBar: React.FC<TopBarProps> = ({ 
  onMenuClick, 
  onUploadComplete,
  onSearchChange,
  onTagsChange,
  searchQuery = '',
  selectedTags = [],
  files = [],
  currentPageTitle = 'Dashboard',
  className = '' 
}) => {
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  const handleUploadClick = () => {
    setShowUploadSheet(true);
  };

  const handleUploadComplete = () => {
    onUploadComplete?.();
  };

  const handleSearchChange = (query: string) => {
    onSearchChange?.(query);
  };

  const handleTagsChange = (tags: string[]) => {
    onTagsChange?.(tags);
  };

  // Don't show upload and search on Tags page
  const isTagsPage = currentPageTitle === 'Tags';

  return (
    <>
      <div className={`w-full ${className}`}>
        <div className="flex items-center gap-4 px-4 py-4 w-full">
          {/* Left Section - Mobile Menu + Page Title */}
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

          </div>

          {/* Center Section - Enhanced Search Bar (Only show if not Tags page) */}
          {!isTagsPage && (
            <div className="flex-1 max-w-2xl">
              <EnhancedSearchBar
                searchQuery={searchQuery}
                selectedTags={selectedTags}
                onSearchChange={handleSearchChange}
                onTagsChange={handleTagsChange}
                files={files}
                placeholder="Search files, folders, or tags..."
              />
            </div>
          )}

          {/* Right Section - Upload Button (Only show if not Tags page) */}
          {!isTagsPage && (
            <div className="flex-shrink-0">
              <Button 
                onClick={handleUploadClick}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadSheet
        isOpen={showUploadSheet}
        onOpenChange={setShowUploadSheet}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
};

export default TopBar;