// Whether rendered plans show grid lines. Shared by the examples viewer and the playground,
// and remembered between visits. Grid lines are shown unless the reader turned them off.

const STORAGE_KEY = "plandl-grid-lines";

export function gridPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setGridPreference(visible: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, visible ? "on" : "off");
  } catch {
    // Storage can be unavailable (private mode, blocked cookies); the toggle still works for this page.
  }
}
