import React, { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import type { ComplexityFile } from "../../services/migrationService";

interface Props {
  files: ComplexityFile[];
  onSelectFile?: (file: ComplexityFile) => void;
}

type SortField =
  | "file"
  | "package"
  | "complexity"
  | "level";

export default function ComplexityTable({
  files,
  onSelectFile,
}: Props) {

  const [search, setSearch] = useState("");

  const [sortField, setSortField] =
    useState<SortField>("complexity");

  const [ascending, setAscending] =
    useState(false);

  const filteredFiles = useMemo(() => {

    let result = files.filter((file) => {

      return (

        file.file
          .toLowerCase()
          .includes(search.toLowerCase())

        ||

        file.package
          .toLowerCase()
          .includes(search.toLowerCase())

      );

    });

    result.sort((a, b) => {

      let compare = 0;

      switch (sortField) {

        case "file":

          compare = a.file.localeCompare(b.file);

          break;

        case "package":

          compare = a.package.localeCompare(b.package);

          break;

        case "level":

          compare = a.level.localeCompare(b.level);

          break;

        case "complexity":

          compare = a.complexity - b.complexity;

          break;

      }

      return ascending ? compare : -compare;

    });

    return result;

  }, [files, search, sortField, ascending]);
  const headerStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  };

  return (

    <div

      style={{

        background: "#0f172a",

        borderRadius: 12,

        border: "1px solid #334155",

        padding: 20,

        marginTop: 30,

      }}

    >

      <div style={headerStyle}>

        <h3

          style={{

            margin: 0,

            color: "#f8fafc",

          }}

        >

          Complexity Details

        </h3>

        <div

          style={{

            display: "flex",

            alignItems: "center",

            gap: 10,

            background: "#1e293b",

            padding: "8px 12px",

            borderRadius: 8,

          }}

        >

          <Search

            size={16}

            color="#94a3b8"

          />

          <input

            value={search}

            placeholder="Search..."

            onChange={(e) =>

              setSearch(e.target.value)

            }

            style={{

              background: "transparent",

              border: "none",

              outline: "none",

              color: "white",

              width: 220,

            }}

          />

        </div>

      </div>
            <div
        style={{
          overflowX: "auto",
          borderRadius: 10,
          border: "1px solid #334155",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            color: "#f8fafc",
          }}
        >
          <thead
            style={{
              background: "#1e293b",
            }}
          >
            <tr>

              <SortableHeader
                title="File"
                field="file"
                sortField={sortField}
                ascending={ascending}
                onSort={(field) => {
                  if (sortField === field) {
                    setAscending(!ascending);
                  } else {
                    setSortField(field);
                    setAscending(true);
                  }
                }}
              />

              <SortableHeader
                title="Package"
                field="package"
                sortField={sortField}
                ascending={ascending}
                onSort={(field) => {
                  if (sortField === field) {
                    setAscending(!ascending);
                  } else {
                    setSortField(field);
                    setAscending(true);
                  }
                }}
              />

              <SortableHeader
                title="Complexity"
                field="complexity"
                sortField={sortField}
                ascending={ascending}
                onSort={(field) => {
                  if (sortField === field) {
                    setAscending(!ascending);
                  } else {
                    setSortField(field);
                    setAscending(true);
                  }
                }}
              />

              <SortableHeader
                title="Risk"
                field="level"
                sortField={sortField}
                ascending={ascending}
                onSort={(field) => {
                  if (sortField === field) {
                    setAscending(!ascending);
                  } else {
                    setSortField(field);
                    setAscending(true);
                  }
                }}
              />

            </tr>
          </thead>

          <tbody>

            {filteredFiles.map((file) => (

              <tr
                key={file.path}
                onClick={() => onSelectFile?.(file)}
                style={{
                  cursor: "pointer",
                  borderBottom: "1px solid #334155",
                  transition: "0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1e293b";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >

                <td style={cellStyle}>
                  {file.file}
                </td>

                <td style={cellStyle}>
                  {file.package}
                </td>

                <td style={cellStyle}>
                  {file.complexity}
                </td>

                <td style={cellStyle}>
                  <span
                    style={{
                      background: file.color,
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {file.level}
                  </span>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}
const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: 14,
  color: "#e2e8f0",
};

interface SortableHeaderProps {
  title: string;
  field: "file" | "package" | "complexity" | "level";
  sortField: "file" | "package" | "complexity" | "level";
  ascending: boolean;
  onSort: (
    field: "file" | "package" | "complexity" | "level"
  ) => void;
}

function SortableHeader({
  title,
  field,
  sortField,
  ascending,
  onSort,
}: SortableHeaderProps) {
  const active = sortField === field;

  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: "14px 16px",
        cursor: "pointer",
        textAlign: "left",
        color: active ? "#60a5fa" : "#f8fafc",
        fontWeight: 600,
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {title}

        <ArrowUpDown
          size={14}
          color={active ? "#60a5fa" : "#94a3b8"}
        />

        {active && (
          <span
            style={{
              fontSize: 11,
              color: "#94a3b8",
            }}
          >
            {ascending ? "▲" : "▼"}
          </span>
        )}
      </div>
    </th>
  );
}