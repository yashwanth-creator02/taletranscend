// src/ui/icons.js
// Central Lucide icon registry.
// All icons used anywhere in the app must be listed in ICON_MAP below.
// Never import from 'lucide' directly in page or component files.
//
// Resilience design:
//   - The Lucide module is loaded via dynamic import so a bundler or
//     network failure does NOT crash the importing module at parse time.
//   - initIcons() always resolves — it never throws and never rejects.
//   - If the first render attempt fails, a single automatic retry fires
//     after RETRY_DELAY_MS. After that, icons simply stay blank; the
//     rest of the page is completely unaffected.
//   - A pending queue ensures calls made before the module is ready are
//     replayed once it resolves, so no call site needs to know about
//     the async nature of icon loading.

import { createLogger } from '../utils/logger.ts';

const log = createLogger('Icons');

const RETRY_DELAY_MS = 2000;
const RETRY_MAX = 2;

// Lazily resolved Lucide module — null until first successful dynamic import
let _lucide = null;
// True while the dynamic import is in flight
let _loading = false;
// Queue of { scope, resolve } entries waiting for the module to load
const _queue = [];

/* ─────────────────────────────────────────────
   Icon Map
   Every icon used anywhere in the app.
   Loaded lazily so a failure here never blocks page init.
   ───────────────────────────────────────────── */
async function _loadIcons() {
  const L = await import('lucide');
  return {
    // Navigation & Layout
    ChevronUp: L.ChevronUp,
    ChevronDown: L.ChevronDown,
    ChevronLeft: L.ChevronLeft,
    ChevronRight: L.ChevronRight,
    ArrowLeft: L.ArrowLeft,
    ArrowRight: L.ArrowRight,
    ArrowUp: L.ArrowUp,
    ArrowDown: L.ArrowDown,
    ArrowUpDown: L.ArrowUpDown,
    PanelLeftClose: L.PanelLeftClose,
    PanelLeftOpen: L.PanelLeftOpen,
    LayoutGrid: L.LayoutGrid,
    Maximize2: L.Maximize2,
    Minimize2: L.Minimize2,
    // Actions
    Edit: L.Edit,
    Edit3: L.Edit3,
    Trash2: L.Trash2,
    Plus: L.Plus,
    Minus: L.Minus,
    X: L.X,
    Check: L.Check,
    Send: L.Send,
    Download: L.Download,
    Copy: L.Copy,
    RotateCcw: L.RotateCcw,
    // Files & Content
    FileText: L.FileText,
    Book: L.Book,
    BookOpen: L.BookOpen,
    BookType: L.BookType,
    ScrollText: L.ScrollText,
    Scroll: L.Scroll,
    Feather: L.Feather,
    Archive: L.Archive,
    // Bookmarks & Links
    Bookmark: L.Bookmark,
    BookmarkPlus: L.BookmarkPlus,
    BookmarkMinus: L.BookmarkMinus,
    Share2: L.Share2,
    Link: L.Link,
    Globe: L.Globe,
    // Status & Alerts
    CheckCircle: L.CheckCircle,
    CheckCircle2: L.CheckCircle2,
    AlertCircle: L.AlertCircle,
    AlertTriangle: L.AlertTriangle,
    TriangleAlert: L.TriangleAlert,
    Circle: L.Circle,
    Info: L.Info,
    BadgeX: L.BadgeX,
    // Media
    Play: L.Play,
    Pause: L.Pause,
    Mic: L.Mic,
    Volume2: L.Volume2,
    // People
    User: L.User,
    UserCheck: L.UserCheck,
    Users2: L.Users2,
    // Charts & Stats
    BarChart2: L.BarChart2,
    Layers: L.Layers,
    Eye: L.Eye,
    Target: L.Target,
    // Time
    Clock: L.Clock,
    Clock3: L.Clock3,
    Clock4: L.Clock4,
    // Discovery
    Search: L.Search,
    Compass: L.Compass,
    Filter: L.Filter,
    Tags: L.Tags,
    Tag: L.Tag,
    MapPin: L.MapPin,
    // Effects & Decoration
    Sparkles: L.Sparkles,
    WandSparkles: L.WandSparkles,
    Wand2: L.Wand2,
    Flame: L.Flame,
    Heart: L.Heart,
    Star: L.Star,
    Crown: L.Crown,
    Award: L.Award,
    // Communication
    MessageSquare: L.MessageSquare,
    MessageSquarePlus: L.MessageSquarePlus,
    Database: L.Database,
    Cloud: L.Cloud,
    // UI Chrome
    Settings: L.Settings,
    Settings2: L.Settings2,
    Signature: L.Signature,
    MoreHorizontal: L.MoreHorizontal,
    Home: L.Home,
    // Writing & Editor
    PenTool: L.PenTool,
    PenLine: L.PenLine,
    List: L.List,
    Type: L.Type,
    Palette: L.Palette,
    Highlighter: L.Highlighter,
    // Social Platforms
    Github: L.Github,
    Twitter: L.Twitter,
    Instagram: L.Instagram,
    Linkedin: L.Linkedin,
    // Auth
    LogIn: L.LogIn,
    LogOut: L.LogOut,
    // Library / Achievements
    Library: L.Library,
    // createIcons function — stored alongside the icon map
    _createIcons: L.createIcons,
  };
}

/* ─────────────────────────────────────────────
   Module Bootstrap
   ───────────────────────────────────────────── */

/**
 * Attempts to dynamically import Lucide and cache the icon map.
 * Retries up to RETRY_MAX times on failure before giving up silently.
 * Flushes the pending queue once the module is available.
 *
 * @param {number} [attempt=0]
 */
async function _bootstrap(attempt = 0) {
  if (_lucide || _loading) return;
  _loading = true;

  try {
    _lucide = await _loadIcons();
    _loading = false;

    // Flush all queued initIcons() calls
    const pending = _queue.splice(0);
    for (const { scope, resolve } of pending) {
      _render(scope);
      resolve();
    }
  } catch {
    _loading = false;

    if (attempt < RETRY_MAX) {
      log.warn(
        `Lucide load failed (attempt ${attempt + 1}/${RETRY_MAX}). Retrying in ${RETRY_DELAY_MS}ms…`
      );
      setTimeout(() => _bootstrap(attempt + 1), RETRY_DELAY_MS);
    } else {
      log.warn('Lucide unavailable after all retries. Icons will not render.');
      // Flush queue as no-ops so callers are not left waiting forever
      const pending = _queue.splice(0);
      for (const { resolve } of pending) resolve();
    }
  }
}

/* ─────────────────────────────────────────────
   Render
   ───────────────────────────────────────────── */

/**
 * Internal renderer — calls createIcons() against a DOM scope.
 * Only called after _lucide is confirmed non-null.
 * Wrapped in try/catch so a single bad icon never crashes the page.
 *
 * @param {ParentNode} scope
 */
function _render(scope) {
  if (!_lucide?._createIcons) return;

  // Skip if there is nothing to render in this scope
  if (scope !== document && !(scope instanceof Element)) return;

  try {
    const { _createIcons: createIcons, ...icons } = _lucide;
    createIcons({
      icons,
      nameAttr: 'data-lucide',
      attrs: { 'stroke-width': 2 },
    });
  } catch (err) {
    // Never let icon rendering crash the page — just log and move on
    log.warn('createIcons() threw', err?.message ?? err);
  }
}

/* ─────────────────────────────────────────────
   Public API
   ───────────────────────────────────────────── */

/**
 * Renders all [data-lucide] icons in the given DOM scope.
 *
 * Contract:
 *   - Always returns a Promise<void> that resolves (never rejects).
 *   - If Lucide is not yet loaded, queues this call and resolves
 *     once the module is ready or after all retries are exhausted.
 *   - Safe to call with a specific element scope (e.g. initIcons(btn))
 *     or with no argument for the whole document.
 *   - If icons fail to render, the page continues to work normally —
 *     icon elements simply stay blank.
 *
 * @param {ParentNode} [scope=document]
 * @returns {Promise<void>}
 */
export function initIcons(scope = document) {
  // Module already loaded — render synchronously inside a microtask
  if (_lucide) {
    return Promise.resolve().then(() => _render(scope));
  }

  // Queue this call and kick off bootstrap if not already running
  return new Promise((resolve) => {
    _queue.push({ scope, resolve });
    if (!_loading) _bootstrap(0);
  });
}

// Eager bootstrap on module import — icons are ready as early as possible
// without blocking any importing module's own execution.
_bootstrap(0);
