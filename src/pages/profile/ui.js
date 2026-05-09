// src/pages/profile/ui.js
// Profile page UI — modal controls, form handling, display updates, and toast notifications.

export function initProfileUI() {
  const modal = document.getElementById('edit-modal');
  const profileForm = document.getElementById('profile-form');
  const btnEditDesktop = document.getElementById('btn-edit-desktop');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const btnNewStory = document.getElementById('btn-new-story');
  const btnEditMobile = document.getElementById('btn-edit-mobile');

  const toggleModal = () => modal.classList.toggle('hidden');

  if (btnEditDesktop) btnEditDesktop.addEventListener('click', toggleModal);
  if (btnEditMobile) btnEditMobile.addEventListener('click', toggleModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', toggleModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', toggleModal);

  if (btnNewStory) {
    btnNewStory.addEventListener('click', () => {
      showNotification('Opening Story Editor...', 'success');
    });
  }

  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (window.saveProfile) {
        await window.saveProfile();
        toggleModal();
        showNotification('Profile synced with legends.', 'success');
      }
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === modal) toggleModal();
  });
}

/**
 * Updates visible profile fields and form inputs with data from Firestore.
 *
 * @param {Object} data - Profile data object with name and bio fields
 */
export function updateProfileUI(data) {
  setText('desktop-display-name', data.name || 'Explorer');
  setText('mobile-display-name', data.name || 'Explorer');
  setText('desktop-display-bio', data.bio || 'Preserving legends...');
  setText('mobile-display-bio', data.bio || 'Preserving legends...');
  setInput('input-name', data.name || '');
  setInput('input-bio', data.bio || '');
}

/**
 * Shows a toast notification with a success or error style.
 * Automatically removes the toast after 3 seconds.
 *
 * @param {string} message - Message text to display
 * @param {'success'|'error'} type - Visual style of the toast
 */
export function showNotification(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-in flex items-center gap-3 px-5 py-4 rounded-2xl border bg-zinc-900 shadow-2xl pointer-events-auto ${
    type === 'success' ? 'border-indigo-500/50 text-white' : 'border-red-500/50 text-red-200'
  }`;

  toast.innerHTML = `
    <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"
       class="${type === 'success' ? 'text-indigo-500' : 'text-red-500'}"></i>
    <span class="text-sm font-semibold">${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function setInput(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}
