import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

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
				ringColor: {
					DEFAULT: 'oklch(var(--ring))',
				},
				colors: {
					border: 'oklch(var(--border))',
					input: 'oklch(var(--input))',
					ring: 'oklch(var(--ring))',
					background: 'oklch(var(--background))',
					foreground: 'oklch(var(--foreground))',
						overlay: 'oklch(var(--overlay))',
						ink: 'oklch(var(--ink))',
					primary: {
						DEFAULT: 'oklch(var(--primary))',
						foreground: 'oklch(var(--primary-foreground))',
						hover: 'oklch(var(--primary-hover))',
						light: 'oklch(var(--primary-light))'
					},
					secondary: {
						DEFAULT: 'oklch(var(--secondary))',
						foreground: 'oklch(var(--secondary-foreground))'
					},
					destructive: {
						DEFAULT: 'oklch(var(--destructive))',
						foreground: 'oklch(var(--destructive-foreground))',
						light: 'oklch(var(--destructive-light))'
					},
					muted: {
						DEFAULT: 'oklch(var(--muted))',
						foreground: 'oklch(var(--muted-foreground))'
					},
					accent: {
						DEFAULT: 'oklch(var(--accent-neutral))',
						foreground: 'oklch(var(--accent-neutral-foreground))',
						light: 'oklch(var(--accent-neutral-light))'
					},
				'accent-orange': {
					DEFAULT: 'oklch(var(--accent-orange))',
					foreground: 'oklch(var(--accent-orange-foreground))',
					light: 'oklch(var(--accent-orange-light))'
				},
					card: {
						DEFAULT: 'oklch(var(--card))',
						foreground: 'oklch(var(--card-foreground))'
					},
					popover: {
						DEFAULT: 'oklch(var(--popover))',
						foreground: 'oklch(var(--popover-foreground))',
					},
					sidebar: {
						DEFAULT: 'oklch(var(--sidebar-background))',
						foreground: 'oklch(var(--sidebar-foreground))',
						primary: 'oklch(var(--sidebar-primary))',
						'primary-foreground': 'oklch(var(--sidebar-primary-foreground))',
						accent: 'oklch(var(--sidebar-accent))',
						'accent-foreground': 'oklch(var(--sidebar-accent-foreground))',
						border: 'oklch(var(--sidebar-border))',
						ring: 'oklch(var(--sidebar-ring))'
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
	plugins: [tailwindcssAnimate, typography],
} satisfies Config;
