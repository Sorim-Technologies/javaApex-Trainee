import MigrationWizardRuntime from "./MigrationWizardRuntime";

export default function MigrationWizard({ onBackToHome }: { onBackToHome?: () => void }) {
  return <MigrationWizardRuntime onBackToHome={onBackToHome} />;
}
