// Shared "jump to section" scroll helper.
//
// Retries via rAF until the target element mounts — handles cases where a
// section is un-hidden (or a wizard cluster renders) asynchronously after the
// triggering state update, so the element is not yet in the DOM on the first
// tick. Once found: smooth-scroll to it, then move focus to it for keyboard
// users. `preventScroll: true` is REQUIRED — a plain focus() auto-scrolls
// instantly and cancels the smooth scroll.
export function scrollToSection(sectionId: string, attempts = 0): void {
  const el = document.getElementById(sectionId)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
    return
  }
  if (attempts < 10) {
    requestAnimationFrame(() => scrollToSection(sectionId, attempts + 1))
  }
}
