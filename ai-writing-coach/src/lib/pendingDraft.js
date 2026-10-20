const STORAGE_KEY = "sabiwrite.pendingDraft";
const MAX_DRAFT_LENGTH = 4000;

function isValidDraft(text) {
  return (
    typeof text === "string" &&
    text.trim().length > 0 &&
    text.length <= MAX_DRAFT_LENGTH
  );
}

export function savePendingDraft(text) {
  if (!isValidDraft(text)) return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

export function readPendingDraft() {
  try {
    const text = window.sessionStorage.getItem(STORAGE_KEY);
    return isValidDraft(text) ? text : null;
  } catch {
    return null;
  }
}

export function clearPendingDraft() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in this browser session.
  }
}
