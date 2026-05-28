export type ThemePref = "light" | "dark" | "system"

const THEME_KEY = "intakepad:theme"

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === "light" || v === "dark" || v === "system") return v
  } catch {}
  return "system"
}

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    } catch {
      return "light"
    }
  }
  return pref
}

export function applyTheme(pref: ThemePref) {
  const resolved = resolveTheme(pref)
  document.documentElement.setAttribute("data-theme", resolved)
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {}
  applyTheme(pref)
}

/** Inline <head> script: set data-theme before first paint to avoid flash. */
export const themeInitScript = `(function(){try{var p=localStorage.getItem('intakepad:theme');var d=p==='dark'||((p===null||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`
