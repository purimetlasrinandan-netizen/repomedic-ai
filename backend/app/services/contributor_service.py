import re
from typing import Dict, Any, List, Optional
from pathlib import PurePosixPath

from backend.app.models.contributor import (
    ContributorGuideResponse,
    DirectoryInfo,
    ComponentInfo,
    CommonContributionQuestion,
)


class ContributorService:
    @staticmethod
    def extract_readme_instructions(readme_content: str) -> List[str]:
        """
        Extracts build, test, and run commands from README markdown code blocks.
        """
        instructions: List[str] = []
        if not readme_content:
            return instructions

        # Extract bash/shell code blocks
        blocks = re.findall(r"```(?:bash|sh|shell|console|cmd|powershell)?\s*\n(.*?)\n```", readme_content, re.DOTALL)
        for block in blocks:
            lines = [l.strip() for l in block.splitlines() if l.strip() and not l.strip().startswith("#")]
            for line in lines:
                if any(kw in line.lower() for kw in ("npm", "yarn", "pnpm", "pip", "python", "pytest", "cargo", "go run", "make", "docker")):
                    instructions.append(line)

        # Deduplicate while preserving order
        seen = set()
        deduped = []
        for inst in instructions:
            if inst not in seen:
                seen.add(inst)
                deduped.append(inst)

        return deduped[:10]

    @staticmethod
    def identify_entry_points(file_paths: List[str]) -> List[str]:
        """
        Identifies application entry points.
        """
        entry_patterns = {
            "main.py", "app.py", "run.py", "server.py", "wsgi.py", "asgi.py",
            "index.ts", "index.js", "main.ts", "main.js", "app.tsx", "main.tsx", "server.js",
            "main.go", "main.rs", "application.java", "src/index.ts", "src/main.py",
        }
        found = []
        for path in file_paths:
            path_lower = path.lower()
            base = PurePosixPath(path).name.lower()
            if base in entry_patterns or path_lower in entry_patterns:
                found.append(path)
        return sorted(found)

    @staticmethod
    def find_api_routes(files_data: List[Dict[str, Any]]) -> List[str]:
        """
        Detects API route declarations across indexed files.
        """
        routes: List[str] = []
        route_regexes = [
            # FastAPI / Flask: @app.get("/path") or @router.post("/path")
            re.compile(r'@(?:app|router|blueprint)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']'),
            # Express: app.get('/path', ...) or router.post('/path', ...)
            re.compile(r'(?:app|router)\.(get|post|put|delete|patch)\(["\']([^"\']+)["\']'),
        ]

        for f in files_data:
            content = f.get("content", "")
            path = f.get("path", "")
            for rx in route_regexes:
                for match in rx.finditer(content):
                    method = match.group(1).upper()
                    endpoint = match.group(2)
                    routes.append(f"{method} {endpoint} (in `{path}`)")
                    if len(routes) >= 15:
                        return routes

        return routes

    def generate_guide(
        self,
        repository_id: str,
        repo_metadata: Dict[str, Any],
        files_data: List[Dict[str, Any]],
        readme_content: str,
    ) -> ContributorGuideResponse:
        """
        Builds a comprehensive, evidence-grounded contributor onboarding guide.
        """
        all_paths = [f["path"] for f in files_data]

        # Categorize directories
        dir_map: Dict[str, List[str]] = {}
        for p in all_paths:
            parts = PurePosixPath(p).parts
            if len(parts) > 1:
                top_dir = parts[0]
                dir_map.setdefault(top_dir, []).append(p)

        directory_infos: List[DirectoryInfo] = []
        for top_dir, dir_files in sorted(dir_map.items()):
            # Infer purpose
            lower = top_dir.lower()
            if lower in ("tests", "test", "__tests__", "spec"):
                purpose = "Automated test suites and test fixtures."
            elif lower in ("docs", "documentation"):
                purpose = "Project documentation, architecture diagrams, and guides."
            elif lower in ("src", "app", "lib", "core", "pkg"):
                purpose = "Core application source code and business logic."
            elif lower in ("components", "ui", "views"):
                purpose = "User interface components and views."
            elif lower in ("api", "routes", "controllers"):
                purpose = "API endpoint handlers and request routing."
            elif lower in ("models", "schemas", "entities"):
                purpose = "Data models, database entities, and validation schemas."
            elif lower in ("services", "utils", "helpers"):
                purpose = "Reusable business services and utility helper modules."
            elif lower in ("scripts", "tools"):
                purpose = "Build, migration, and automation maintenance scripts."
            else:
                purpose = f"Module containing {len(dir_files)} project files."

            directory_infos.append(
                DirectoryInfo(
                    path=top_dir,
                    purpose=purpose,
                    key_files=[PurePosixPath(f).name for f in dir_files[:4]],
                )
            )

        # Entry points
        entry_points = self.identify_entry_points(all_paths)

        # Main components
        components: List[ComponentInfo] = []
        for f in files_data:
            symbols = f.get("symbols", [])
            for sym in symbols:
                if sym.get("type") in ("class", "function") and len(components) < 10:
                    components.append(
                        ComponentInfo(
                            name=sym.get("name", ""),
                            file_path=f["path"],
                            description=sym.get("docstring") or f"Core {sym.get('type')} in {f['path']}",
                        )
                    )

        # Test directories
        test_dirs = [d for d in dir_map.keys() if any(k in d.lower() for k in ("test", "spec"))]

        # Configuration files
        config_names = {"package.json", "pyproject.toml", "requirements.txt", "cargo.toml", "go.mod", "dockerfile", "docker-compose.yml", "tsconfig.json", "vite.config.ts", "setup.py"}
        config_files = [p for p in all_paths if PurePosixPath(p).name.lower() in config_names]

        # Build instructions
        build_instructions = self.extract_readme_instructions(readme_content)
        if not build_instructions:
            build_instructions = [
                "No explicit build commands extracted from README. Inspect package.json or requirements.txt before running."
            ]

        # API routes
        api_routes = self.find_api_routes(files_data)

        # Beginner start files
        beginner_files = entry_points[:3] + config_files[:2]
        if "README.md" in all_paths:
            beginner_files.insert(0, "README.md")

        # Common contribution questions
        common_questions: List[CommonContributionQuestion] = [
            CommonContributionQuestion(
                question="Which files should I understand first?",
                answer="Start with README.md for project overview, followed by the main entry point and configuration files.",
                relevant_files=beginner_files[:4],
            ),
            CommonContributionQuestion(
                question="Where can I add a new API endpoint?",
                answer="Look in API route directories or files defining route decorators (@app.get / router.get).",
                relevant_files=[r.split("`")[1] for r in api_routes[:3]] if api_routes else (entry_points[:2]),
            ),
            CommonContributionQuestion(
                question="Where are the tests located and how are they run?",
                answer=f"Test files are located in: {', '.join(test_dirs) if test_dirs else 'root/test directories'}. Look for files prefixed with test_ or ending in .test.",
                relevant_files=[p for p in all_paths if "test" in p.lower()][:4],
            ),
            CommonContributionQuestion(
                question="Where is configuration managed?",
                answer="Dependencies and environment settings are configured in the project manifest files.",
                relevant_files=config_files[:4],
            ),
        ]

        purpose = repo_metadata.get("description") or "Open-source codebase."
        frameworks = repo_metadata.get("frameworks", [])
        languages = repo_metadata.get("primary_languages", [])

        arch = f"Project built with {', '.join(languages) if languages else 'multiple languages'}"
        if frameworks:
            arch += f" utilizing {', '.join(frameworks)}."

        return ContributorGuideResponse(
            repository_id=repository_id,
            project_purpose=purpose,
            high_level_architecture=arch,
            important_directories=directory_infos,
            entry_points=entry_points,
            main_components=components,
            api_routes=api_routes,
            test_directories=test_dirs,
            configuration_files=config_files,
            build_and_run_instructions=build_instructions,
            beginner_start_files=list(dict.fromkeys(beginner_files)),
            common_contributions=common_questions,
        )
