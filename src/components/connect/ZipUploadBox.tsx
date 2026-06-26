import type React from "react";

type ZipUploadStatus = "idle" | "ready" | "uploading" | "success" | "error";

interface ZipUploadBoxProps {
  styles: Record<string, React.CSSProperties>;
  selectedZipFile: File | null;
  zipUploadStatus: ZipUploadStatus;
  zipDragActive: boolean;
  zipUploadProgress: number;
  zipUploadMessage: string;
  onDragActiveChange: (active: boolean) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
  onContinue: () => void;
}

export default function ZipUploadBox({
  styles,
  selectedZipFile,
  zipUploadStatus,
  zipDragActive,
  zipUploadProgress,
  zipUploadMessage,
  onDragActiveChange,
  onFileChange,
  onDrop,
  onContinue,
}: ZipUploadBoxProps) {
  return (
    <>
      <div style={styles.field}>
        <label style={styles.label}>Upload Local ZIP</label>
        <label
          className={`zip-upload-box ${zipUploadStatus === "ready" ? "zip-upload-box--ready" : ""} ${zipUploadStatus === "error" ? "zip-upload-box--error" : ""} ${zipUploadStatus === "success" ? "zip-upload-box--success" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (zipUploadStatus !== "uploading") onDragActiveChange(true);
          }}
          onDragLeave={() => onDragActiveChange(false)}
          onDrop={onDrop}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            minHeight: 170,
            padding: "26px",
            border: `2px dashed ${zipDragActive ? "#2563eb" : zipUploadStatus === "error" ? "#ef4444" : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "#22c55e" : "#cbd5e1"}`,
            borderRadius: 14,
            background: zipDragActive ? "#eff6ff" : zipUploadStatus === "error" ? "#fef2f2" : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "#f0fdf4" : "#f8fafc",
            cursor: zipUploadStatus === "uploading" ? "not-allowed" : "pointer",
            textAlign: "center",
            transition: "all 0.2s ease",
          }}
        >
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            disabled={zipUploadStatus === "uploading"}
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: 34 }}>{zipUploadStatus === "success" ? "✅" : zipUploadStatus === "error" ? "⚠️" : "📦"}</div>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>
            {selectedZipFile ? selectedZipFile.name : "Drop a .zip file here or click to browse"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            Only .zip files are accepted.
          </div>
        </label>

        {(zipUploadStatus === "uploading" || zipUploadStatus === "success") && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "#475569", fontWeight: 700 }}>
              <span>{zipUploadStatus === "success" ? "Upload complete" : "Uploading..."}</span>
              <span>{zipUploadProgress}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: "#e2e8f0" }}>
              <div style={{ width: `${zipUploadProgress}%`, height: "100%", background: "#2563eb", transition: "width 0.25s ease" }} />
            </div>
          </div>
        )}

        {zipUploadMessage && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: zipUploadStatus === "error" ? "#dc2626" : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "#16a34a" : "#475569",
              fontWeight: zipUploadStatus === "error" || zipUploadStatus === "success" || zipUploadStatus === "ready" ? 700 : 500,
            }}
          >
            {zipUploadStatus === "uploading" ? "⏳ " : zipUploadStatus === "success" || zipUploadStatus === "ready" ? "✓ " : zipUploadStatus === "error" ? "⚠️ " : ""}
            {zipUploadMessage}
          </div>
        )}
      </div>

      <div style={styles.btnRow}>
        <button
          style={{ ...styles.primaryBtn, opacity: selectedZipFile && zipUploadStatus !== "uploading" ? 1 : 0.5 }}
          disabled={!selectedZipFile || zipUploadStatus === "uploading"}
          onClick={onContinue}
        >
          {zipUploadStatus === "uploading" ? "Uploading..." : "Upload & Continue →"}
        </button>
      </div>
    </>
  );
}
