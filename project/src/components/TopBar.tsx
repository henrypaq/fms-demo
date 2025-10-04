import React, { useState } from 'react';
import { Upload, Menu } from 'lucide-react';
import UploadModal from './UploadModal';
import EnhancedSearchBar from './EnhancedSearchBar';
import { FileItem } from './FileCard';

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
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleUploadClick = () => {
    setShowUploadModal(true);
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
      <div className={`bg-dark-bg border-b border-dark-surface ${className}`}>
        <div className="flex items-center px-5 py-4">
          {/* Left Section - Mobile Menu + Page Title (Fixed Width) */}
          <div className="flex items-center space-x-4 w-72 flex-shrink-0">
            {/* Mobile Menu Button */}
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 rounded-lg text-light-text/70 hover:text-light-text hover:bg-dark-bg transition-colors duration-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Current Page Title */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-light-text truncate">{currentPageTitle}</h1>
            </div>
          </div>

          {/* Center Section - Enhanced Search Bar (Only show if not Tags page) */}
          {!isTagsPage && (
            <div className="flex-1 flex justify-center px-6">
              <div className="w-full max-w-3xl">
                <EnhancedSearchBar
                  searchQuery={searchQuery}
                  selectedTags={selectedTags}
                  onSearchChange={handleSearchChange}
                  onTagsChange={handleTagsChange}
                  files={files}
                  placeholder="Search files, folders, or tags..."
                />
              </div>
            </div>
          )}

          {/* Right Section - Upload Button (Only show if not Tags page) */}
          {!isTagsPage && (
            <div className="flex items-center w-32 justify-end flex-shrink-0">
              <button 
                onClick={handleUploadClick}
                className="flex items-center space-x-2 px-4 py-2.5 bg-light-text hover:bg-light-text/90 text-dark-bg rounded-lg text-sm font-medium transition-colors duration-200 shadow-lg shadow-light-text/25"
              >
                <Upload className="w-5 h-5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
};

export default TopBar;