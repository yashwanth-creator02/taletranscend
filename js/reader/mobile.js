// js/reader/mobile.js

export function initMobileDrawer() {
  const drawer = document.getElementById("mobile-drawer");
  const btn = document.getElementById("drawer-btn");

  if (!drawer || !btn) return;

  btn.addEventListener("click", () => {
    drawer.classList.toggle("open");
  });
}
