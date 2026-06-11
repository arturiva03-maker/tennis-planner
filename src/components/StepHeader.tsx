import React from "react";

type StepHeaderProps = {
  current: number;
  total: number;
};

export default function StepHeader({ current, total }: StepHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color: "var(--text-muted)",
        marginBottom: 8,
      }}
    >
      <span>
        Schritt {current} von {total}
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 24,
              height: 4,
              borderRadius: 2,
              background: i < current ? "var(--primary, #1668c7)" : "#d7e3f1",
            }}
          />
        ))}
      </div>
    </div>
  );
}
