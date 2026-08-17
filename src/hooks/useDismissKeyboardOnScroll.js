// On mobile, scrolling a container while a text field inside it is focused
// should dismiss the on-screen keyboard (instead of it staying open and
// covering part of the form while you scroll past it) — blur whatever's
// focused as soon as a scroll happens.
//
// Shared so every scrollable dialog/sheet with inputs (Add/Edit transaction,
// Transfer, etc.) gets the exact same behaviour instead of each screen
// re-implementing it slightly differently.
export function useDismissKeyboardOnScroll() {
  return () => {
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      active.blur();
    }
  };
}
