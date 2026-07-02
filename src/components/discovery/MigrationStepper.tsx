import {
  BarChart3,
  Check,
  FileSearch,
  GitBranch,
  Search,
  Zap,
} from "lucide-react";

const steps = [
  { label: "Connect", caption: "Connect to Repository", icon: GitBranch },
  { label: "Discovery", caption: "Repository Analysis", icon: Search },
  { label: "Strategy", caption: "Assessment & Planning", icon: FileSearch },
  { label: "Migration", caption: "Build Modernization", icon: Zap },
  { label: "Result", caption: "Migration Results", icon: BarChart3 },
];

export default function MigrationStepper() {
  return (
    <section className="discovery-stepper" aria-label="Migration progress timeline">
      {steps.map((step, index) => {
        const isComplete = index === 0;
        const isActive = index === 1;
        const Icon = isComplete ? Check : step.icon;

        return (
          <div className="discovery-stepper-item" key={step.label}>
            <div className={`discovery-stepper-node${isComplete ? " complete" : ""}${isActive ? " active" : ""}`}>
              <Icon size={18} />
            </div>
            {index < steps.length - 1 ? (
              <div className={`discovery-stepper-line${index === 0 ? " complete" : ""}`} />
            ) : null}
            <strong>{step.label}</strong>
            <span>{step.caption}</span>
          </div>
        );
      })}
    </section>
  );
}
