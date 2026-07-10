import xml.etree.ElementTree as ET
import re
from typing import Dict

class CoverageParser:
    def parse_jacoco_xml(self, xml_path: str) -> Dict[str, float]:
        """
        Parses JaCoCo XML report and returns coverage percentages.
        """
        metrics = {
            "line": 0.0,
            "branch": 0.0,
            "method": 0.0,
            "class_": 0.0,
            "instruction": 0.0,
            "complexity": 0.0
        }

        try:
            with open(xml_path, "r", encoding="utf-8", errors="ignore") as f:
                xml_content = f.read()

            # Remove <!DOCTYPE ...> block to avoid ParseError related to missing DTDs
            xml_content = re.sub(r'<!DOCTYPE\s+[^>]*>', '', xml_content, flags=re.IGNORECASE)

            root = ET.fromstring(xml_content)
            
            for counter in root.findall("counter"):
                c_type = counter.get("type")
                missed = int(counter.get("missed", 0))
                covered = int(counter.get("covered", 0))
                total = missed + covered
                
                pct = round((covered / total * 100), 2) if total > 0 else 100.0

                if c_type == "LINE":
                    metrics["line"] = pct
                elif c_type == "BRANCH":
                    metrics["branch"] = pct
                elif c_type == "METHOD":
                    metrics["method"] = pct
                elif c_type == "CLASS":
                    metrics["class_"] = pct
                elif c_type == "INSTRUCTION":
                    metrics["instruction"] = pct
                elif c_type == "COMPLEXITY":
                    metrics["complexity"] = pct

        except Exception as e:
            print(f"Error parsing JaCoCo XML in CoverageParser: {e}")

        return metrics
