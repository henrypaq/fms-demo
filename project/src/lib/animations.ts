/**
 * Unified Animation System
 * Inspired by Frame.io, Linear, and Notion
 * Fast, snappy, and consistent motion across all components
 */

// Animation durations (in ms)
export const DURATIONS = {
  dropdown: 140,
  popover: 150,
  modal: 180,
  sheet: 200,
  tooltip: 120,
  fast: 100,
  medium: 150,
  slow: 200,
} as const

// Easing functions
export const EASINGS = {
  out: 'cubic-bezier(0.33, 1, 0.68, 1)', // ease-out
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)', // ease-in-out
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // subtle bounce
} as const

// Animation classes for Radix UI components
export const ANIMATIONS = {
  // Dropdown / Context Menu: quick fade + scale
  dropdown: {
    entry: 'animate-in fade-in-0 zoom-in-95',
    exit: 'animate-out fade-out-0 zoom-out-95',
    duration: DURATIONS.dropdown,
  },
  
  // Popover: slide + fade
  popover: {
    entry: 'animate-in fade-in-0',
    exit: 'animate-out fade-out-0',
    slide: {
      top: 'slide-in-from-bottom-2',
      bottom: 'slide-in-from-top-2',
      left: 'slide-in-from-right-2',
      right: 'slide-in-from-left-2',
    },
    duration: DURATIONS.popover,
  },
  
  // Modal / Dialog: subtle zoom + fade
  modal: {
    entry: 'animate-in fade-in-0 zoom-in-90',
    exit: 'animate-out fade-out-0 zoom-out-90',
    duration: DURATIONS.modal,
  },
  
  // Sheet: slide from side
  sheet: {
    entry: 'animate-in fade-in-0',
    exit: 'animate-out fade-out-0',
    slide: {
      top: 'slide-in-from-top',
      bottom: 'slide-in-from-bottom',
      left: 'slide-in-from-left',
      right: 'slide-in-from-right',
    },
    duration: DURATIONS.sheet,
  },
  
  // Tooltip: fade only
  tooltip: {
    entry: 'animate-in fade-in-0',
    exit: 'animate-out fade-out-0',
    duration: DURATIONS.tooltip,
  },
} as const

// CSS custom properties for animations
export const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes zoomIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  
  @keyframes zoomOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.95); }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideDown {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(8px); }
  }
  
  /* GPU acceleration */
  [data-state="open"],
  [data-state="closed"] {
    will-change: transform, opacity;
  }
  
  /* Remove will-change after animation */
  [data-state="open"]:not([data-state="opening"]),
  [data-state="closed"]:not([data-state="closing"]) {
    will-change: auto;
  }
`

// Tailwind animation utilities
export const getAnimationClasses = (
  type: keyof typeof ANIMATIONS,
  state: 'open' | 'closed',
  side?: 'top' | 'bottom' | 'left' | 'right'
) => {
  const anim = ANIMATIONS[type]
  let classes = state === 'open' ? anim.entry : anim.exit
  
  // Add slide direction if applicable
  if ('slide' in anim && side && state === 'open') {
    classes += ` ${anim.slide[side]}`
  }
  
  return classes
}

// Framer Motion variants for custom components
export const motionVariants = {
  dropdown: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: DURATIONS.dropdown / 1000, ease: 'easeOut' },
  },
  
  popover: {
    initial: { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: DURATIONS.popover / 1000, ease: 'easeOut' },
  },
  
  modal: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: DURATIONS.modal / 1000, ease: 'easeOut' },
  },
  
  sheet: {
    initial: (side: 'left' | 'right' | 'top' | 'bottom') => ({
      opacity: 0,
      x: side === 'right' ? 100 : side === 'left' ? -100 : 0,
      y: side === 'bottom' ? 100 : side === 'top' ? -100 : 0,
    }),
    animate: { opacity: 1, x: 0, y: 0 },
    exit: (side: 'left' | 'right' | 'top' | 'bottom') => ({
      opacity: 0,
      x: side === 'right' ? 100 : side === 'left' ? -100 : 0,
      y: side === 'bottom' ? 100 : side === 'top' ? -100 : 0,
    }),
    transition: { duration: DURATIONS.sheet / 1000, ease: 'easeOut' },
  },
  
  tooltip: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURATIONS.tooltip / 1000, ease: 'easeOut' },
  },
  
  // List items stagger
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  },
  
  // Fade in/out for page transitions
  page: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: DURATIONS.fast / 1000 },
  },
}

export default ANIMATIONS


