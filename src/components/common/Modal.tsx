import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number | string;
  backgroundOverlay?: string;
  modalContentStyle?: React.CSSProperties;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 900,
  backgroundOverlay = "rgba(0,0,0,0.7)",
  modalContentStyle,
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: backgroundOverlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 12,
          width: "90%",
          maxWidth: maxWidth,
          maxHeight: "85vh",
          overflow: "hidden",
          boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
          display: "flex",
          flexDirection: "column",
          ...modalContentStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              backgroundColor: "#f6f8fa",
              borderBottom: "1px solid #d0d7de",
            }}
          >
            {title}
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 18,
                fontWeight: 700,
                cursor: "pointer",
                color: "#475569",
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
export default Modal;
