import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx,js,jsx}",
		"./components/**/*.{ts,tsx,js,jsx}",
		"./app/**/*.{ts,tsx,js,jsx}",
		"./src/**/*.{ts,tsx,js,jsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter var', 'system-ui', 'sans-serif'],
				roboto: ['Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				yeseva: ['"Yeseva One"', 'Georgia', 'serif'],
				norwester: ['Norwester', '"Bebas Neue"', 'Oswald', 'Impact', 'sans-serif'],
			},
				colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
					overlay: 'hsl(var(--overlay))',
					ink: 'hsl(var(--ink))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					hover: 'hsl(var(--primary-hover))',
					light: 'hsl(var(--primary-light))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
					light: 'hsl(var(--destructive-light))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent-neutral))',
					foreground: 'hsl(var(--accent-neutral-foreground))',
					light: 'hsl(var(--accent-neutral-light))'
				},
				'accent-orange': {
					DEFAULT: 'hsl(var(--accent-orange))',
					foreground: 'hsl(var(--accent-orange-foreground))',
					light: 'hsl(var(--accent-orange-light))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
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
				lg: '0.5rem',
				md: '0.375rem',
				sm: '0.25rem'
			},
				keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
					},
					'fade-in': {
						from: { opacity: '0' },
						to: { opacity: '1' }
					},
					'slide-up-fade': {
						from: { opacity: '0', transform: 'translateY(6px)' },
						to: { opacity: '1', transform: 'translateY(0)' }
					}
			},
				animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
					'accordion-up': 'accordion-up 0.2s ease-out',
					'fade-in': 'fade-in 0.25s ease-out',
					'slide-up-fade': 'slide-up-fade 0.25s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
