import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: 'var(--brand-ink)',
          paper: 'var(--brand-paper)',
          accent: 'var(--brand-accent)',
          'accent-deep': 'var(--brand-accent-deep)',
        },
        shelf: {
          void: 'var(--shelf-void)',
          surface: 'var(--shelf-surface)',
          elevated: 'var(--shelf-elevated)',
          border: 'var(--shelf-border)',
          'border-strong': 'var(--shelf-border-strong)',
          muted: 'var(--shelf-muted)',
        },
        'shelf-text': {
          primary: 'var(--shelf-text-primary)',
          secondary: 'var(--shelf-text-secondary)',
          tertiary: 'var(--shelf-text-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--shelf-accent)',
          dim: 'var(--shelf-accent-dim)',
          border: 'var(--shelf-accent-border)',
          hover: 'var(--shelf-accent-hover)',
          contrast: 'var(--shelf-on-accent)',
        },
        success: 'var(--shelf-success)',
        danger: 'var(--shelf-danger)',
        info: 'var(--shelf-info)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        btn: 'var(--radius-sm)',
      },
      maxWidth: {
        content: '88rem',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        raised: 'var(--shadow-raised)',
        glow: 'var(--shadow-glow)',
        modal: 'var(--shadow-modal)',
      },
      // Motion tokens exposed as utilities so surfaces styled with Tailwind
      // classes (nav, footer links) share the same curves/timings as the CSS
      // component layer. Single source of truth stays styles/tokens.css.
      transitionTimingFunction: {
        entrance: 'var(--ease-entrance)',
        exit: 'var(--ease-exit)',
        move: 'var(--ease-move)',
        overshoot: 'var(--ease-overshoot)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
        deliberate: 'var(--dur-deliberate)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(18px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'route-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-up': 'fade-up var(--dur-deliberate) var(--ease-entrance) both',
        'route-in': 'route-in var(--dur-slow) var(--ease-entrance) both',
      },
    },
  },
  plugins: [],
}

export default config
