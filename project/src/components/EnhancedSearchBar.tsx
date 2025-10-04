import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Tag } from 'lucide-react';
import { FileItem } from './FileCard';
import { getAllTags } from '../hooks/useFileSearch';

interface EnhancedSearchBarProps {
  searchQuery: string;
  selectedTags: string[];
  onSearchChange: (query: string) => void;
  onTagsChange: (tags: string[]) => void;
  files: FileItem[];
  placeholder?: string;
  className?: string;
}

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  searchQuery,
  selectedTags,
  onSearchChange,
  onTagsChange,
  files,
  placeholder = "Search files, folders, or tags...",
  className = ''
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isTypingTag, setIsTypingTag] = useState(false);
  const [tagQuery, setTagQuery] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Get all available tags from files
  const allTags = getAllTags(files);

  // Function to get consistent color for a tag
  const getTagColor = (tag: string) => {
    // Generate a consistent color based on tag name
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert hash to HSL for better color distribution
    const hue = Math.abs(hash) % 360;
    const saturation = 70; // Vibrant colors
    const lightness = 50; // Medium lightness
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // Update suggestions based on current input
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filteredTags = allTags.filter(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !selectedTags.includes(tag)
      );
      setSuggestions(filteredTags.slice(0, 8));
      setShowSuggestions(filteredTags.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allTags, selectedTags]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
          selectTag(suggestions[selectedSuggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const selectTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onTagsChange([...selectedTags, tag]);
    }
    
    // Clear the search query when a tag is selected
    onSearchChange('');
    
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const clearSearch = () => {
    onSearchChange('');
    onTagsChange([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={suggestionsRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-light-text/70" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim().length > 0) {
              setShowSuggestions(true);
            }
          }}
          className="w-full pl-12 pr-12 py-4 bg-dark-surface border border-dark-surface/50 rounded-2xl text-base text-light-text placeholder-light-text/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-300 hover:border-light-text/30 hover:shadow-md hover:shadow-light-text/10"
        />
        
        {/* Clear Button */}
        {(searchQuery || selectedTags.length > 0) && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-light-text/70 hover:text-light-text transition-colors duration-200 p-1 rounded-full hover:bg-dark-bg/50"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tag Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-dark-surface border border-[#262626] rounded-xl shadow-lg z-50 overflow-hidden">
          {suggestions.map((tag, index) => (
            <button
              key={tag}
              onClick={() => selectTag(tag)}
              className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-colors duration-200 ${
                index === selectedSuggestionIndex
                  ? 'bg-[#262626] text-light-text'
                  : 'text-light-text hover:bg-[#262626]'
              }`}
            >
              <div 
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: getTagColor(tag) }}
              />
              <span className="flex-1 text-left">{tag}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedTags.map(tag => (
            <div
              key={tag}
              className="flex items-center space-x-2 bg-[#262626] text-light-text px-3 py-1.5 rounded-lg text-sm"
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getTagColor(tag) }}
              />
              <span>{tag}</span>
              <button
                onClick={() => removeTag(tag)}
                className="text-light-text/70 hover:text-light-text transition-colors duration-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedSearchBar;
