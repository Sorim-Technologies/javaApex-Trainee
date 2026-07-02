export const getPlannedRefactoringSteps = (
  migrationPreview: any,
  selectedSourceVersion: string,
  selectedTargetVersion: string,
  repoAnalysis: any,
  fixBusinessLogic: boolean
): string[] => {
  const previewDescriptions = migrationPreview
    ? Array.from(
        new Map(
          Object.values(migrationPreview.changes.file_changes)
            .flatMap((fileChanges: any) => fileChanges)
            .map((change: any) => [change.description, change])
        ).values()
      )
    : [];

  const refactoringSteps =
    previewDescriptions.length > 0
      ? previewDescriptions.slice(0, 5).map((change: any) => {
          const occurrences =
            change.occurrences && change.occurrences > 1 ? ` (${change.occurrences} matches)` : "";
          return `${change.description}${occurrences}`;
        })
      : [
          `Upgrade Java language and build compatibility from Java ${selectedSourceVersion} to Java ${
            selectedTargetVersion || "the selected target version"
          }`,
          "Refactor deprecated or incompatible Java APIs to supported equivalents",
          "Modernize exception handling, imports, and resource-management patterns",
          "Adjust framework and dependency usage for target-version compatibility",
        ];

  if (migrationPreview?.changes.dependencies_to_update?.length) {
    refactoringSteps.push(
      `Update ${
        migrationPreview.changes.dependencies_to_update.length
      } dependency version${
        migrationPreview.changes.dependencies_to_update.length === 1 ? "" : "s"
      } for compatibility`
    );
  } else if (repoAnalysis?.dependencies?.length) {
    refactoringSteps.push("Adjust framework and dependency usage for target-version compatibility");
  }

  if (
    fixBusinessLogic &&
    !refactoringSteps.some((stepItem) => stepItem.toLowerCase().includes("business logic"))
  ) {
    refactoringSteps.push("Apply business-logic-safe fixes where migration introduces risky behavior changes");
  }

  const endpointCount = repoAnalysis?.api_endpoints?.length ?? 0;
  if (endpointCount > 0) {
    refactoringSteps.push(
      `Preserve and validate ${endpointCount} detected API endpoint${
        endpointCount === 1 ? "" : "s"
      } during refactoring`
    );
  }

  return refactoringSteps;
};
export default getPlannedRefactoringSteps;
