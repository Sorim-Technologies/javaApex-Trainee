import os
from typing import Dict, List

from services.complexity_utils import ComplexityUtils


class CodeComplexityService:

    def __init__(self):
        self.utils = ComplexityUtils()

    def analyze(self, repo_path: str) -> Dict:

        java_files = self.utils.get_java_files(repo_path)

        results: List[Dict] = []

        total_complexity = 0
        highest_complexity = 0
        critical_files = 0

        for file_path in java_files:

            try:

                with open(file_path, "r", encoding="utf-8") as f:
                    source = f.read()

            except Exception:
                continue

            score = self.utils.calculate_complexity(source)

            level, color = self.utils.get_level(score)

            package = self.utils.extract_package(source)

            total_complexity += score

            highest_complexity = max(highest_complexity, score)

            if level == "Critical":
                critical_files += 1

            results.append(
                {
                    "file": os.path.basename(file_path),
                    "path": file_path.replace(repo_path, ""),
                    "package": package,
                    "complexity": score,
                    "level": level,
                    "color": color,
                }
            )

        results.sort(
            key=lambda x: x["complexity"],
            reverse=True,
        )

        total_files = len(results)

        average = 0

        if total_files > 0:
            average = round(total_complexity / total_files, 2)

        return {
            "summary": {
                "totalFiles": total_files,
                "averageComplexity": average,
                "highestComplexity": highest_complexity,
                "criticalFiles": critical_files,
            },
            "files": results,
        }