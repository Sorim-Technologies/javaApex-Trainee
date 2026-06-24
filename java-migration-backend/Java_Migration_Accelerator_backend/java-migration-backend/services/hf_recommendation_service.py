import json
import logging
import os
from typing import Any, Dict, List

import httpx

logger = logging.getLogger(__name__)


class HFRecommendationService:
    def __init__(self) -> None:
        self.hf_token = os.getenv("HF_TOKEN", "").strip()
        self.endpoint = "https://router.huggingface.co/v1/chat/completions"
        self.model = os.getenv("HF_MODEL", "openai/gpt-oss-120b:fastest")

    # ------------------------------------------------------------------ #
    #  Version recommendation (existing)
    # ------------------------------------------------------------------ #
    async def recommend_target_version(self, analysis_payload: Dict[str, Any]) -> Dict[str, Any]:
        if not self.hf_token:
            raise ValueError("HF_TOKEN is not configured.")
        response_data = await self._call_hugging_face(analysis_payload)
        recommendation = self._parse_recommendation(response_data)
        recommended = str(recommendation.get("recommended_target_version", "")).strip()
        if recommended not in {"11", "17", "21"}:
            raise ValueError(f"Unexpected Hugging Face recommendation '{recommended}'.")
        rationale = self._normalize_rationale(recommendation)
        alternatives = recommendation.get("alternatives")
        if not rationale:
            raise ValueError("Hugging Face response did not include rationale.")
        return {
            "recommended_target_version": recommended,
            "confidence": str(recommendation.get("confidence", "medium")).lower(),
            "rationale": rationale,
            "alternatives": self._normalize_alternatives(alternatives),
        }

    async def _call_hugging_face(self, analysis_payload: Dict[str, Any]) -> Dict[str, Any]:
        prompt_payload = self._build_prompt_payload(analysis_payload)
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.hf_token}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": (
                            "You are a Java migration architect. "
                            "Recommend a target Java version from this set only: 11, 17, 21. "
                            "Prefer LTS versions, minimize migration risk, and return valid JSON only."
                        )},
                        {"role": "user", "content": (
                            "Analyze this repository summary and recommend the safest target Java version.\n"
                            "Return JSON with keys: recommended_target_version, confidence, rationale, alternatives.\n"
                            f"Repository summary:\n{json.dumps(prompt_payload, indent=2)}"
                        )},
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            return response.json()

    # ------------------------------------------------------------------ #
    #  Migration result analysis (new — used by report endpoint)
    # ------------------------------------------------------------------ #
    async def analyze_migration_results(self, migration_data: Dict[str, Any]) -> Dict[str, Any]:
        """Call HF LLM to analyse migration results; falls back to local heuristics if unavailable."""
        if not self.hf_token:
            return self._local_analysis(migration_data)
        try:
            return await self._hf_analysis(migration_data)
        except Exception as exc:
            logger.warning("HF analysis failed (%s) — using local fallback", exc)
            return self._local_analysis(migration_data)

    async def _hf_analysis(self, migration_data: Dict[str, Any]) -> Dict[str, Any]:
        summary = self._compact_summary(migration_data)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.endpoint,
                headers={"Authorization": f"Bearer {self.hf_token}", "Content-Type": "application/json"},
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": (
                            "You are a senior Java migration architect reviewing migration results. "
                            "Return ONLY valid JSON with keys: "
                            "executive_summary (string, 2-3 sentences), "
                            "risk_assessment (one of: low/medium/high/critical), "
                            "key_findings (array of 3-5 strings), "
                            "recommendations (array of 3-5 strings), "
                            "migration_quality_score (integer 0-100)."
                        )},
                        {"role": "user", "content": (
                            "Analyse these Java migration results.\n"
                            f"Migration data:\n{json.dumps(summary, indent=2)}"
                        )},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 800,
                    "response_format": {"type": "json_object"},
                },
            )
            response.raise_for_status()
            parsed = self._parse_recommendation(response.json())
        risk = str(parsed.get("risk_assessment", "medium")).lower()
        if risk not in ("low", "medium", "high", "critical"):
            risk = "medium"
        return {
            "executive_summary":      str(parsed.get("executive_summary", "Migration analysis completed.")),
            "risk_assessment":        risk,
            "key_findings":           self._to_str_list(parsed.get("key_findings")),
            "recommendations":        self._to_str_list(parsed.get("recommendations")),
            "migration_quality_score": min(100, max(0, int(parsed.get("migration_quality_score", 70)))),
        }

    def _local_analysis(self, d: Dict[str, Any]) -> Dict[str, Any]:
        """Deterministic fallback — no API call required."""
        files     = int(d.get("files_modified", 0))
        t_err     = int(d.get("total_errors", 0))
        t_warn    = int(d.get("total_warnings", 0))
        f_err     = int(d.get("errors_fixed", 0))
        f_warn    = int(d.get("warnings_fixed", 0))
        status    = str(d.get("status", "")).lower()
        src       = d.get("source_java_version", "?")
        tgt       = d.get("target_java_version", "?")
        sonar     = (d.get("sonar_quality_gate") or "").upper()
        fossa     = (d.get("fossa_policy_status") or "").upper()
        rem_err   = max(0, t_err - f_err)

        score = 70
        if status == "completed": score += 10
        if t_err > 0 and rem_err == 0: score += 10
        else: score -= min(25, rem_err * 5)
        if sonar == "PASSED": score += 5
        if fossa in ("PASSED", "COMPLIANT"): score += 5
        score = max(0, min(100, score))

        risk = "low" if rem_err == 0 and status == "completed" else \
               "medium" if rem_err <= 2 else "high" if rem_err <= 5 else "critical"

        summary = (
            f"Migration from Java {src} to Java {tgt} "
            f"{'completed successfully' if status == 'completed' else 'encountered issues'}. "
            f"{files} file(s) modified, {d.get('issues_fixed', 0)} issue(s) automatically resolved. "
            + (f"{rem_err} error(s) still require manual attention." if rem_err else "All detected errors addressed.")
        )

        findings = []
        if files:       findings.append(f"{files} source file(s) modified")
        if t_err:       findings.append(f"{f_err}/{t_err} errors automatically fixed")
        if t_warn:      findings.append(f"{f_warn}/{t_warn} warnings addressed")
        if sonar:       findings.append(f"SonarQube quality gate: {sonar}")
        if fossa:       findings.append(f"FOSSA compliance: {fossa}")
        if not findings: findings.append("Limited migration data available")

        recs = []
        if rem_err:     recs.append("Fix remaining errors before deploying to production")
        if max(0, t_warn - f_warn): recs.append("Address remaining warnings to improve code quality")
        if sonar not in ("PASSED",): recs.append("Resolve SonarQube quality gate issues")
        recs.append("Run the full integration test suite on the migrated codebase")
        recs.append("Perform a manual code review of critical business logic")

        return {
            "executive_summary":       summary,
            "risk_assessment":         risk,
            "key_findings":            findings[:5],
            "recommendations":         recs[:5],
            "migration_quality_score": score,
        }

    def _compact_summary(self, d: Dict[str, Any]) -> Dict[str, Any]:
        issues = d.get("issues") or []
        deps   = d.get("dependencies") or []
        return {
            "source_java_version": d.get("source_java_version"),
            "target_java_version": d.get("target_java_version"),
            "status":              d.get("status"),
            "files_modified":      d.get("files_modified", 0),
            "issues_fixed":        d.get("issues_fixed", 0),
            "total_errors":        d.get("total_errors", 0),
            "errors_fixed":        d.get("errors_fixed", 0),
            "total_warnings":      d.get("total_warnings", 0),
            "sonar_quality_gate":  d.get("sonar_quality_gate"),
            "fossa_policy_status": d.get("fossa_policy_status"),
            "sample_issues": [
                {"severity": i.get("severity"), "category": i.get("category"),
                 "message": i.get("message"), "status": i.get("status")}
                for i in issues[:8] if isinstance(i, dict)
            ],
            "dependency_changes": [
                {"artifact": dep.get("artifact_id"), "from": dep.get("current_version"),
                 "to": dep.get("new_version"), "status": dep.get("status")}
                for dep in deps[:10] if isinstance(dep, dict)
            ],
        }

    # ------------------------------------------------------------------ #
    #  Shared helpers
    # ------------------------------------------------------------------ #
    def _parse_recommendation(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
        choices = response_data.get("choices") or []
        if not choices:
            raise ValueError("No choices returned from Hugging Face")
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, list):
            content = "".join(item.get("text", "") for item in content if isinstance(item, dict))
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Empty content returned from Hugging Face")
        return json.loads(content)

    def _normalize_rationale(self, recommendation: Dict[str, Any]) -> List[str]:
        candidates = [
            recommendation.get("rationale"), recommendation.get("reasons"),
            recommendation.get("explanation"), recommendation.get("reasoning"),
        ]
        normalized: List[str] = []
        for candidate in candidates:
            if isinstance(candidate, list):
                for item in candidate:
                    if isinstance(item, str) and item.strip():
                        normalized.append(item.strip())
                    elif isinstance(item, dict):
                        text = item.get("reason") or item.get("text") or item.get("description")
                        if isinstance(text, str) and text.strip():
                            normalized.append(text.strip())
            elif isinstance(candidate, str) and candidate.strip():
                normalized.extend(line.strip("- ").strip() for line in candidate.splitlines() if line.strip())
            elif isinstance(candidate, dict):
                text = candidate.get("reason") or candidate.get("text") or candidate.get("description")
                if isinstance(text, str) and text.strip():
                    normalized.append(text.strip())
        deduped: List[str] = []
        for item in normalized:
            if item not in deduped:
                deduped.append(item)
        return deduped

    def _normalize_alternatives(self, alternatives: Any) -> List[str]:
        if not isinstance(alternatives, list):
            return []
        normalized: List[str] = []
        for item in alternatives:
            value = None
            if isinstance(item, str):
                value = item.strip()
            elif isinstance(item, (int, float)):
                value = str(int(item))
            elif isinstance(item, dict):
                raw = item.get("version") or item.get("target_version") or item.get("value")
                if raw is not None:
                    value = str(raw).strip()
            if value in {"11", "17", "21"} and value not in normalized:
                normalized.append(value)
        return normalized

    @staticmethod
    def _to_str_list(value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(v) for v in value if v][:5]
        if isinstance(value, str):
            return [value]
        return []

    def _build_prompt_payload(self, analysis_payload: Dict[str, Any]) -> Dict[str, Any]:
        dependencies = analysis_payload.get("dependencies") or []
        return {
            "source_java_version":  str(analysis_payload.get("source_java_version", "")),
            "detected_java_version": analysis_payload.get("detected_java_version"),
            "build_tool":            analysis_payload.get("build_tool"),
            "has_tests":             bool(analysis_payload.get("has_tests")),
            "api_endpoint_count":    int(analysis_payload.get("api_endpoint_count", 0)),
            "risk_level":            analysis_payload.get("risk_level", "unknown"),
            "dependency_count":      len(dependencies),
            "dependencies": [
                {"group_id": dep.get("group_id"), "artifact_id": dep.get("artifact_id"),
                 "current_version": dep.get("current_version"), "status": dep.get("status")}
                for dep in dependencies[:20] if isinstance(dep, dict)
            ],
        }
