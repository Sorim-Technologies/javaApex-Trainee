import os
import re
import javalang


DECISION_KEYWORDS = [
    "if",
    "for",
    "while",
    "case",
    "catch",
]


class ComplexityUtils:

    @staticmethod
    def get_java_files(root_path: str):
        java_files = []

        for root, _, files in os.walk(root_path):
            for file in files:
                if file.endswith(".java"):
                    java_files.append(os.path.join(root, file))

        return java_files


    @staticmethod
    def extract_package(source: str):

        match = re.search(r'package\s+([\w\.]+);', source)

        if match:
            return match.group(1)

        return ""


    @staticmethod
    def calculate_complexity(source: str):

        complexity = 1

        try:

            tree = javalang.parse.parse(source)

            for _, node in tree:

                node_name = node.__class__.__name__

                if node_name in (
                    "IfStatement",
                    "ForStatement",
                    "WhileStatement",
                    "DoStatement",
                    "SwitchStatement",
                    "CatchClause",
                    "TernaryExpression"
                ):
                    complexity += 1

        except Exception:
            pass

        complexity += len(re.findall(r"\&\&", source))
        complexity += len(re.findall(r"\|\|", source))

        return complexity


    @staticmethod
    def get_level(score):

        if score <= 5:
            return "Low", "#22c55e"

        if score <= 10:
            return "Medium", "#eab308"

        if score <= 20:
            return "High", "#f97316"

        return "Critical", "#ef4444"