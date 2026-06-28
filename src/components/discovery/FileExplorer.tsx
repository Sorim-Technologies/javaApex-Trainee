import type { RepoFile } from "../../services/api";
import FileViewer from "./FileViewer";

interface FileExplorerProps {
  repoName: string;
  currentPath: string;
  showFileExplorer: boolean;
  repoFiles: RepoFile[];
  selectedFile: RepoFile | null;
  fileContent: string;
  editedContent: string;
  fileLoading: boolean;
  isEditing: boolean;
  onToggleExplorer: () => void;
  onNavigateRoot: () => void;
  onNavigateBack: () => void;
  onFileClick: (file: RepoFile) => void;
  onCloseFile: () => void;
  onEditedContentChange: (value: string) => void;
  getFileIcon: (file: RepoFile) => string;
  getFileLanguage: (fileName: string) => string;
}

const formatSize = (size: number) => (size < 1024 ? `${size} B` : `${Math.round(size / 1024)} KB`);

export default function FileExplorer({
  repoName,
  currentPath,
  showFileExplorer,
  repoFiles,
  selectedFile,
  fileContent,
  editedContent,
  fileLoading,
  isEditing,
  onToggleExplorer,
  onNavigateRoot,
  onNavigateBack,
  onFileClick,
  onCloseFile,
  onEditedContentChange,
  getFileIcon,
  getFileLanguage,
}: FileExplorerProps) {
  return (
    <>
      <div className="discovery-section-title">📂 Repository Files</div>
      <div className="discovery-file-explorer">
        <div className="discovery-file-explorer__header">
          <div className="discovery-file-path">
            <span className="discovery-file-repo-name">{repoName}</span>
            {currentPath && (
              <>
                <span className="discovery-file-path-separator">/</span>
                <span className="discovery-file-current-path">{currentPath}</span>
              </>
            )}
          </div>
          <div className="discovery-file-actions">
            {currentPath && (
              <button type="button" onClick={onNavigateRoot} className="discovery-small-button">
                🏠 Root
              </button>
            )}
            <button type="button" onClick={onToggleExplorer} className="discovery-small-button">
              {showFileExplorer ? "🔽 Collapse" : "🔼 Expand"}
            </button>
          </div>
        </div>

        {showFileExplorer && (
          <div className="discovery-file-explorer__body">
            <div className={`discovery-file-tree ${selectedFile ? "discovery-file-tree--split" : ""}`}>
              {currentPath && (
                <div onClick={onNavigateBack} className="discovery-file-row discovery-file-row--back">
                  <span>⬆️</span>
                  <span className="discovery-file-current-path">..</span>
                </div>
              )}

              {repoFiles.length > 0 ? (
                repoFiles.map((file, index) => (
                  <div
                    key={index}
                    onClick={() => onFileClick(file)}
                    className={`discovery-file-row ${selectedFile?.path === file.path ? "discovery-file-row--selected" : ""}`}
                  >
                    <span className="discovery-file-icon">{getFileIcon(file)}</span>
                    <span className={`discovery-file-row-name ${file.type === "dir" ? "discovery-file-row-name--dir" : ""}`}>
                      {file.name}
                    </span>
                    {file.type === "file" && file.size > 0 && (
                      <span className="discovery-file-size">{formatSize(file.size)}</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="discovery-empty">No files found</div>
              )}
            </div>

            {selectedFile && (
              <FileViewer
                selectedFile={selectedFile}
                fileContent={fileContent}
                editedContent={editedContent}
                fileLoading={fileLoading}
                isEditing={isEditing}
                onClose={onCloseFile}
                onEditedContentChange={onEditedContentChange}
                getFileIcon={getFileIcon}
                getFileLanguage={getFileLanguage}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
