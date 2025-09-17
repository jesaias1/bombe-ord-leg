import { useEffect } from "react";

/**
 * Keeps CSS variables in sync with the real visual viewport (keyboard-safe).
 * Exposes:
 *  --ob-kb      : px of keyboard overlap (0 when closed)
 *  --ob-kb-pad  : safe bottom padding = max(safe-area, kb overlap)
 *  --ob-vh      : current visual viewport height in px
 */
export function useVisualViewportPadding() {
  useEffect(() => {
    const vv: any = (window as any).visualViewport;
    const root = document.documentElement;

    function updateVars() {
      const safe = (window as any).CSS?.supports?.("(env(safe-area-inset-bottom))")
        ? (parseInt(getComputedStyle(root).getPropertyValue("env(safe-area-inset-bottom)")) || 0)
        : 0;

      let kb = 0;
      let vh = window.innerHeight;

      if (vv) {
        const overlap = window.innerHeight - vv.height; // how much the keyboard shrinks view
        kb = Math.max(0, Math.round(overlap));
        vh = Math.round(vv.height);
      }

      root.style.setProperty("--ob-kb", `${kb}px`);
      root.style.setProperty("--ob-vh", `${vh}px`);
      root.style.setProperty("--ob-kb-pad", `max(${kb}px, ${safe}px)`);
    }

    updateVars();
    vv?.addEventListener?.("resize", updateVars);
    window.addEventListener("resize", updateVars);

    return () => {
      vv?.removeEventListener?.("resize", updateVars);
      window.removeEventListener("resize", updateVars);
    };
  }, []);
}