export const migrationApproachOptions = [
  {
    value: "fork",
    label: "Create New Repository",
    desc: "Push migrated code to a new repository in your account",
    tooltip: "Creates an entirely new repository with the migrated code in your connected GitHub account.",
    icon: "🍴",
    color: "#f59e0b",
  },
  {
    value: "branch",
    label: "Existing Repository (New Branch)",
    desc: "Push migrated code to a new branch in the source repository",
    tooltip: "Keeps the existing repository and publishes the migrated code on a separate branch for review and merge.",
    icon: "🌿",
    color: "#22c55e",
  },
];
