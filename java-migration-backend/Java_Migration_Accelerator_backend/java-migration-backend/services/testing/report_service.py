from typing import Dict, Any

class ReportService:
    def format_report_metrics(self, job_or_result: Any) -> Dict[str, Any]:
        """
        Formats test execution and JaCoCo coverage metrics for UI rendering.
        """
        # Read from Job model or result dictionary
        tests_total = getattr(job_or_result, "tests_total", 0)
        tests_passed = getattr(job_or_result, "tests_passed", 0)
        tests_failed = getattr(job_or_result, "tests_failed", 0)
        tests_skipped = getattr(job_or_result, "tests_skipped", 0)
        test_success_rate = getattr(job_or_result, "test_success_rate", 0.0)
        tests_generated = getattr(job_or_result, "tests_generated", 0)
        existing_tests_found = getattr(job_or_result, "existing_tests_found", False)

        return {
            "existingTestsFound": existing_tests_found,
            "testsGenerated": tests_generated,
            "testsTotal": tests_total,
            "testsPassed": tests_passed,
            "testsFailed": tests_failed,
            "testsSkipped": tests_skipped,
            "testSuccessRate": test_success_rate,
            "coverage": {
                "line": getattr(job_or_result, "coverage_line", 0.0),
                "branch": getattr(job_or_result, "coverage_branch", 0.0),
                "method": getattr(job_or_result, "coverage_method", 0.0),
                "class": getattr(job_or_result, "coverage_class", 0.0),
                "instruction": getattr(job_or_result, "coverage_instruction", 0.0),
                "complexity": getattr(job_or_result, "coverage_complexity", 0.0)
            }
        }
