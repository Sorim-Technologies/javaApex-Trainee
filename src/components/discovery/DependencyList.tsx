import type { DependencyInfo } from "../../services/api";

interface DependencyListProps {
  dependencies: DependencyInfo[];
  getStatusLabel: (status: string) => string;
  isDetectedStatus: (status: string) => boolean;
}

export default function DependencyList({ dependencies, getStatusLabel, isDetectedStatus }: DependencyListProps) {
  return (
    <div className="discovery-dependency-list">
      {dependencies.map((dependency, index) => (
        <div key={index} className="inner-card-hover discovery-dependency-inner-card discovery-dependency-row">
          <span className="discovery-dependency-name">
            {dependency.group_id}:{dependency.artifact_id}
          </span>
          <span className="discovery-dependency-version">{dependency.current_version}</span>
          <span
            className={`discovery-detected-badge discovery-dependency-status ${
              isDetectedStatus(dependency.status) ? "" : "discovery-detected-badge--soft"
            }`}
          >
            {getStatusLabel(dependency.status)}
          </span>
        </div>
      ))}
    </div>
  );
}
