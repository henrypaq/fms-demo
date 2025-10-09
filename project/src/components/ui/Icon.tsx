import React from 'react';
import { cn } from '@/lib/utils';

interface IconProps {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  size?: number;
  color?: string;
  className?: string;
  hoverColor?: string;
  selectedColor?: string;
  isSelected?: boolean;
  isHovered?: boolean;
}

export function Icon({ 
  Icon: IconComponent, 
  size = 20, 
  color = "#CCCCCC", 
  className = "",
  hoverColor = "#6049E3",
  selectedColor = "#FFFFFF",
  isSelected = false,
  isHovered = false
}: IconProps) {
  const getColor = () => {
    if (isSelected) return selectedColor;
    if (isHovered) return hoverColor;
    return color;
  };

  const getSizeClass = (size: number) => {
    if (size <= 16) return "w-4 h-4";
    if (size <= 20) return "w-5 h-5";
    if (size <= 24) return "w-6 h-6";
    if (size <= 32) return "w-8 h-8";
    return "w-10 h-10";
  };

  return (
    <IconComponent 
      className={cn(
        getSizeClass(size),
        "transition-colors duration-200",
        className
      )}
      style={{ color: getColor() }}
    />
  );
}

// Predefined icon sizes for consistency
export const IconSizes = {
  small: 16,
  medium: 20,
  large: 24,
  card: 32,
  xlarge: 40
} as const;

// Predefined colors for consistency
export const IconColors = {
  muted: "#CCCCCC",
  accent: "#6049E3",
  white: "#FFFFFF",
  primary: "#1E40AF"
} as const;

