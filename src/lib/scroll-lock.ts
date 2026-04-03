const SCROLL_LOCK_ATTR = "data-easybill-scroll-y";

export function lockDocumentScroll() {
  if (document.body.hasAttribute(SCROLL_LOCK_ATTR)) return;
  const y = window.scrollY;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.setAttribute(SCROLL_LOCK_ATTR, String(y));
  document.body.style.position = "fixed";
  document.body.style.top = `-${y}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

export function unlockDocumentScroll() {
  const raw = document.body.getAttribute(SCROLL_LOCK_ATTR);
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.removeAttribute(SCROLL_LOCK_ATTR);
  if (raw !== null) {
    const y = Number(raw);
    if (!Number.isNaN(y)) window.scrollTo(0, y);
  }
}
