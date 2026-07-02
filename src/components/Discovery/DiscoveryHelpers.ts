import React from "react";
import { Coffee, FileCode, FileJson, Settings, FileText, Globe, Palette, Database, Terminal } from "lucide-react";
import type { RepoFile } from "../../types/migration";

export const getFileLanguage = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const langMap: { [key: string]: string } = {
    java: "Java",
    xml: "XML",
    json: "JSON",
    yml: "YAML",
    yaml: "YAML",
    properties: "Properties",
    md: "Markdown",
    gradle: "Gradle",
    kt: "Kotlin",
    js: "JavaScript",
    ts: "TypeScript",
    html: "HTML",
    css: "CSS",
    sql: "SQL",
    sh: "Shell",
    bat: "Batch",
    txt: "Text",
  };
  return langMap[ext || ""] || "Text";
};

export const getFileIcon = (file: RepoFile): React.ReactNode => {
  if (file.type === "dir") return "📁";
  const ext = file.name.split(".").pop()?.toLowerCase();
  const iconMap: { [key: string]: React.ReactNode } = {
    java: React.createElement(Coffee, { size: 16 }),
    xml: React.createElement(FileCode, { size: 16 }),
    json: React.createElement(FileJson, { size: 16 }),
    yml: React.createElement(Settings, { size: 16 }),
    yaml: React.createElement(Settings, { size: 16 }),
    properties: React.createElement(Settings, { size: 16 }),
    md: React.createElement(FileText, { size: 16 }),
    gradle: React.createElement(FileCode, { size: 16 }),
    kt: React.createElement(FileCode, { size: 16 }),
    js: React.createElement(FileCode, { size: 16 }),
    ts: React.createElement(FileCode, { size: 16 }),
    html: React.createElement(Globe, { size: 16 }),
    css: React.createElement(Palette, { size: 16 }),
    sql: React.createElement(Database, { size: 16 }),
    sh: React.createElement(Terminal, { size: 16 }),
    txt: React.createElement(FileText, { size: 16 }),
  };
  return iconMap[ext || ""] || "📄";
};
