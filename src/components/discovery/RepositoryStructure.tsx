import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import type { RepoFile } from "../../services/api";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children: TreeNode[];
}

interface RepositoryStructureProps {
  repositoryName: string;
  rootFiles: RepoFile[];
  javaFiles?: string[];
  loading?: boolean;
  onLoadPath?: (path: string) => Promise<RepoFile[]>;
}

const sortNodes = (nodes: TreeNode[]) =>
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

const insertPath = (root: TreeNode, path: string) => {
  const parts = path.split("/").filter(Boolean);
  let cursor = root;

  parts.forEach((part, index) => {
    const isFile = index === parts.length - 1 && part.includes(".");
    let next = cursor.children.find((child) => child.name === part);

    if (!next) {
      next = {
        name: part,
        path: parts.slice(0, index + 1).join("/"),
        type: isFile ? "file" : "dir",
        children: [],
      };
      cursor.children.push(next);
    }

    cursor = next;
  });
};

const buildTree = (repositoryName: string, rootFiles: RepoFile[], javaFiles: string[] = []) => {
  const root: TreeNode = {
    name: repositoryName || "project",
    path: "",
    type: "dir",
    children: [],
  };

  rootFiles.forEach((file) => {
    root.children.push({
      name: file.name,
      path: file.path,
      type: file.type,
      children: [],
    });
  });

  javaFiles.forEach((path) => insertPath(root, path));

  if (root.children.length === 0) {
    ["src/main/java", "src/main/resources", "pom.xml", "README.md"].forEach((path) =>
      insertPath(root, path)
    );
  }

  const sortDeep = (node: TreeNode) => {
    sortNodes(node.children);
    node.children.forEach(sortDeep);
  };
  sortDeep(root);
  return root;
};

const fileIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.endsWith(".java")) return <FileCode2 size={15} />;
  if (lower.endsWith(".md") || lower.endsWith(".txt")) return <FileText size={15} />;
  return <File size={15} />;
};

export default function RepositoryStructure({
  repositoryName,
  rootFiles,
  javaFiles,
  loading,
  onLoadPath,
}: RepositoryStructureProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([""]));
  const [childrenByPath, setChildrenByPath] = useState<Record<string, RepoFile[]>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const baseTree = useMemo(
    () => buildTree(repositoryName, rootFiles, javaFiles),
    [repositoryName, rootFiles, javaFiles]
  );

  const mergedTree = useMemo(() => {
    const clone = structuredClone(baseTree) as TreeNode;

    const findNode = (node: TreeNode, path: string): TreeNode | null => {
      if (node.path === path) return node;
      for (const child of node.children) {
        const found = findNode(child, path);
        if (found) return found;
      }
      return null;
    };

    Object.entries(childrenByPath).forEach(([path, children]) => {
      const node = findNode(clone, path);
      if (!node) return;
      node.children = sortNodes(
        children.map((file) => ({
          name: file.name,
          path: file.path,
          type: file.type,
          children: [],
        }))
      );
    });

    return clone;
  }, [baseTree, childrenByPath]);

  const toggle = async (node: TreeNode) => {
    const next = new Set(expanded);
    if (next.has(node.path)) {
      next.delete(node.path);
      setExpanded(next);
      return;
    }

    next.add(node.path);
    setExpanded(next);

    if (node.type === "dir" && onLoadPath && node.path && !childrenByPath[node.path]) {
      setLoadingPath(node.path);
      try {
        const files = await onLoadPath(node.path);
        setChildrenByPath((current) => ({ ...current, [node.path]: files }));
      } finally {
        setLoadingPath(null);
      }
    }
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expanded.has(node.path);
    const isDirectory = node.type === "dir";

    return (
      <div key={`${node.path || node.name}-${depth}`}>
        <button
          className={`repo-tree-row ${isDirectory ? "folder" : "file"}`}
          type="button"
          style={{ paddingLeft: 10 + depth * 18 }}
          onClick={() => isDirectory && void toggle(node)}
        >
          {isDirectory ? (
            isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />
          ) : (
            <span className="repo-tree-indent" />
          )}
          {isDirectory ? (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />) : fileIcon(node.name)}
          <span>{node.name}</span>
          {loadingPath === node.path ? <em>Loading</em> : null}
        </button>
        {isDirectory && isExpanded ? node.children.map((child) => renderNode(child, depth + 1)) : null}
      </div>
    );
  };

  return (
    <article className="discovery-card repository-structure-card">
      <div className="discovery-card-header">
        <h2>Repository Structure</h2>
        <button
          className="discovery-subtle-button inline"
          type="button"
          onClick={() => {
            const collect = (node: TreeNode, paths: string[]) => {
              if (node.type === "dir") paths.push(node.path);
              node.children.forEach((child) => collect(child, paths));
              return paths;
            };
            setExpanded(new Set(collect(mergedTree, [])));
          }}
        >
          Expand All
        </button>
      </div>
      <div className="repo-tree">
        {loading ? <div className="repo-tree-loading">Loading repository files...</div> : renderNode(mergedTree)}
      </div>
    </article>
  );
}
