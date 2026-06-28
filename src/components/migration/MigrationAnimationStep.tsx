import type { WizardScreenContext } from "../wizard/model/wizardScreenContext";

export default function MigrationAnimationStep({ context }: { context: WizardScreenContext }) {
  const {
    animationProgress,
    migrationJob,
    migrationLogs,
    selectedSourceVersion,
    selectedTargetVersion,
    styles,
  } = context;

  const renderMigrationAnimation = () => (
    <div style={styles.card}>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>🚀</span>
        <div>
          <h2 style={styles.title}>Migration in Progress</h2>
          <p style={styles.subtitle}>Your project is being migrated... Please wait.</p>
        </div>
      </div>

      {/* Animated Migration Progress */}
      <div style={styles.animationContainer}>
        <div style={styles.migrationAnimation}>
          <div style={styles.animationHeader}>
            <div style={styles.migratingText}>Migrating Java Project</div>
            <div style={styles.versionTransition}>
              Java {selectedSourceVersion} → Java {selectedTargetVersion || "Select Java Version"}
            </div>
          </div>

          {/* Animated Steps */}
          <div style={styles.animationSteps}>
            <div style={{ ...styles.animationStep, opacity: animationProgress >= 10 ? 1 : 0.3, transition: "opacity 0.3s ease" }}>
              <div style={styles.stepIconAnimated}>📂</div>
              <div style={styles.stepText}>Analyzing Source Code</div>
              {animationProgress >= 10 && <div style={styles.checkMarkAnimated}>✓</div>}
            </div>

            <div style={{ ...styles.animationStep, opacity: animationProgress >= 30 ? 1 : 0.3, transition: "opacity 0.3s ease" }}>
              <div style={styles.stepIconAnimated}>⚙️</div>
              <div style={styles.stepText}>Updating Dependencies</div>
              {animationProgress >= 30 && <div style={styles.checkMarkAnimated}>✓</div>}
            </div>

            <div style={{ ...styles.animationStep, opacity: animationProgress >= 50 ? 1 : 0.3, transition: "opacity 0.3s ease" }}>
              <div style={styles.stepIconAnimated}>🔧</div>
              <div style={styles.stepText}>Applying Code Transformations</div>
              {animationProgress >= 50 && <div style={styles.checkMarkAnimated}>✓</div>}
            </div>

            <div style={{ ...styles.animationStep, opacity: animationProgress >= 70 ? 1 : 0.3, transition: "opacity 0.3s ease" }}>
              <div style={styles.stepIconAnimated}>🧪</div>
              <div style={styles.stepText}>Running Tests & Quality Checks</div>
              {animationProgress >= 70 && <div style={styles.checkMarkAnimated}>✓</div>}
            </div>

            <div style={{ ...styles.animationStep, opacity: animationProgress >= 90 ? 1 : 0.3, transition: "opacity 0.3s ease" }}>
              <div style={styles.stepIconAnimated}>📊</div>
              <div style={styles.stepText}>Generating Migration Report</div>
              {animationProgress >= 90 && <div style={styles.checkMarkAnimated}>✓</div>}
            </div>
          </div>

          {/* Progress Bar with Animation */}
          <div style={styles.animatedProgressSection}>
            <div style={styles.animatedProgressHeader}>
              <span>Migration Progress</span>
              <span>{animationProgress}%</span>
            </div>
            <div style={styles.animatedProgressBar}>
              <div style={{
                ...styles.animatedProgressFill,
                width: `${animationProgress}%`,
                background: `linear-gradient(90deg, #3b82f6 ${animationProgress - 10}%, #22c55e ${animationProgress}%)`
              }} />
            </div>
          </div>

          {/* Status Messages */}
          <div style={styles.statusMessages}>
            <div style={styles.currentStatus}>
              <strong>Status:</strong> {((migrationJob?.current_step && /fossa/i.test(migrationJob.current_step)) ? 'FOSSA_ANALYSIS' : (migrationJob?.status?.toUpperCase() || "INITIALIZING"))}
            </div>
            <div style={styles.currentStatus}>
              {migrationJob?.current_step || "Initializing migration..."}
            </div>
            {migrationLogs.length > 0 && (
              <div style={styles.recentLog}>
                <strong>Latest:</strong> {migrationLogs[migrationLogs.length - 1]}
              </div>
            )}
            {migrationJob?.status === "cloning" && (
              <div style={{ ...styles.recentLog, color: '#f59e0b', fontSize: 12 }}>
                ℹ️ Cloning repository... this may take a few minutes for large repositories. Please wait.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return renderMigrationAnimation();
}
