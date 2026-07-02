import os
import re
import logging
from typing import List, Dict, Any, Set, Tuple

logger = logging.getLogger(__name__)

class JavaFileParser:
    @staticmethod
    def parse_file(file_path: str) -> Dict[str, Any]:
        """Parses a Java file and returns package, imports, class info, extends, implements, and DI types."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {e}")
            return {}

        # Parse package
        pkg_match = re.search(r'package\s+([a-zA-Z0-9_\.]+)\s*;', content)
        package = pkg_match.group(1).strip() if pkg_match else ""

        # Parse imports
        imports = re.findall(r'import\s+(?:static\s+)?([a-zA-Z0-9_\.\*]+)\s*;', content)
        imports = [imp.strip() for imp in imports]

        # Strip comments for class scanning
        no_comments = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        no_comments = re.sub(r'//.*', '', no_comments)

        # Class declaration pattern
        # Group 1: Annotations
        # Group 2: Declaration type (class/interface/enum/record)
        # Group 3: Class name
        class_regex = r'((?:@[a-zA-Z0-9_\(\)\s\.\=\",\{\}\*]+\s*)*)(?:public|protected|private)?\s*(?:static\s+)?(?:final\s+)?(?:abstract\s+)?(?:sealed\s+)?(?:non-sealed\s+)?(class|interface|enum|record)\s+([a-zA-Z0-9_]+)'
        
        match = re.search(class_regex, no_comments)
        if not match:
            # Fallback to file name
            class_name = os.path.splitext(os.path.basename(file_path))[0]
            class_type = "other"
            extends_list = []
            implements_list = []
            autowired_types = []
            body = no_comments
        else:
            annotations_text = match.group(1) or ""
            decl_type = match.group(2)
            class_name = match.group(3)
            
            # Analyze extends/implements
            decl_start = match.end()
            brace_index = no_comments.find('{', decl_start)
            decl_suffix = no_comments[decl_start:brace_index] if brace_index != -1 else no_comments[decl_start:]
            
            extends_list = []
            implements_list = []
            
            extends_match = re.search(r'extends\s+([a-zA-Z0-9_\.\s,]+)', decl_suffix)
            if extends_match:
                extends_list = [x.strip().split('.')[-1] for x in extends_match.group(1).split(',')]
                
            implements_match = re.search(r'implements\s+([a-zA-Z0-9_\.\s,]+)', decl_suffix)
            if implements_match:
                implements_list = [x.strip().split('.')[-1] for x in implements_match.group(1).split(',')]
                
            body = no_comments[brace_index:] if brace_index != -1 else no_comments[decl_start:]
            
            # Detect type
            annotations_lower = annotations_text.lower()
            class_name_lower = class_name.lower()
            
            if decl_type == 'interface':
                class_type = 'interface'
            elif '@restcontroller' in annotations_lower or '@controller' in annotations_lower or class_name_lower.endswith('controller'):
                class_type = 'controller'
            elif '@service' in annotations_lower or class_name_lower.endswith('service') or class_name_lower.endswith('serviceimpl'):
                class_type = 'service'
            elif '@repository' in annotations_lower or class_name_lower.endswith('repository') or class_name_lower.endswith('dao') or 'extends jparepository' in decl_suffix.lower() or 'extends crudrepository' in decl_suffix.lower():
                class_type = 'repository'
            elif '@entity' in annotations_lower or '@document' in annotations_lower or '@table' in annotations_lower or class_name_lower.endswith('entity'):
                class_type = 'entity'
            elif '@configuration' in annotations_lower or class_name_lower.endswith('configuration') or class_name_lower.endswith('config'):
                class_type = 'configuration'
            elif class_name_lower.endswith('util') or class_name_lower.endswith('utils') or class_name_lower.endswith('helper'):
                class_type = 'utility'
            else:
                class_type = 'other'

            # Extract autowired annotations or fields
            autowired_types = []
            autowired_pattern = r'@(?:Autowired|Resource|Inject|Qualifier)\s+(?:public|protected|private)?\s*(?:final\s+)?([a-zA-Z0-9_\<\>\?]+)\s+[a-zA-Z0-9_]+'
            for m in re.finditer(autowired_pattern, content):
                t = m.group(1).strip()
                t_clean = re.sub(r'<.*?>', '', t)
                autowired_types.append(t_clean)
                
            # Constructor injection (private final dependency fields)
            if class_type in {'controller', 'service', 'repository', 'configuration'}:
                field_pattern = r'private\s+final\s+([a-zA-Z0-9_\<\>\?]+)\s+[a-zA-Z0-9_]+\s*(?:;|=)'
                for m in re.finditer(field_pattern, body):
                    t = m.group(1).strip()
                    t_clean = re.sub(r'<.*?>', '', t)
                    if t_clean.lower() not in {
                        'string', 'integer', 'long', 'double', 'boolean', 'float', 'int', 'char', 
                        'short', 'byte', 'list', 'map', 'set', 'collection', 'object'
                    }:
                        autowired_types.append(t_clean)

        return {
            "file_path": file_path,
            "class_name": class_name,
            "package": package,
            "fully_qualified_name": f"{package}.{class_name}" if package else class_name,
            "imports": imports,
            "extends": extends_list,
            "implements": implements_list,
            "autowired_types": autowired_types,
            "class_type": class_type,
            "body_snippet": body[:5000] # store a small snippet of the body to search for references
        }


class DependencyGraphService:
    @staticmethod
    def build_graph(project_path: str) -> Dict[str, Any]:
        """Scans all Java files in project_path, builds a dependency graph, and detects circular dependencies."""
        if not os.path.exists(project_path):
            return {"nodes": [], "edges": [], "cycles": [], "hasCircularDependency": False}

        parsed_files = []
        for root_dir, _, files in os.walk(project_path):
            # Exclude build files, test targets, and VCS directories
            if any(part in root_dir.split(os.sep) for part in {'.git', 'target', 'build', '.gradle', 'node_modules'}):
                continue
            for file in files:
                if file.endswith('.java'):
                    full_path = os.path.join(root_dir, file)
                    res = JavaFileParser.parse_file(full_path)
                    if res:
                        parsed_files.append(res)

        # Build lookups
        fqn_to_class = {}
        simple_to_fqn = {}
        package_to_classes = {}

        for info in parsed_files:
            fqn = info["fully_qualified_name"]
            simple = info["class_name"]
            pkg = info["package"]

            fqn_to_class[fqn] = info
            if simple not in simple_to_fqn:
                simple_to_fqn[simple] = []
            simple_to_fqn[simple].append(fqn)

            if pkg:
                if pkg not in package_to_classes:
                    package_to_classes[pkg] = []
                package_to_classes[pkg].append(fqn)

        # Create nodes list with unique IDs
        fqn_to_id = {}
        nodes_dict = {}

        for info in parsed_files:
            fqn = info["fully_qualified_name"]
            simple = info["class_name"]
            
            # Uniqueness
            if len(simple_to_fqn.get(simple, [])) > 1:
                node_id = f"{simple} ({info['package']})"
            else:
                node_id = simple

            fqn_to_id[fqn] = node_id
            nodes_dict[node_id] = {
                "id": node_id,
                "type": info["class_type"],
                "label": simple,
                "package": info["package"]
            }

        # Resolve simple name to unique node ID
        def resolve_to_node_id(simple_name: str, current_class_info: Dict[str, Any]) -> str:
            # 1. Self reference
            if simple_name == current_class_info["class_name"]:
                return fqn_to_id.get(current_class_info["fully_qualified_name"])

            # 2. Check explicit imports
            for imp in current_class_info["imports"]:
                if imp.endswith(f".{simple_name}"):
                    if imp in fqn_to_class:
                        return fqn_to_id.get(imp)

            # 3. Check same package
            same_pkg_fqn = f"{current_class_info['package']}.{simple_name}" if current_class_info["package"] else simple_name
            if same_pkg_fqn in fqn_to_class:
                return fqn_to_id.get(same_pkg_fqn)

            # 4. Check wildcard imports
            for imp in current_class_info["imports"]:
                if imp.endswith(".*"):
                    pkg = imp[:-2]
                    fqn = f"{pkg}.{simple_name}"
                    if fqn in fqn_to_class:
                        return fqn_to_id.get(fqn)

            # 5. Global unique fallback
            if simple_name in simple_to_fqn:
                fqns = simple_to_fqn[simple_name]
                if len(fqns) == 1:
                    return fqn_to_id.get(fqns[0])

            return None

        # Build Edges
        edges = set()
        edges_adj = {}

        for info in parsed_files:
            source_id = fqn_to_id.get(info["fully_qualified_name"])
            if not source_id:
                continue

            dependencies = set()

            # A. Extends / Implements
            for parent in info["extends"] + info["implements"]:
                target_id = resolve_to_node_id(parent, info)
                if target_id:
                    dependencies.add(target_id)

            # B. Autowired / DI types
            for autowired_type in info["autowired_types"]:
                target_id = resolve_to_node_id(autowired_type, info)
                if target_id:
                    dependencies.add(target_id)

            # C. Imports check
            for imp in info["imports"]:
                if imp in fqn_to_class:
                    target_id = fqn_to_id.get(imp)
                    if target_id:
                        dependencies.add(target_id)
                elif imp.endswith(".*"):
                    # Scan for wildcard occurrences
                    pkg = imp[:-2]
                    for fqn in package_to_classes.get(pkg, []):
                        simple = fqn_to_class[fqn]["class_name"]
                        if re.search(r'\b' + re.escape(simple) + r'\b', info["body_snippet"]):
                            target_id = fqn_to_id.get(fqn)
                            if target_id:
                                dependencies.add(target_id)

            # D. Same package check (scan body for occurrences)
            pkg = info["package"]
            if pkg in package_to_classes:
                for fqn in package_to_classes[pkg]:
                    target_class = fqn_to_class[fqn]
                    if target_class["class_name"] != info["class_name"]:
                        simple = target_class["class_name"]
                        if re.search(r'\b' + re.escape(simple) + r'\b', info["body_snippet"]):
                            target_id = fqn_to_id.get(fqn)
                            if target_id:
                                dependencies.add(target_id)

            # Add to edges set
            for target_id in dependencies:
                if source_id != target_id:
                    edges.add((source_id, target_id))
                    if source_id not in edges_adj:
                        edges_adj[source_id] = []
                    edges_adj[source_id].append(target_id)

        # Detect Cycles
        cycles = DependencyGraphService.detect_cycles(list(nodes_dict.keys()), edges_adj)

        # Format edges for response
        edges_list = [{"source": src, "target": tgt} for src, tgt in sorted(edges)]
        nodes_list = list(nodes_dict.values())

        return {
            "nodes": nodes_list,
            "edges": edges_list,
            "cycles": cycles,
            "hasCircularDependency": len(cycles) > 0
        }

    @staticmethod
    def detect_cycles(nodes: List[str], edges_adj: Dict[str, List[str]], max_depth: int = 50) -> List[List[str]]:
        """Identifies circular dependencies using a backtracking DFS."""
        cycles = []
        sorted_nodes = sorted(nodes)
        
        for start_node in sorted_nodes:
            path = [start_node]
            path_set = {start_node}
            
            def backtrack(current: str, depth: int):
                if depth > max_depth:
                    return
                neighbors = edges_adj.get(current, [])
                for neighbor in neighbors:
                    if neighbor == start_node:
                        # Cycle complete
                        cycle = list(path) + [start_node]
                        cycles.append(cycle)
                    elif neighbor not in path_set and neighbor > start_node:
                        path.append(neighbor)
                        path_set.add(neighbor)
                        backtrack(neighbor, depth + 1)
                        path_set.remove(neighbor)
                        path.pop()

            backtrack(start_node, 1)

        return cycles
