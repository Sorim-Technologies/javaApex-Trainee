import type React from "react";

type ZipUploadStatus = "idle" | "ready" | "uploading" | "success" | "error";

interface ZipUploadBoxProps {
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
  const zipBoxClassName = [
    "connect-zip-box",
    zipDragActive ? "connect-zip-box--drag-active" : "",
    zipUploadStatus === "ready" ? "connect-zip-box--ready" : "",
    zipUploadStatus === "error" ? "connect-zip-box--error" : "",
    zipUploadStatus === "success" ? "connect-zip-box--success" : "",
    zipUploadStatus === "uploading" ? "connect-zip-box--uploading" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const messageStatusClass =
    zipUploadStatus === "error"
      ? "connect-zip-message--error"
      : zipUploadStatus === "success" || zipUploadStatus === "ready"
        ? "connect-zip-message--success"
        : "";
  const canContinueZip = Boolean(selectedZipFile) && zipUploadStatus !== "uploading";

  return (
    <>
      <div className="connect-field">
        <label className="connect-label">Upload Local ZIP</label>
        <label
          className={zipBoxClassName}
          onDragOver={(event) => {
            event.preventDefault();
            if (zipUploadStatus !== "uploading") onDragActiveChange(true);
          }}
          onDragLeave={() => onDragActiveChange(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            disabled={zipUploadStatus === "uploading"}
            onChange={onFileChange}
            className="connect-zip-input"
          />
          <div className="connect-zip-icon">{zipUploadStatus === "success" ? "Done" : zipUploadStatus === "error" ? "Error" : "ZIP"}</div>
          <div className="connect-zip-file-name">
            {selectedZipFile ? selectedZipFile.name : "Drop a .zip file here or click to browse"}
          </div>
          <div className="connect-zip-hint">
            Only .zip files are accepted.
          </div>
        </label>

        {(zipUploadStatus === "uploading" || zipUploadStatus === "success") && (
          <div className="connect-zip-progress">
            <div className="connect-zip-progress-header">
              <span>{zipUploadStatus === "success" ? "Upload complete" : "Uploading..."}</span>
              <span>{zipUploadProgress}%</span>
            </div>
            <progress className="connect-zip-progress-meter" value={zipUploadProgress} max={100} />
          </div>
        )}

        {zipUploadMessage && (
          <div className={`connect-zip-message ${messageStatusClass}`}>
            {zipUploadMessage}
          </div>
        )}
      </div>

      <div className="connect-button-row">
        <button
          className={`connect-button connect-button--primary ${canContinueZip ? "" : "connect-button--disabled"}`}
          disabled={!selectedZipFile || zipUploadStatus === "uploading"}
          onClick={onContinue}
        >
          {zipUploadStatus === "uploading" ? "Uploading..." : "Upload and Continue"}
        </button>
      </div>
    </>
  );
}
