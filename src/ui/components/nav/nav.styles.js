// src/ui/components/nav/nav.styles.js
//
// All component-scoped CSS for the navigation system.
// Injected once into <head> as a <style> tag — idempotent.
//
// Design tokens live in :root so they can be consumed by other components.
// Responsive breakpoint: <768px = mobile (topbar + dock), ≥768px = desktop (header).

/**
 * Injects the nav stylesheet into <head>.
 * Calling this multiple times is safe — it only injects once.
 */
export function injectNavStyles() {
  if (document.getElementById('app-nav-styles')) return;

  const style = document.createElement('style');
  style.id = 'app-nav-styles';
  style.textContent = NAV_CSS;
  document.head.appendChild(style);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const NAV_CSS = `
  /* ── Design tokens ───────────────────────────────────────────── */
  :root {
    --nav-height: 64px;
    --nav-bg: rgba(8, 8, 12, 0.72);
    --nav-bg-scrolled: rgba(8, 8, 12, 0.92);
    --nav-border: rgba(255, 255, 255, 0.06);
    --nav-border-scrolled: rgba(255, 255, 255, 0.09);
    --nav-blur: 20px;

    --accent: #6366f1;
    --accent-hover: #818cf8;
    --accent-muted: rgba(99, 102, 241, 0.15);
    --accent-subtle: rgba(99, 102, 241, 0.08);

    --text-primary: #f1f5f9;
    --text-secondary: #64748b;
    --text-tertiary: #334155;

    --surface-overlay: rgba(10, 10, 14, 0.96);
    --surface-raised: rgba(12, 12, 18, 0.95);

    --radius-xs: 6px;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 22px;
    --radius-2xl: 28px;

    --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.5), 0 20px 60px -10px rgba(0,0,0,0.7);
    --shadow-lg: 0 30px 90px rgba(0,0,0,0.5);

    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-base: 220ms cubic-bezier(0.4, 0, 0.2, 1);
    --transition-spring: 350ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Respect user motion preferences */
  @media (prefers-reduced-motion: reduce) {
    :root {
      --transition-fast: 0ms;
      --transition-base: 0ms;
      --transition-spring: 0ms;
    }
  }


  /* ── Root nav element ─────────────────────────────────────────── */
  .app-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--nav-bg);
    backdrop-filter: blur(var(--nav-blur));
    -webkit-backdrop-filter: blur(var(--nav-blur));
    border-bottom: 1px solid var(--nav-border);
    transition:
      background var(--transition-base),
      border-color var(--transition-base),
      box-shadow var(--transition-base);
  }

  .app-nav.is-scrolled {
    background: var(--nav-bg-scrolled);
    border-color: var(--nav-border-scrolled);
    box-shadow: 0 1px 24px rgba(0, 0, 0, 0.45);
  }


  /* ── Responsive shell visibility ─────────────────────────────── */
  .desktop-shell { display: none; }
  .mobile-shell  { display: block; }

  @media (min-width: 768px) {
    .desktop-shell { display: block; }
    .mobile-shell  { display: none; }
  }


  /* ── Desktop inner layout ────────────────────────────────────── */
  .nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 24px;
    height: var(--nav-height);
  }

  .nav-primary {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }


  /* ── Wordmark / Logo ─────────────────────────────────────────── */
  .nav-logo,
  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    outline: none;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .nav-logo:focus-visible,
  .mobile-brand:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .nav-logo__mark,
  .mobile-brand__mark {
    width: 30px;
    height: 30px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotate(4deg);
    transition: transform var(--transition-spring), box-shadow var(--transition-base);
    box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
    flex-shrink: 0;
  }

  .nav-logo:hover .nav-logo__mark,
  .mobile-brand:hover .mobile-brand__mark {
    transform: rotate(0deg) scale(1.07);
    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
  }

  .nav-logo__icon,
  .mobile-brand__icon {
    width: 15px;
    height: 15px;
    color: #fff;
  }

  .nav-logo__wordmark,
  .mobile-brand__text {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.3px;
    white-space: nowrap;
  }


  /* ── Primary nav links ───────────────────────────────────────── */
  .nav-link {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 12px;
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--text-secondary);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transition: color var(--transition-fast), background var(--transition-fast);
    outline: none;
    white-space: nowrap;
    position: relative;
  }

  .nav-link:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .nav-link:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .nav-link--active {
    color: var(--accent);
    background: var(--accent-subtle);
  }

  .nav-link--active:hover {
    color: var(--accent-hover);
    background: var(--accent-muted);
  }

  /* Left accent bar for active state */
  .nav-link--active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 25%;
    height: 50%;
    width: 2px;
    background: var(--accent);
    border-radius: 0 2px 2px 0;
  }

  .nav-link__icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  /* Label hidden on narrow desktop, shown on wider breakpoints */
  .nav-link__label {
    display: none;
  }

  @media (min-width: 768px) {
    .nav-link__label { display: block; }
  }


  /* ── Command palette trigger button ──────────────────────────── */
  .command-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-secondary);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast),
      color var(--transition-fast);
    outline: none;
  }

  .command-trigger:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.14);
  }

  .command-trigger:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .command-trigger__icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }

  .command-trigger__text {
    display: none;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .command-trigger__hint {
    display: none;
    font-size: 10px;
    color: #94a3b8;
    padding-left: 2px;
    font-family: inherit;
    border: none;
    background: none;
  }

  @media (min-width: 768px) {
    .command-trigger__text,
    .command-trigger__hint,
    .avatar-chevron {
      display: block;
    }
  }

  /* Mobile variant — icon-only circular button */
  .command-trigger--mobile {
    padding: 8px;
    border-radius: 999px;
  }

  .command-trigger--mobile .command-trigger__text,
  .command-trigger--mobile .command-trigger__hint {
    display: none;
  }


  /* ── Avatar / User area ──────────────────────────────────────── */
  .nav-user {
    position: relative;
  }

  .avatar-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 3px;
    border-radius: var(--radius-lg);
    outline: none;
    transition: background var(--transition-fast);
  }

  .avatar-btn:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .avatar-btn:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .avatar-img {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: #1e293b;
    border: 1.5px solid rgba(255, 255, 255, 0.08);
    transition: border-color var(--transition-fast);
    display: block;
  }

  .avatar-btn:hover .avatar-img,
  .avatar-btn[aria-expanded="true"] .avatar-img {
    border-color: rgba(99, 102, 241, 0.5);
  }

  .avatar-chevron {
    width: 13px;
    height: 13px;
    color: var(--text-secondary);
    transition: transform var(--transition-base);
    display: none; /* shown at ≥768px via shared rule above */
  }

  .avatar-btn[aria-expanded="true"] .avatar-chevron {
    transform: rotate(180deg);
    color: var(--text-primary);
  }

  /* Auth loading skeleton */
  .avatar-skeleton {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: #1e293b;
    animation: skeleton-pulse 1.4s ease-in-out infinite;
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.35; }
    50%       { opacity: 0.75; }
  }

  /* Sign In button (guest state) */
  .signin-btn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 14px;
    border-radius: var(--radius-md);
    text-decoration: none;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast),
      background var(--transition-fast);
    outline: none;
  }

  .signin-btn:hover {
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.04);
  }

  .signin-btn:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .signin-btn__icon {
    width: 14px;
    height: 14px;
  }


  /* ── Dropdown panel ──────────────────────────────────────────── */
  .dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 240px;
    background: var(--surface-raised);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-lg);
    box-shadow:
      var(--shadow-md),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
    overflow: hidden;
    transform-origin: top right;
    animation: dropdown-in var(--transition-spring) both;
  }

  .dropdown.is-closing {
    animation: dropdown-out var(--transition-base) both;
  }

  @keyframes dropdown-in {
    from { opacity: 0; transform: scale(0.94) translateY(-6px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes dropdown-out {
    from { opacity: 1; transform: scale(1) translateY(0); }
    to   { opacity: 0; transform: scale(0.94) translateY(-6px); }
  }

  .dropdown__header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 14px 12px;
  }

  .dropdown__avatar {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .dropdown__identity {
    min-width: 0;
  }

  .dropdown__name {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown__email {
    margin: 2px 0 0;
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown__divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.06);
    margin: 0;
  }

  .dropdown-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: color var(--transition-fast), background var(--transition-fast);
    outline: none;
  }

  .dropdown-link:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .dropdown-link:focus-visible {
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .dropdown-link--active {
    color: var(--accent);
  }

  .dropdown-link--active:hover {
    color: var(--accent-hover);
    background: var(--accent-subtle);
  }

  .dropdown-link--danger {
    color: #f87171;
  }

  .dropdown-link--danger:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.08);
  }

  .dropdown-link__icon {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }


  /* ── Mobile topbar ───────────────────────────────────────────── */
  .mobile-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px 0;
    gap: 12px;
  }

  /* 1. Hide the dock by default (Desktop view) */
  .mobile-dock {
    display: none;
  }

  /* 2. Only show the dock on screens smaller than 768px (Mobile/Tablet) */
  @media (max-width: 768px) {
    .mobile-dock {
      position: fixed;
      left: 12px;
      right: 12px;
      bottom: 12px;
      z-index: 49;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 4px;
      padding: 8px 6px;
      border-radius: var(--radius-xl);
      background: rgba(8, 8, 12, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
    }
  }
  .mobile-dock__item {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 8px 4px;
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--text-secondary);
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      transform var(--transition-fast);
    outline: none;
    position: relative;
  }

  .mobile-dock__item:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }

  .mobile-dock__item:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .mobile-dock__item--active {
    color: var(--accent);
    background: var(--accent-subtle);
  }

  /* Active dot indicator */
  .mobile-dock__item--active::after {
    content: '';
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--accent);
  }

  /* Elevated primary CTA (Write) */
  .mobile-dock__item--primary {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(99,102,241,0.26), rgba(139,92,246,0.20));
    border: 1px solid rgba(99, 102, 241, 0.2);
    transform: translateY(-5px);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.25);
  }

  .mobile-dock__item--primary:hover {
    color: #fff;
    background: linear-gradient(135deg, rgba(99,102,241,0.34), rgba(139,92,246,0.26));
    transform: translateY(-8px);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.35);
  }

  .mobile-dock__icon {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }

  .mobile-dock__label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1;
    text-align: center;
  }

  /* Reserve space so content clears the dock */
  @media (max-width: 767px) {
    body { padding-bottom: 100px; }
  }


  /* ── Scroll progress bar ─────────────────────────────────────── */
  .nav-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: calc(var(--scroll-progress, 0) * 1%);
    background: linear-gradient(90deg, var(--accent), #a78bfa);
    transition: width 60ms linear;
    pointer-events: none;
    border-radius: 0 2px 2px 0;
  }


  /* ── Command palette overlay ─────────────────────────────────── */
  .command-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 72px 16px 16px;
  }

  .command-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .command-panel {
    position: relative;
    width: min(640px, 100%);
    border-radius: var(--radius-2xl);
    background: var(--surface-overlay);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: var(--shadow-lg);
    padding: 20px;
    animation: command-in var(--transition-spring) both;
  }

  @keyframes command-in {
    from { opacity: 0; transform: translateY(-14px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .command-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .command-header__text { flex: 1; }

  .command-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .command-subtitle {
    margin: 3px 0 0;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .command-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-secondary);
    cursor: pointer;
    outline: none;
    flex-shrink: 0;
    transition: color var(--transition-fast), background var(--transition-fast);
  }

  .command-close:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.08);
  }

  .command-close:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
  }

  .command-close__icon {
    width: 15px;
    height: 15px;
  }

  .command-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    margin-bottom: 12px;
    transition: border-color var(--transition-fast);
  }

  .command-search:focus-within {
    border-color: rgba(99, 102, 241, 0.35);
  }

  .command-search__icon {
    width: 16px;
    height: 16px;
    color: #94a3b8;
    flex-shrink: 0;
  }

  .command-input {
    flex: 1;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 14px;
    min-width: 0;
  }

  .command-input::placeholder {
    color: #475569;
  }

  .command-list {
    display: grid;
    gap: 4px;
    max-height: min(52vh, 420px);
    overflow-y: auto;
    padding-right: 2px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.08) transparent;
  }

  .command-list::-webkit-scrollbar {
    width: 4px;
  }

  .command-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .command-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }

  .command-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 11px 14px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(255, 255, 255, 0.02);
    color: var(--text-secondary);
    cursor: pointer;
    text-align: left;
    outline: none;
    transition:
      background var(--transition-fast),
      color var(--transition-fast),
      border-color var(--transition-fast);
  }

  .command-item:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .command-item:focus-visible {
    box-shadow: 0 0 0 2px var(--accent);
    outline: none;
  }

  /* Keyboard focus highlight (for arrow-key navigation) */
  .command-item.is-focused {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .command-item--active {
    background: var(--accent-subtle);
    color: var(--accent);
    border-color: rgba(99, 102, 241, 0.2);
  }

  .command-item--active:hover {
    background: var(--accent-muted);
    color: var(--accent-hover);
  }

  .command-item__icon-wrap {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .command-item--active .command-item__icon-wrap {
    background: var(--accent-muted);
  }

  .command-item__icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .command-item__label {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .command-item__shortcut {
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
  }

  .command-item__badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--accent-subtle);
    color: var(--accent);
    white-space: nowrap;
  }

  .command-empty {
    padding: 32px 16px;
    text-align: center;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .command-footer {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 16px;
    margin-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 12px;
  }

  .command-footer__hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: #475569;
  }

  .command-footer__hint kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    font-size: 10px;
    font-family: inherit;
    color: #64748b;
    line-height: 1.6;
  }
`;
