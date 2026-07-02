import React from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  placeholder?: string;
}

export function Select({ label, options, style, ...props }: SelectProps) {
  const baseStyles: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    fontSize: 14,
    borderRadius: 10,
    border: "1px solid var(--border)",
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
    transition: "all 0.3s ease",
    cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
    outline: "none",
    ...style,
  };

  return (
    <div style={{ marginBottom: 16, width: "100%" }}>
      {label && (
        <label
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 8,
            display: "block",
            color: "var(--foreground)",
          }}
        >
          {label}
        </label>
      )}
      <select style={baseStyles} {...props}>
        {props.placeholder && (
          <option value="" disabled>
            {props.placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
export default Select;
