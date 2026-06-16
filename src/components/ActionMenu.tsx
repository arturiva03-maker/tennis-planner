import { useState, useRef, useEffect, ReactNode } from "react";

export type ActionMenuItem = {
  label: ReactNode;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
};

/**
 * Wiederverwendbares "Aktionen ▾"-Overflow-Menue. Buendelt mehrere gleichartige
 * Buttons hinter einem Trigger, ohne ihre Funktion zu aendern: jeder Eintrag
 * behaelt seinen exakten onClick. Nutzt das vorhandene Dropdown-CSS
 * (.dropdownMenu/.dropdownItem/.dropdownArrow) aus App.css.
 */
export default function ActionMenu({
  label = "Aktionen",
  items,
  children,
  buttonClassName = "btn btnGhost",
  buttonStyle,
  align = "left",
  menuWidth = 240,
}: {
  label?: string;
  items?: ActionMenuItem[];
  children?: ReactNode;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  align?: "left" | "right";
  menuWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = (items ?? []).filter((i) => !i.hidden);
  if (!children && visible.length === 0) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={buttonClassName}
        style={buttonStyle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label} <span className="dropdownArrow" style={{ marginLeft: 4 }}>▾</span>
      </button>
      {open && (
        <div
          className="dropdownMenu"
          role="menu"
          style={{
            left: align === "right" ? "auto" : 0,
            right: align === "right" ? 0 : "auto",
            minWidth: menuWidth,
          }}
        >
          {children ? (
            // Bestehende Buttons unveraendert als Menue-Inhalt; Klick schliesst das Menue
            // (per Bubbling), der originale onClick des Buttons laeuft dabei normal.
            <div
              style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8 }}
              onClick={() => setOpen(false)}
            >
              {children}
            </div>
          ) : (
            visible.map((it, i) => (
              <div
                key={i}
                role="menuitem"
                className="dropdownItem"
                style={it.danger ? { color: "var(--danger)", fontWeight: 600 } : undefined}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
              >
                {it.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
