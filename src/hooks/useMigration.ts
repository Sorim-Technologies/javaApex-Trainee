import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type {
  MigrationResult,
  MigrationPreview,
  CodeChangeEntry,
  JavaVersionRecommendationResponse,
  RepoAnalysis,
  RepoInfo,
} from "../types/migration";
import {
  previewMigration,
  startMigration,
  getMigrationFossa,
  getJavaVersionRecommendation,
} from "../services/migrationService";
import { buildCodeChangesFromPreviewDiffs } from "../utils/formatters";

interface UseMigrationProps {
  step: number;
  setStep: (val: number) => void;
  selectedRepo: RepoInfo | null;
  repoUrl: string;
  repoAnalysis: RepoAnalysis | null;
  selectedSourceVersion: string;
  selectedTargetVersion: string;
  setSelectedTargetVersion: (val: string) => void;
  userSelectedVersion: string | null;
  currentToken: string;
  migrationApproach: string;
  selectedConversions: string[];
  runTests: boolean;
  runSonar: boolean;
  runFossa: boolean;
  fixBusinessLogic: boolean;
  riskLevel: string;
  setError: (val: string) => void;
}

export function useMigration({
  step,
  setStep,
  selectedRepo,
  repoUrl,
  repoAnalysis,
  selectedSourceVersion,
  selectedTargetVersion,
  setSelectedTargetVersion,
  userSelectedVersion,
  currentToken,
  migrationApproach,
  selectedConversions,
  runTests,
  runSonar,
  runFossa,
  fixBusinessLogic,
  riskLevel,
  setError,
}: UseMigrationProps) {
  const [migrationJob, setMigrationJob] = useState<MigrationResult | null>(null);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  // Recommendations
  const [versionRecommendation, setVersionRecommendation] = useState<JavaVersionRecommendationResponse | null>(null);
  const [versionRecommendationLoading, setVersionRecommendationLoading] = useState(false);
  const [versionRecommendationError, setVersionRecommendationError] = useState("");

  // Previews
  const [migrationPreview, setMigrationPreview] = useState<MigrationPreview | null>(null);
  const [migrationPreviewLoading, setMigrationPreviewLoading] = useState(false);
  const [migrationPreviewError, setMigrationPreviewError] = useState("");
  const [codeChanges, setCodeChanges] = useState<CodeChangeEntry[]>([]);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [showCodeChanges, setShowCodeChanges] = useState(true);

  // Fossa
  const [fossaResult, setFossaResult] = useState<any | null>(null);
  const [fossaLoading, setFossaLoading] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
const reconnectTimeoutRef = useRef<number | null>(null);
const reconnectAttempts = useRef(0);
const shouldReconnect = useRef(true);

  const buildMigrationRequest = useCallback(() => {
    const repoName = selectedRepo?.name || repoUrl.split("/").pop()?.replace(".git", "") || "repo";
    const detectPlatform = (url: string) => {
      if (url.includes("gitlab.com")) return "gitlab";
      if (url.includes("github.com")) return "github";
      return "github";
    };

    return {
      source_repo_url: selectedRepo?.url || repoUrl,
      target_repo_name: "", // Will be filled in component based on timing
      platform: detectPlatform(selectedRepo?.url || repoUrl),
      source_java_version: userSelectedVersion || selectedSourceVersion,
      target_java_version: selectedTargetVersion,
      token: currentToken,
      migration_approach: migrationApproach,
      conversion_types: selectedConversions,
      run_tests: runTests,
      run_sonar: runSonar,
      run_fossa: runFossa,
      fix_business_logic: fixBusinessLogic,
    };
  }, [
    selectedRepo,
    repoUrl,
    userSelectedVersion,
    selectedSourceVersion,
    selectedTargetVersion,
    currentToken,
    migrationApproach,
    selectedConversions,
    runTests,
    runSonar,
    runFossa,
    fixBusinessLogic,
  ]);

  const connectWebSocket = useCallback((jobId: string) => {

    // Close existing socket if any
    if (socketRef.current) {
        socketRef.current.close();
    }

    shouldReconnect.current = true;

    const ws = new WebSocket(
        `ws://localhost:8001/ws/migration/${jobId}`
    );

    socketRef.current = ws;

    ws.onopen = () => {
        console.log("✅ WebSocket Connected for job:", jobId);
        reconnectAttempts.current = 0;
    };

    ws.onmessage = (event) => {
      console.log("📩 RAW WS MESSAGE:", event.data);

        try {
          const message = JSON.parse(event.data);

          console.log("📩 Parsed WebSocket message:", message);

          switch (message.type) {

              case "state":
              setMigrationJob((prev) => {
                const base = prev ?? {} as any;
                return {
                  ...base,
                  progress_percent: message.progress,
                  status: (message.status || "").toLowerCase(),
                  current_step: message.message,
                };
              });
              break;
            case "progress":
        setMigrationJob((prev) => {
          // Initialize if prev is null
          const base = prev ?? {} as any;
          return {
            ...base,
            progress_percent: message.progress,
            status: message.status.toLowerCase(),
            current_step: message.message,
          };
        });
        break;

              case "log":
          setMigrationLogs((prev) => {
            const updated = [...prev, `${message.timestamp} ${message.level}: ${message.message}`];
            return updated;
          });
          break;

              case "completed":
          shouldReconnect.current = false;
          setMigrationJob((prev) => {
            const base = prev ?? {} as any;
            return {
              ...base,
              progress_percent: 100,
              status: "completed",
              current_step: message.message,
            };
          });
          setStep(7);
          ws.close();
          break;

              case "error":

                  shouldReconnect.current = false;

                  setError(message.message);

                  ws.close();

                  break;

              default:

                  console.warn("⚠️ Unknown WebSocket message type:", message);
          }
        } catch (parseError) {
          console.error("❌ Failed to parse WebSocket message:", parseError, event.data);
        }
    };

    ws.onerror = (error) => {

        console.error("❌ WebSocket Error:", error);

        ws.close();

    };

    ws.onclose = (event) => {

        console.log("🔌 WebSocket Disconnected, code:", event.code, "reason:", event.reason);

        socketRef.current = null;

        // Don't reconnect after normal completion/error
        if (!shouldReconnect.current) {
            console.log("Migration finished. No reconnect needed.");
            return;
        }

        // Retry only 5 times
        if (reconnectAttempts.current >= 5) {
            console.error("❌ Maximum reconnect attempts reached.");
            return;
        }

        reconnectAttempts.current++;

        console.log(
            `🔄 Reconnect attempt ${reconnectAttempts.current}/5`
        );

        reconnectTimeoutRef.current = window.setTimeout(() => {

            connectWebSocket(jobId);

        }, 3000);

    };
  }, [setMigrationJob, setMigrationLogs, setStep, setError]);

  const handleStartMigration = useCallback((finalTargetRepoName: string) => {
    if (!selectedRepo && !repoUrl) {
      setError("Please select a repository or enter a repository URL");
      return;
    }

    if (!selectedTargetVersion) {
      setError("Please select a target Java version before starting the migration.");
      return;
    }

    if (!runSonar && !runFossa) {
      setError("Please select SonarQube or FOSSA before starting migration.");
      return;
    }

    setLoading(true);
    setError("");

    const req = {
      ...buildMigrationRequest(),
      target_repo_name: finalTargetRepoName,
    };

    startMigration(req)
  .then((job) => {
    setMigrationJob(job);
    setStep(5);

    connectWebSocket(job.job_id);
  })
  .catch((err) => {
    setError(err.message || "Failed to start migration.");
    setLoading(false);
  })
  .finally(() => setLoading(false));
  }, [selectedRepo, repoUrl, selectedTargetVersion, runSonar, runFossa, buildMigrationRequest, setStep, setError, connectWebSocket]);

  // Version recommendation side-effect
  useEffect(() => {
    if (step !== 3 || !repoAnalysis || !selectedSourceVersion) {
      if (step !== 3) {
        setVersionRecommendation(null);
        setVersionRecommendationLoading(false);
        setVersionRecommendationError("");
      }
      return;
    }

    let cancelled = false;
    setVersionRecommendationLoading(true);
    setVersionRecommendationError("");

    getJavaVersionRecommendation({
      source_java_version: selectedSourceVersion,
      detected_java_version: repoAnalysis.java_version,
      build_tool: repoAnalysis.build_tool,
      dependencies: repoAnalysis.dependencies || [],
      has_tests: repoAnalysis.has_tests,
      api_endpoint_count: repoAnalysis.api_endpoints?.length ?? 0,
      risk_level: riskLevel || "unknown",
    })
      .then((recommendation) => {
        if (cancelled) return;
        setVersionRecommendation(recommendation);
      })
      .catch((err) => {
        if (cancelled) return;
        setVersionRecommendation(null);
        setVersionRecommendationError(err?.message || "Failed to get Java version recommendation.");
      })
      .finally(() => {
        if (!cancelled) setVersionRecommendationLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [step, repoAnalysis, selectedSourceVersion, riskLevel]);

  // Preview side-effect
  useEffect(() => {
    if (step !== 4 || !selectedTargetVersion || (!selectedRepo && !repoUrl)) {
      return;
    }

    let cancelled = false;
    setMigrationPreviewLoading(true);
    setMigrationPreviewError("");

    previewMigration({
      ...buildMigrationRequest(),
      target_repo_name: "preview",
    })
      .then((preview) => {
        if (cancelled) return;
        setMigrationPreview(preview);
        const previewCodeChanges = buildCodeChangesFromPreviewDiffs(preview.file_diffs || []);
        setCodeChanges(previewCodeChanges);
        setSelectedDiffFile((current) => current ?? previewCodeChanges[0]?.filePath ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setMigrationPreview(null);
        setCodeChanges([]);
        setSelectedDiffFile(null);
        setMigrationPreviewError(err?.message || "Failed to preview migration changes.");
      })
      .finally(() => {
        if (!cancelled) setMigrationPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    step,
    selectedTargetVersion,
    selectedRepo,
    repoUrl,
    buildMigrationRequest,
  ]);

  // Job status polling side-effect
  useEffect(() => {
    return () => {

        shouldReconnect.current = false;

        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

    };
}, []);

  // Smooth animation effect
  useEffect(() => {
    if (step === 5 && migrationJob) {
      setAnimationProgress(10);
      const interval = setInterval(() => {
        setAnimationProgress((prev) => {
          const actualProgress = migrationJob.progress_percent || 0;
          const status = migrationJob.status;

          if (status === "completed") {
            return 100;
          }
          if (actualProgress > prev) {
            return actualProgress;
          }
          if (status !== "completed" && status !== "failed") {
            return Math.min(prev + 2, 100);
          }
          return prev;
        });
      }, 500);

      return () => clearInterval(interval);
    } else if (step !== 5) {
      setAnimationProgress(0);
    }
  }, [step, migrationJob?.progress_percent, migrationJob?.status]);

  // Fossa side-effect
  useEffect(() => {
    if (migrationJob?.job_id && (runFossa || migrationJob.fossa_policy_status || migrationJob.fossa_total_dependencies)) {
      let cancelled = false;
      setFossaLoading(true);
      getMigrationFossa(migrationJob.job_id)
        .then((fossa) => {
          if (cancelled) return;
          const normalized = {
            compliance_status: fossa.policy_status ?? migrationJob.fossa_policy_status ?? null,
            total_dependencies: fossa.total_dependencies ?? migrationJob.fossa_total_dependencies ?? 0,
            licenses: typeof fossa.license_issues === "number" ? { UNKNOWN: fossa.license_issues } : {},
            vulnerabilities: fossa.vulnerabilities,
            outdated_dependencies: fossa.outdated_dependencies ?? migrationJob.fossa_outdated_dependencies ?? 0,
          };
          setFossaResult(normalized);
          setMigrationJob((prev) =>
            prev
              ? {
                  ...prev,
                  fossa_policy_status: fossa.policy_status ?? prev.fossa_policy_status,
                  fossa_total_dependencies: fossa.total_dependencies ?? prev.fossa_total_dependencies,
                  fossa_license_issues: fossa.license_issues ?? prev.fossa_license_issues,
                  fossa_vulnerabilities: fossa.vulnerabilities ?? prev.fossa_vulnerabilities,
                  fossa_outdated_dependencies: fossa.outdated_dependencies ?? prev.fossa_outdated_dependencies,
                }
              : prev
          );
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setFossaLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }
  }, [runFossa, migrationJob?.job_id, migrationJob?.fossa_policy_status, migrationJob?.fossa_total_dependencies]);

  return {
    migrationJob,
    setMigrationJob,
    migrationLogs,
    setMigrationLogs,
    animationProgress,
    setAnimationProgress,
    loading,
    setLoading,
    versionRecommendation,
    versionRecommendationLoading,
    versionRecommendationError,
    migrationPreview,
    migrationPreviewLoading,
    migrationPreviewError,
    codeChanges,
    setCodeChanges,
    selectedDiffFile,
    setSelectedDiffFile,
    showCodeChanges,
    setShowCodeChanges,
    fossaResult,
    fossaLoading,
    handleStartMigration,
  };
}
export default useMigration;
