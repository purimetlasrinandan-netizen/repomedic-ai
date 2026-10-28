import ast
import re
from typing import List, Dict, Any, Optional
from pathlib import PurePosixPath

# Map extension to human-readable language
EXTENSION_LANGUAGE_MAP = {
    ".py": "Python",
    ".pyw": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".go": "Go",
    ".rs": "Rust",
    ".java": "Java",
    ".kt": "Kotlin",
    ".c": "C",
    ".h": "C/C++ Header",
    ".cpp": "C++",
    ".hpp": "C++ Header",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".swift": "Swift",
    ".sh": "Shell",
    ".bash": "Shell",
    ".sql": "SQL",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".toml": "TOML",
    ".md": "Markdown",
}

# Framework indicators based on imports or dependencies
FRAMEWORK_SIGNATURES = {
    "FastAPI": ["from fastapi", "import fastapi", '"fastapi"'],
    "Flask": ["from flask", "import flask", '"flask"'],
    "Django": ["from django", "import django", "django.urls", '"django"'],
    "React": ['from "react"', "from 'react'", '"react":', "'react':"],
    "Next.js": ['from "next', "from 'next", '"next":', "'next':"],
    "Vue": ['from "vue"', "from 'vue'", '"vue":'],
    "Express": ['require("express")', "require('express')", '"express":'],
    "Spring Boot": ["org.springframework.boot", "@SpringBootApplication"],
    "PyTorch": ["import torch", "from torch"],
    "TensorFlow": ["import tensorflow", "from tensorflow"],
    "Tailwind CSS": ['"tailwindcss":', "@tailwind base"],
}


class IndexingService:
    @staticmethod
    def detect_language(path: str) -> str:
        suffix = PurePosixPath(path).suffix.lower()
        base = PurePosixPath(path).name.lower()
        if base in ("dockerfile", "dockerfile.dev", "dockerfile.prod"):
            return "Dockerfile"
        if base == "makefile":
            return "Makefile"
        return EXTENSION_LANGUAGE_MAP.get(suffix, "Plain Text")

    @staticmethod
    def parse_python_ast(content: str) -> List[Dict[str, Any]]:
        """
        Parses Python code using AST to extract classes, functions, docstrings, and imports.
        """
        symbols: List[Dict[str, Any]] = []
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return symbols

        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.ClassDef):
                doc = ast.get_docstring(node) or ""
                methods = [m.name for m in node.body if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef))]
                symbols.append({
                    "type": "class",
                    "name": node.name,
                    "line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "docstring": doc.split("\n")[0] if doc else "",
                    "methods": methods,
                })
                # Index individual methods
                for m in node.body:
                    if isinstance(m, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        symbols.append({
                            "type": "method",
                            "name": f"{node.name}.{m.name}",
                            "line": m.lineno,
                            "end_line": getattr(m, "end_lineno", m.lineno),
                            "docstring": (ast.get_docstring(m) or "").split("\n")[0],
                        })
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                doc = ast.get_docstring(node) or ""
                symbols.append({
                    "type": "function",
                    "name": node.name,
                    "line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "docstring": doc.split("\n")[0] if doc else "",
                })
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    symbols.append({
                        "type": "import",
                        "name": alias.name,
                        "line": node.lineno,
                    })
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                for alias in node.names:
                    symbols.append({
                        "type": "import_from",
                        "name": f"{module}.{alias.name}",
                        "line": node.lineno,
                    })

        return symbols

    @staticmethod
    def extract_generic_symbols(content: str, language: str) -> List[Dict[str, Any]]:
        """
        Extracts structural symbols for non-Python languages using pattern matching.
        """
        symbols: List[Dict[str, Any]] = []
        lines = content.splitlines()

        # Regex patterns for functions, classes, exports
        func_regex = re.compile(r"^\s*(?:export\s+)?(?:async\s+)?(?:function\s+([a-zA-Z0-9_$]+)|const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\()")
        class_regex = re.compile(r"^\s*(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_$]+)")
        go_func_regex = re.compile(r"^func\s+(?:\([^\)]+\)\s+)?([a-zA-Z0-9_]+)\(")
        rust_fn_regex = re.compile(r"^\s*(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)")

        for idx, line in enumerate(lines, start=1):
            if language in ("JavaScript", "TypeScript", "JavaScript (React)", "TypeScript (React)"):
                c_match = class_regex.search(line)
                if c_match:
                    symbols.append({"type": "class", "name": c_match.group(1), "line": idx})
                    continue
                f_match = func_regex.search(line)
                if f_match:
                    name = f_match.group(1) or f_match.group(2)
                    if name:
                        symbols.append({"type": "function", "name": name, "line": idx})
            elif language == "Go":
                g_match = go_func_regex.search(line)
                if g_match:
                    symbols.append({"type": "function", "name": g_match.group(1), "line": idx})
            elif language == "Rust":
                r_match = rust_fn_regex.search(line)
                if r_match:
                    symbols.append({"type": "function", "name": r_match.group(1), "line": idx})

        return symbols

    def analyze_file(self, path: str, content: str) -> Dict[str, Any]:
        """
        Performs full structural analysis on a file.
        """
        language = self.detect_language(path)
        lines = content.splitlines()
        lines_count = len(lines)

        if language == "Python":
            symbols = self.parse_python_ast(content)
        else:
            symbols = self.extract_generic_symbols(content, language)

        return {
            "path": path,
            "language": language,
            "lines_count": lines_count,
            "size": len(content.encode("utf-8")),
            "symbols": symbols,
        }

    @staticmethod
    def detect_frameworks(files_content: Dict[str, str]) -> List[str]:
        """
        Scans code snippets and config files for popular framework signatures.
        """
        detected = set()
        for path, content in files_content.items():
            content_lower = content.lower()
            for framework, signatures in FRAMEWORK_SIGNATURES.items():
                if any(sig.lower() in content_lower for sig in signatures):
                    detected.add(framework)
        return sorted(list(detected))

    @staticmethod
    def identify_important_files(file_paths: List[str]) -> List[str]:
        """
        Finds core project files (entry points, configs, docs).
        """
        important_names = {
            "readme.md", "contributing.md", "package.json", "requirements.txt",
            "pyproject.toml", "cargo.toml", "go.mod", "dockerfile", "docker-compose.yml",
            "main.py", "app.py", "index.ts", "index.js", "app.tsx", "main.tsx", "server.js",
            "setup.py", "tsconfig.json", "vite.config.ts"
        }
        found = []
        for path in file_paths:
            base = PurePosixPath(path).name.lower()
            if base in important_names or path.lower() in important_names:
                found.append(path)
        return sorted(found)
