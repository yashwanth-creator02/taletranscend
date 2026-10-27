// scripts/generate-error-pages.js
//
// Generates the static error shells in src/views from one template. The pages
// share a single JS entry and a single CSS block; only the copy and actions
// differ. Generated files are committed, and `npm run build` / `npm run dev`
// regenerate them so the data below stays the source of truth.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const viewsDir = path.resolve(root, 'src/views');

const BASE_URL = 'https://taletranscend.web.app';

const DEFAULT_ACTIONS = [
  { href: '/index.html', icon: 'home', label: 'Return Home', variant: 'primary' },
  { href: '/library.html', icon: 'library', label: 'Browse Library', variant: 'ghost' },
];

const RETRY_ACTIONS = [
  { retry: true, icon: 'rotate-cw', label: 'Try Again', variant: 'primary' },
  { href: '/index.html', icon: 'home', label: 'Return Home', variant: 'ghost' },
];

const PAGES = [
  {
    code: 400,
    documentTitle: 'Bad Request',
    description: 'The archive could not interpret this request. Return to the known paths.',
    heading: 'A Broken Inscription',
    body: 'The request reached the archive, but its words would not take form. A malformed link or an unfinished form is the likely cause.',
    actions: DEFAULT_ACTIONS,
  },
  {
    code: 401,
    documentTitle: 'Sign-In Required',
    description: 'This chamber asks for a known identity. Sign in to continue.',
    heading: 'Identity Not Established',
    body: 'The archive cannot confirm who is asking. Sign in with your account, then return to the page you were reading.',
    actions: [
      { href: '/login.html', icon: 'log-in', label: 'Sign In', variant: 'primary' },
      { href: '/index.html', icon: 'home', label: 'Return Home', variant: 'ghost' },
    ],
  },
  {
    code: 403,
    documentTitle: 'Access Forbidden',
    description: 'This chamber is sealed. Your account does not hold the key.',
    heading: 'This Chamber Is Sealed',
    body: 'The archive recognized you, but not your authority to open this page. If you believe this is a mistake, return to the library and try another path.',
    actions: DEFAULT_ACTIONS,
  },
  {
    code: 404,
    documentTitle: 'Page Not Found',
    description: 'This path leads nowhere. Return to the archive.',
    heading: 'Lost in the Archives',
    body: 'The tale you seek has vanished into the mists of time. Perhaps it was never written, or the pages have turned to dust.',
    actions: DEFAULT_ACTIONS,
  },
  {
    code: 405,
    documentTitle: 'Method Not Allowed',
    description: 'The archive does not permit that action on this path.',
    heading: 'An Unrecognized Rite',
    body: 'This path exists, but it does not accept the action you attempted. Return to the archive and enter through one of its doors.',
    actions: DEFAULT_ACTIONS,
  },
  {
    code: 408,
    documentTitle: 'Request Timed Out',
    description: 'The archive waited, and the hourglass ran dry.',
    heading: 'The Hourglass Ran Dry',
    body: 'Your request took longer than the archive is willing to wait. The connection may have faltered. Try the path again when you are ready.',
    actions: RETRY_ACTIONS,
  },
  {
    code: 429,
    documentTitle: 'Too Many Requests',
    description: 'The gatekeeper asks for a moment of restraint.',
    heading: "The Gatekeeper's Patience",
    body: 'Too many requests arrived in too short a time. Pause for a moment, then try again. The archive is still here.',
    actions: RETRY_ACTIONS,
  },
  {
    code: 500,
    documentTitle: 'Server Error',
    description: 'A fracture opened in the archive. The keepers have been notified.',
    heading: 'A Fracture in the Archive',
    body: 'Something failed while the archive was assembling this page. The fault is ours, not yours. Reload the page, or return home while the keepers mend it.',
    actions: [
      { retry: true, icon: 'refresh-cw', label: 'Reload Page', variant: 'primary' },
      { href: '/index.html', icon: 'home', label: 'Return Home', variant: 'ghost' },
    ],
  },
  {
    code: 502,
    documentTitle: 'Bad Gateway',
    description: 'The passage between servers failed to hold.',
    heading: 'The Bridge Would Not Hold',
    body: 'The archive could not reach the service it depends on. This is usually brief. Try again in a moment.',
    actions: RETRY_ACTIONS,
  },
  {
    code: 503,
    documentTitle: 'Service Unavailable',
    description: 'The archive is resting or under repair.',
    heading: 'The Archive Is Resting',
    body: 'The archive is temporarily unavailable, either for maintenance or because the connection has failed. Try again shortly.',
    actions: RETRY_ACTIONS,
  },
  {
    code: 504,
    documentTitle: 'Gateway Timeout',
    description: 'The archive did not answer in time.',
    heading: 'The Archive Did Not Answer',
    body: 'A service behind the archive took too long to respond. The request was abandoned before it could finish. Try again in a moment.',
    actions: RETRY_ACTIONS,
  },
];

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function renderAction(action) {
  const className = `btn btn-${action.variant} px-6 py-3 rounded-xl text-sm font-semibold`;
  const icon = `<i data-lucide="${escapeHtml(action.icon)}" class="w-4 h-4"></i>`;

  if (action.retry) {
    return `<button type="button" data-error-retry class="${className}">
              ${icon}
              ${escapeHtml(action.label)}
            </button>`;
  }

  return `<a href="${escapeHtml(action.href)}" class="${className}">
              ${icon}
              ${escapeHtml(action.label)}
            </a>`;
}

function renderPage(page) {
  const documentTitle = `${page.documentTitle} | TaleTranscend`;
  const canonical = `${BASE_URL}/${page.code}`;
  const description = escapeHtml(page.description);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

    <title>${escapeHtml(documentTitle)}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="noindex" />
    <link rel="canonical" href="${canonical}" />

    <meta name="theme-color" content="#030305" />
    <meta name="color-scheme" content="dark" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TaleTranscend" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:title" content="${escapeHtml(documentTitle)}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${BASE_URL}/logo-wide.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="${BASE_URL}/logo-wide.png" />
    <meta name="twitter:title" content="${escapeHtml(documentTitle)}" />
    <meta name="twitter:description" content="${description}" />

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Cinzel:wght@500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap"
    />

    <script>
      (function () {
        try {
          var t = localStorage.getItem('tt_app_theme') || 'transcendental';
          var resolved = t;
          if (t === 'system') {
            resolved =
              window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'transcendental'
                : 'light';
          }
          document.documentElement.setAttribute('data-app-theme', resolved);
          document.documentElement.setAttribute('data-theme-preference', t);
        } catch (e) {}
      })();
    </script>

    <style>
      /* Critical Anti-FOUC Gate */
      html {
        background-color: #030305;
        color: #e2e8f0;
      }
      html[data-app-theme='dark'] {
        background-color: #0b0d13;
        color: #f8fafc;
      }
      html[data-app-theme='light'] {
        background-color: #f7f5f0;
        color: #1e293b;
      }
      body {
        background-color: inherit;
        color: inherit;
        font-family:
          'Inter',
          system-ui,
          -apple-system,
          sans-serif;
      }
      body:not(.booted) > *:not(#app-boot-curtain) {
        opacity: 0 !important;
        visibility: hidden !important;
      }
      #app-boot-curtain {
        position: fixed;
        inset: 0;
        background-color: inherit;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition:
          opacity 0.3s cubic-bezier(0, 0, 0.2, 1),
          visibility 0.3s cubic-bezier(0, 0, 0.2, 1);
        pointer-events: none;
      }
      body.booted #app-boot-curtain {
        opacity: 0;
        visibility: hidden;
      }
      .boot-crest {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        background: rgba(99, 102, 241, 0.08);
        border: 1px solid rgba(99, 102, 241, 0.2);
        box-shadow: 0 0 25px rgba(99, 102, 241, 0.2);
        animation: boot-pulse 1.4s ease-in-out infinite;
      }
      @keyframes boot-pulse {
        0%,
        100% {
          transform: scale(0.96);
          opacity: 0.6;
        }
        50% {
          transform: scale(1.04);
          opacity: 1;
        }
      }
    </style>
    <script>
      setTimeout(function () {
        if (document.body && !document.body.classList.contains('booted')) {
          document.body.classList.add('booted');
        }
      }, 1500);
    </script>
    <noscript>
      <style>
        body:not(.booted) > *:not(#app-boot-curtain) {
          opacity: 1 !important;
          visibility: visible !important;
        }
        #app-boot-curtain {
          display: none !important;
        }
      </style>
    </noscript>

    <script type="module" src="../pages/errors/error.js"></script>
  </head>

  <body
    class="antialiased selection:bg-indigo-500/30 page-fade-in flex flex-col h-screen overflow-hidden"
    data-error-code="${page.code}"
  >
    <div id="app-boot-curtain" aria-hidden="true">
      <div class="boot-crest">
        <img src="/logo.png" alt="" width="26" height="26" class="object-contain" />
      </div>
    </div>

    <a class="skip-link" href="#main-content">Skip to content</a>

    <div class="fixed inset-0 -z-10 bg-bg-base">
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_50%)]"
      ></div>
      <div
        class="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.05),transparent_40%)]"
      ></div>
    </div>

    <main id="main-content" class="flex-1 flex items-center justify-center px-6">
      <div class="text-center max-w-md">
        <h1 class="error-code-title">${page.code}</h1>

        <h2 class="mt-4 text-2xl font-bold text-ink font-cinzel">${escapeHtml(page.heading)}</h2>
        <p class="mt-3 text-sm text-muted leading-relaxed">${escapeHtml(page.body)}</p>

        <div class="mt-8 flex flex-wrap items-center justify-center gap-4">
          ${page.actions.map(renderAction).join('\n')}
        </div>

        <section id="error-context" class="error-context" aria-label="Request details" hidden>
          <div class="error-context__row">
            <span class="error-context__label">Requested</span>
            <span id="error-context-source" class="error-context__value"></span>
          </div>
          <div id="error-context-reason-row" class="error-context__row" hidden>
            <span class="error-context__label">Reason</span>
            <span id="error-context-reason" class="error-context__value"></span>
          </div>
          <div class="error-context__row">
            <span class="error-context__label">Logged</span>
            <time id="error-context-time" class="error-context__value"></time>
          </div>
        </section>

        <p id="error-offline-hint" class="error-offline-hint" hidden>
          You appear to be offline. Reconnect, then try again.
        </p>
      </div>
    </main>
  </body>
</html>
`;
}

if (!fs.existsSync(viewsDir)) {
  throw new Error(`Missing views directory: ${viewsDir}`);
}

let written = 0;
for (const page of PAGES) {
  const source = renderPage(page);
  const formatted = await prettier.format(source, {
    parser: 'html',
    printWidth: 100,
    singleQuote: true,
  });
  const target = path.join(viewsDir, `${page.code}.html`);
  fs.writeFileSync(target, formatted, 'utf8');
  written += 1;
}

console.log(`Generated ${written} error pages in ${viewsDir}`);
