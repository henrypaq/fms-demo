import React from 'react';
import { Search, X, FileText, Loader } from 'lucide-react';
import { FileItem } from './FileCard';
import FileCard from './FileCard';

interface GlobalSearchResultsProps {
  query: string;
  selectedTags: string[];
  files: FileItem[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  onFileClick?: (file: FileItem) => void;
  onFileDoubleClick?: (file: FileItem) => void;
  onToggleFavorite?: (fileId: string) => void;
  onFileUpdate?: (fileId: string, updates: Partial<FileItem>) => void;
  onFileMove?: (fileId: string, projectId: string | null, folderId: string | null) => void;
  onClearSearch?: () => void;
  userRole?: 'admin' | 'employee';
  userProjectAccess?: string[];
  activeView?: string;
}

const GlobalSearchResults: React.FC<GlobalSearchResultsProps> = ({
  query,
  selectedTags,
  files,
  loading,
  error,
  totalResults,
  onFileClick,
  onFileDoubleClick,
  onToggleFavorite,
  onFileUpdate,
  onFileMove,
  onClearSearch,
  userRole = 'admin',
  userProjectAccess = [],
  activeView = 'dashboard'
}) => {
  const hasSearchTerms = query.trim().length > 0 || selectedTags.length > 0;

  if (!hasSearchTerms) {
    return null;
  }

  const getViewDisplayName = (view: string) => {
    switch (view) {
      case 'favorites':
        return 'Favorites';
      case 'recent':
        return 'Recent Files';
      case 'all-files':
        return 'All Files';
      case 'dashboard':
        return 'Dashboard';
      default:
        return 'Current View';
    }
  };

  return (
    <div className="p-6">
      {/* Search Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Search Results</h2>
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              {query.trim() && (
                <span>"{query.trim()}"</span>
              )}
              {selectedTags.length > 0 && (
                <span>
                  {query.trim() && '+ '}
                  {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}
                </span>
              )}
              {activeView && activeView !== 'dashboard' && (
                <span>
                  {(query.trim() || selectedTags.length > 0) && '• '}
                  in {getViewDisplayName(activeView)}
                </span>
              )}
              {!loading && (
                <span>• {totalResults} result{totalResults !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
        
        {onClearSearch && (
          <button
            onClick={onClearSearch}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <X className="w-4 h-4" />
            <span>Clear Search</span>
          </button>
        )}
      </div>


      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="w-8 h-8 text-light-text animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Searching...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Search Error</h3>
            <p className="text-slate-400">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {files.length > 0 ? (
            <>
              {/* Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onClick={onFileClick}
                    onDoubleClick={onFileDoubleClick}
                    onToggleFavorite={onToggleFavorite}
                    onUpdate={onFileUpdate}
                    onMove={onFileMove}
                    userRole={userRole}
                    userProjectAccess={userProjectAccess}
                  />
                ))}
              </div>

            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No files found</h3>
              <p className="text-slate-400 mb-4">
                No files match your search criteria
                {activeView && activeView !== 'dashboard' && ` in ${getViewDisplayName(activeView)}`}.
              </p>
              <div className="text-sm text-slate-500 max-w-md mx-auto">
                <p>Try different search terms or check your spelling.</p>
              </div>
            </div>
          )}

          {/* Show if results are limited */}
          {files.length === 150 && totalResults > 150 && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <Search className="w-5 h-5 text-blue-400" />
                <p className="text-blue-400 text-sm">
                  Showing top 150 results of {totalResults}. Results are ranked by relevance.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GlobalSearchResults;