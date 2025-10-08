/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class'],
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
		extend: {
			fontFamily: {
				sans: ['Space Grotesk', 'sans-serif'],
			},
			animation: {
				// Fast, snappy animations for modern SaaS feel
				'dropdown-in': 'dropdown-in 140ms cubic-bezier(0.33, 1, 0.68, 1)',
				'dropdown-out': 'dropdown-out 100ms cubic-bezier(0.33, 1, 0.68, 1)',
				'popover-in': 'popover-in 150ms cubic-bezier(0.33, 1, 0.68, 1)',
				'popover-out': 'popover-out 100ms cubic-bezier(0.33, 1, 0.68, 1)',
				'modal-in': 'modal-in 180ms cubic-bezier(0.33, 1, 0.68, 1)',
				'modal-out': 'modal-out 100ms cubic-bezier(0.33, 1, 0.68, 1)',
				'sheet-in': 'sheet-in 200ms cubic-bezier(0.33, 1, 0.68, 1)',
				'sheet-out': 'sheet-out 100ms cubic-bezier(0.33, 1, 0.68, 1)',
				'tooltip-in': 'tooltip-in 120ms cubic-bezier(0.33, 1, 0.68, 1)',
				'tooltip-out': 'tooltip-out 80ms cubic-bezier(0.33, 1, 0.68, 1)',
			},
			keyframes: {
				'dropdown-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				'dropdown-out': {
					'0%': { opacity: '1', transform: 'scale(1)' },
					'100%': { opacity: '0', transform: 'scale(0.95)' },
				},
				'popover-in': {
					'0%': { opacity: '0', transform: 'translateY(-8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'popover-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(-8px)' },
				},
				'modal-in': {
					'0%': { opacity: '0', transform: 'scale(0.9)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
				'modal-out': {
					'0%': { opacity: '1', transform: 'scale(1)' },
					'100%': { opacity: '0', transform: 'scale(0.9)' },
				},
				'sheet-in': {
					'0%': { opacity: '0', transform: 'translateX(100%)' },
					'100%': { opacity: '1', transform: 'translateX(0)' },
				},
				'sheet-out': {
					'0%': { opacity: '1', transform: 'translateX(0)' },
					'100%': { opacity: '0', transform: 'translateX(100%)' },
				},
				'tooltip-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'tooltip-out': {
					'0%': { opacity: '1' },
					'100%': { opacity: '0' },
				},
			},
			transitionTimingFunction: {
				'ease-out-smooth': 'cubic-bezier(0.33, 1, 0.68, 1)',
			},
			colors: {
  			// DaVinci Resolve Inspired Color System
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
			// New DaVinci Resolve tokens
			surface: 'hsl(var(--surface))',
			highlight: 'hsl(var(--highlight))',
			'active-foreground': 'hsl(var(--active-foreground))',
			'card-light': 'hsl(var(--card-light))',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		spacing: {
  			'18': '4.5rem',
  			'88': '22rem',
  			'128': '32rem'
  		},
  		fontSize: {
  			'2xs': [
  				'0.625rem',
  				{
  					lineHeight: '0.75rem'
  				}
  			]
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.2s ease-in-out',
  			'slide-in': 'slideIn 0.2s ease-in-out',
  			'scale-in': 'scaleIn 0.2s ease-in-out'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			slideIn: {
  				'0%': {
  					transform: 'translateY(-10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			scaleIn: {
  				'0%': {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			}
  		}
  	}
  },
  plugins: [],
};
