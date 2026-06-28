import MigrationWizardController from "./MigrationWizardController";

export default function MigrationWizard({ onBackToHome }: { onBackToHome?: () => void }) {
  return <MigrationWizardController onBackToHome={onBackToHome} />;
}
