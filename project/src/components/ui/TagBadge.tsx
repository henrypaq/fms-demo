import React from 'react';

interface TagBadgeProps {
  tag: string;
  onClick?: () => void;
  onRemove?: () => void;
  variant?: 'default' | 'sidebar' | 'removable';
  className?: string;
}

/**
 * Generate consistent color for a tag based on its name
 * Uses hash function to ensure same tag always gets same color
 */
export const getTagColor = (tag: string) => {
  const colors = [
    { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', hover: 'hover:bg-red-500/30' },
    { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/30', hover: 'hover:bg-orange-500/30' },
    { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/30', hover: 'hover:bg-yellow-500/30' },
    { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30', hover: 'hover:bg-green-500/30' },
    { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30', hover: 'hover:bg-blue-500/30' },
    { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30', hover: 'hover:bg-indigo-500/30' },
    { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30', hover: 'hover:bg-purple-500/30' },
    { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30', hover: 'hover:bg-pink-500/30' }
  ];
  
  // Use tag name to generate consistent color (hash function)
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

/**
 * Get hex color for sidebar badges (for inline style)
 */
export const getTagHexColor = (tag: string): string => {
  const hexColors = [
    '#EF4444', // red
    '#F97316', // orange
    '#F59E0B', // yellow
    '#10B981', // green
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#8B5CF6', // purple
    '#EC4899', // pink
  ];
  
  // Use same hash function for consistency
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hexColors[Math.abs(hash) % hexColors.length];
};

/**
 * Unified TagBadge component for consistent tag styling across the platform
 */
export const TagBadge: React.FC<TagBadgeProps> = ({
  tag,
  onClick,
  onRemove,
  variant = 'default',
  className = ''
}) => {
  const color = getTagColor(tag);
  
  const baseClasses = 'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg transition-all duration-200';
  
  const variantClasses = {
    default: `${color.bg} ${color.text} border ${color.border} ${color.hover}`,
    sidebar: `${color.bg} ${color.text} border ${color.border}`,
    removable: `${color.bg} ${color.text} border ${color.border} ${color.hover} pr-1 gap-1`
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };
  
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.();
  };
  
  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
      title={tag} // Show full tag name on hover
    >
      <span className="truncate block overflow-hidden text-ellipsis whitespace-nowrap">{tag}</span>
      {onRemove && (
        <button
          onClick={handleRemove}
          className="flex-shrink-0 ml-0.5 hover:text-white transition-colors"
          type="button"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default TagBadge;

