// src/pages/tale/inquire.js
// The Chronicler's Letter: Direct inquiry & connection with the author.

import { createLogger } from '@/utils';
import { auth } from '@fb/index.js';
import { showToast } from '@ui/components/toast.js';
import { initIcons } from '@ui/components/icons.js';
import { getAuthorStatus } from '@services/author.service.js';

const log = createLogger('ChroniclerInquire');

const INQUIRE_COOLDOWN_MS = 4000;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 800;

/**
 * Sets up The Chronicler's Letter inquiry and connection interface.
 *
 * @param {string} taleId
 * @param {Object} [tale]
 * @param {string} [userId]
 */
export function setupInquire(taleId, tale, userId = null) {
  log.info("Setting up Chronicler's Letter inquiry system", { taleId });

  const authorName = tale?.authorName || 'The Scribe';
  const authorId = tale?.authorId || '';
  let authorEmail = tale?.authorEmail || '';

  // 1. Hydrate Author Profile & Target Displays
  const authorDisplay = document.getElementById('inquire-author-display');
  if (authorDisplay) authorDisplay.textContent = authorName;

  const successAuthor = document.getElementById('success-author-target');
  if (successAuthor) successAuthor.textContent = authorName;

  const letterAuthorName = document.getElementById('letter-author-name');
  if (letterAuthorName) letterAuthorName.textContent = authorName;

  const letterAuthorBio = document.getElementById('letter-author-bio');
  if (letterAuthorBio) {
    letterAuthorBio.textContent =
      tale?.authorBio ||
      `Keeper of the chronicle archives and author of "${tale?.title || 'this chronicle'}".`;
  }

  const letterAuthorAvatar = document.getElementById('letter-author-avatar');
  if (letterAuthorAvatar) {
    const seed = encodeURIComponent((authorId || 'scribe').slice(0, 8));
    letterAuthorAvatar.src =
      tale?.authorAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    letterAuthorAvatar.alt = authorName;
  }

  const profileLink = document.getElementById('letter-author-profile-link');
  if (profileLink) {
    profileLink.href = authorId
      ? `/profile.html?uid=${encodeURIComponent(authorId)}`
      : '/library.html';
  }

  // 1b. Hydrate Author Correspondence Email Displays
  const updateAuthorEmailUI = (email) => {
    if (!email) return;
    const emailPill = document.getElementById('inquire-author-email-pill');
    const emailTarget = document.getElementById('inquire-author-email-target');
    const emailRow = document.getElementById('letter-author-email-row');
    const emailDisplay = document.getElementById('letter-author-email-display');
    const emailBtn = document.getElementById('letter-author-email-btn');

    if (emailPill && emailTarget) {
      emailTarget.textContent = email;
      emailPill.classList.remove('hidden');
    }
    if (emailRow && emailDisplay) {
      emailDisplay.textContent = email;
      emailRow.classList.remove('hidden');
    }
    if (emailBtn) {
      const subject = encodeURIComponent(`Missive regarding "${tale?.title || 'your chronicle'}"`);
      emailBtn.href = `mailto:${encodeURIComponent(email)}?subject=${subject}`;
      emailBtn.classList.remove('hidden');
    }
    initIcons();
  };

  if (authorEmail) {
    updateAuthorEmailUI(authorEmail);
  } else if (authorId) {
    getAuthorStatus(authorId)
      .then((status) => {
        if (status?.authorEmail) {
          authorEmail = status.authorEmail;
          updateAuthorEmailUI(authorEmail);
        }
      })
      .catch((err) => {
        log.debug('Could not fetch author registration status', err);
      });
  }

  // 2. Pre-fill reader moniker & contact if available
  const senderNameInput = document.getElementById('inquire-sender-name');
  const senderContactInput = document.getElementById('inquire-sender-contact');
  const messageInput = document.getElementById('inquire-message');
  const charCounter = document.getElementById('inquire-char-counter');
  const formError = document.getElementById('inquire-form-error');
  const categoryInput = document.getElementById('inquire-category');
  const form = document.getElementById('chronicler-inquire-form');
  const successContainer = document.getElementById('chronicler-inquire-success');
  const submitBtn = document.getElementById('inquire-submit-btn');
  const submitText = document.getElementById('inquire-submit-text');
  const inquireAnotherBtn = document.getElementById('btn-inquire-another');
  const openTeaserBtn = document.getElementById('btn-open-chronicler-letter');
  const quickBookmarkBtn = document.getElementById('letter-shelf-quick-btn');

  if (senderNameInput && !senderNameInput.value) {
    const storedMoniker = localStorage.getItem('tt_reader_moniker');
    const authDisplayName = auth.currentUser?.displayName;
    if (authDisplayName) {
      senderNameInput.value = authDisplayName;
    } else if (storedMoniker) {
      senderNameInput.value = storedMoniker;
    }
  }

  if (senderContactInput && !senderContactInput.value) {
    const authEmail = auth.currentUser?.email;
    if (authEmail) {
      senderContactInput.value = authEmail;
    }
  }

  // 3. Category Selector Chips
  const categoryChips = document.querySelectorAll('.inquiry-category-chip');
  categoryChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.category || 'lore';
      if (categoryInput) categoryInput.value = cat;

      categoryChips.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
    });
  });

  // 4. Character Counter & Dynamic Validation Feedback
  if (messageInput && charCounter) {
    messageInput.addEventListener('input', () => {
      const len = messageInput.value.length;
      charCounter.textContent = `${len} / ${MAX_MESSAGE_LENGTH}`;
      if (formError && !formError.classList.contains('hidden')) {
        formError.classList.add('hidden');
        formError.textContent = '';
      }
    });
  }

  // 5. Open Missive from Synopsis Teaser
  if (openTeaserBtn) {
    openTeaserBtn.addEventListener('click', () => {
      const tabBtn = document.querySelector('[data-tab="letter"]');
      if (tabBtn) {
        tabBtn.click();
        const contentLetter = document.getElementById('content-letter');
        if (contentLetter) {
          contentLetter.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        messageInput?.focus();
      }
    });
  }

  // 6. Quick Bookmark Button in Author Card
  if (quickBookmarkBtn) {
    quickBookmarkBtn.addEventListener('click', () => {
      const shelfBtn =
        document.getElementById('shelf-btn-desktop') || document.getElementById('shelf-btn');
      if (shelfBtn) {
        shelfBtn.click();
      } else {
        showToast('Tale saved to your shelf.', 'success');
      }
    });
  }

  // 7. Reset / Inscribe Another Button
  if (inquireAnotherBtn) {
    inquireAnotherBtn.addEventListener('click', () => {
      if (messageInput) {
        messageInput.value = '';
      }
      if (charCounter) {
        charCounter.textContent = `0 / ${MAX_MESSAGE_LENGTH}`;
      }
      if (form) form.classList.remove('hidden');
      if (successContainer) successContainer.classList.add('hidden');
      messageInput?.focus();
    });
  }

  // 8. Form Submission Handling
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const moniker = senderNameInput?.value.trim() || '';
      const contact = senderContactInput?.value.trim() || '';
      const message = messageInput?.value.trim() || '';
      const category = categoryInput?.value || 'lore';

      if (moniker.length < 2) {
        if (formError) {
          formError.textContent = 'Please enter your reader moniker (at least 2 characters).';
          formError.classList.remove('hidden');
        }
        senderNameInput?.focus();
        return;
      }

      if (message.length < MIN_MESSAGE_LENGTH) {
        if (formError) {
          formError.textContent = `Your missive must be at least ${MIN_MESSAGE_LENGTH} characters long.`;
          formError.classList.remove('hidden');
        }
        messageInput?.focus();
        return;
      }

      // Rate limit check
      const cooldownKey = `tt_inquire_cooldown_${taleId}`;
      const lastSent = Number(sessionStorage.getItem(cooldownKey) || 0);
      if (Date.now() - lastSent < INQUIRE_COOLDOWN_MS) {
        showToast('Please wait a moment before dispatching another missive.', 'info');
        return;
      }

      // UI pending state
      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = 'Dispatching...';

      try {
        // Persist reader moniker for future inquiries
        localStorage.setItem('tt_reader_moniker', moniker);

        // Store dispatched inquiry locally in archive missives
        const storageKey = `tt_inquiries_${taleId}`;
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        existing.unshift({
          id: Date.now(),
          taleId,
          userId: userId || auth.currentUser?.uid || 'anonymous',
          authorId,
          authorName,
          authorEmail: authorEmail || '',
          category,
          moniker,
          contact,
          message,
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem(storageKey, JSON.stringify(existing.slice(0, 30)));
        sessionStorage.setItem(cooldownKey, String(Date.now()));

        log.info('Missive dispatched successfully', { taleId, category, moniker });
        showToast('Your missive has been dispatched to the scribe!', 'success');

        // Show confirmation view
        form.classList.add('hidden');
        if (successContainer) successContainer.classList.remove('hidden');
        initIcons();
      } catch (err) {
        log.error('Failed to dispatch inquiry', err);
        showToast('Failed to dispatch missive. Please try again.', 'error');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = 'Dispatch Missive';
      }
    });
  }
}
