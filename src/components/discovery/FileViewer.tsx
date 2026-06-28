import type { RepoFile } from "../../services/api";

interface FileViewerProps {
  selectedFile: RepoFile;
  fileContent: string;
  editedContent: string;
  fileLoading: boolean;
  isEditing: boolean;
  onClose: () => void;
  onEditedContentChange: (value: string) => void;
  getFileIcon: (file: RepoFile) => string;
  getFileLanguage: (fileName: string) => string;
}

interface FrameworkFileViewerModalProps {
  file: { name: string; path: string; content: string };
  loading: boolean;
  onClose: () => void;
}

export function FrameworkFileViewerModal({ file, loading, onClose }: FrameworkFileViewerModalProps) {
  return (
    <div className="discovery-framework-modal-overlay">
      <div className="discovery-framework-modal">
        <div className="discovery-framework-modal__header">
          <div className="discovery-framework-modal__title">
            <span className="discovery-framework-modal__icon">📄</span>
            <div>
              <div className="discovery-framework-modal__name">{file.name}</div>
              <div className="discovery-framework-modal__path">{file.path}</div>
            </div>
          </div>
          <div className="discovery-framework-modal__actions">
            <span className="discovery-readonly-badge">Read Only</span>
            <button type="button" onClick={onClose} className="discovery-small-button discovery-small-button--large">
              ✖️ Close
            </button>
          </div>
        </div>
        <div className="discovery-framework-modal__content">
          {loading ? (
            <div className="discovery-framework-modal__loading">
              <div className="discovery-spinner" />
              <span className="discovery-framework-modal__loading-text">Loading file content...</span>
            </div>
          ) : (
            <pre className="discovery-framework-modal__pre">{file.content || "// File content unavailable"}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FileViewer({
  selectedFile,
  fileContent,
  editedContent,
  fileLoading,
  isEditing,
  onClose,
  onEditedContentChange,
  getFileIcon,
  getFileLanguage,
}: FileViewerProps) {
  return (
    <div className="discovery-file-viewer">
      <div className="discovery-file-viewer__header">
        <div className="discovery-file-title">
          <span>{getFileIcon(selectedFile)}</span>
          <span className="discovery-file-name">{selectedFile.name}</span>
          <span className="discovery-language-badge">{getFileLanguage(selectedFile.name)}</span>
        </div>
        <div className="discovery-file-actions">
          <button type="button" onClick={onClose} className="discovery-small-button">
            ✖️ Close
          </button>
        </div>
      </div>

      <div className="discovery-code-surface">
        {fileLoading ? (
          <div className="discovery-code-loading">
            <div className="discovery-spinner" />
            <span className="discovery-code-loading__text">Loading file...</span>
          </div>
        ) : isEditing ? (
          <textarea
            value={editedContent}
            onChange={(event) => onEditedContentChange(event.target.value)}
            className="discovery-code-textarea"
          />
        ) : (
          <pre className="discovery-code-pre">{fileContent || "// Empty file"}</pre>
        )}
      </div>
    </div>
  );
}
