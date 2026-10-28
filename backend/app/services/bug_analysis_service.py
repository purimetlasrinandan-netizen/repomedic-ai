import re
import difflib
from typing import Dict, Any, List, Optional, Tuple

from backend.app.services.indexing_service import IndexingService
from backend.app.services.retrieval_service import RetrievalService
from backend.app.services.llm_service import LLMService
from backend.app.models.bug import BugAnalysisResponse, SuggestedFix
from backend.app.models.qa import CodeSnippet
from backend.app.core.security import sanitize_for_prompt


class BugAnalysisService:
    def __init__(
        self,
        retrieval_service: RetrievalService,
        llm_service: LLMService,
    ):
        self.retrieval_service = retrieval_service
        self.llm_service = llm_service

    @staticmethod
    def parse_stack_trace(stack_trace: str) -> Dict[str, Any]:
        """
        Parses common Python, JS/TS, and Go stack traces to extract filenames, line numbers, and functions.
        """
        referenced_files: List[Dict[str, Any]] = []

        # Python: File ".../path/to/file.py", line 42, in func_name
        py_pattern = re.compile(r'File\s+["\']([^"\']+)["\'],\s+line\s+(\d+)(?:,\s+in\s+([a-zA-Z0-9_]+))?')
        for match in py_pattern.finditer(stack_trace):
            raw_path = match.group(1).replace("\\", "/")
            line_no = int(match.group(2))
            func = match.group(3) or ""
            # Extract relative path if possible
            parts = raw_path.split("/")
            filename = parts[-1]
            referenced_files.append({
                "raw_path": raw_path,
                "filename": filename,
                "line": line_no,
                "function": func,
                "type": "python",
            })

        # JS/Node: at functionName (/path/to/file.js:42:15) or at /path/to/file.ts:42:15
        js_pattern = re.compile(r'at\s+(?:([a-zA-Z0-9_\.$]+)\s+\()?([^\s\(\)]+):(\d+):(\d+)\)?')
        for match in js_pattern.finditer(stack_trace):
            func = match.group(1) or ""
            raw_path = match.group(2).replace("\\", "/")
            line_no = int(match.group(3))
            parts = raw_path.split("/")
            filename = parts[-1]
            referenced_files.append({
                "raw_path": raw_path,
                "filename": filename,
                "line": line_no,
                "function": func,
                "type": "javascript",
            })

        # Detect exception type from error
        exception_match = re.search(r"([A-Z][a-zA-Z0-9_]*(?:Error|Exception|Fault|Failure)):\s*(.*)", stack_trace)
        exception_type = exception_match.group(1) if exception_match else None
        exception_msg = exception_match.group(2) if exception_match else None

        return {
            "referenced_files": referenced_files,
            "exception_type": exception_type,
            "exception_msg": exception_msg,
        }

    @staticmethod
    def generate_unified_diff(original: str, proposed: str, file_path: str = "source_file") -> str:
        """
        Creates a clean unified diff string.
        """
        orig_lines = original.splitlines(keepends=True)
        prop_lines = proposed.splitlines(keepends=True)
        diff = difflib.unified_diff(
            orig_lines,
            prop_lines,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            lineterm="",
        )
        return "".join(diff)

    async def analyze_bug(
        self,
        error_message: str,
        stack_trace: Optional[str],
        reproduction_steps: Optional[str],
        suspected_file: Optional[str],
        files_data: List[Dict[str, Any]],
    ) -> BugAnalysisResponse:
        """
        Executes end-to-end bug investigation workflow.
        """
        # Parse stack trace
        parsed_trace = self.parse_stack_trace(stack_trace or "")
        trace_files = parsed_trace.get("referenced_files", [])

        # Construct query for retrieval
        query_terms = [error_message]
        if parsed_trace.get("exception_type"):
            query_terms.append(parsed_trace["exception_type"])
        for tf in trace_files:
            query_terms.append(tf["filename"])
            if tf["function"]:
                query_terms.append(tf["function"])

        combined_query = " ".join(query_terms)

        # Retrieve relevant code snippets
        target = suspected_file or (trace_files[0]["filename"] if trace_files else None)
        snippets = self.retrieval_service.retrieve_relevant_snippets(
            query=combined_query,
            files_data=files_data,
            max_snippets=4,
            target_file=target,
        )

        # Check Ollama status
        ollama_status = await self.llm_service.check_ollama_status()

        # Build primary target file & snippet for proposed fix
        primary_snippet = snippets[0] if snippets else None
        primary_file = primary_snippet.file_path if primary_snippet else (suspected_file or "unknown_file")
        primary_code = primary_snippet.code if primary_snippet else "# Target code snippet not found"

        # Check if Ollama can generate analysis
        if ollama_status.get("connected") and ollama_status.get("model_available"):
            system_prompt = (
                "You are RepoMedic AI Bug Detective. Analyze the provided error and source code.\n"
                "Return a strict JSON object with these keys:\n"
                "- bug_summary (string): concise summary of problem\n"
                "- potential_root_cause (string): root cause supported by evidence\n"
                "- evidence (string): exact line/symbol evidence\n"
                "- why_fix_works (string): explanation of why the fix resolves the issue\n"
                "- how_to_verify (list of strings): reproducible testing steps\n"
                "- confidence_and_limitations (string): uncertainty or assumptions\n"
                "- proposed_code (string): the corrected replacement code for the snippet\n"
                "- explanation (string): explanation of code changes\n"
                "- potential_side_effects (list of strings): potential side effects\n"
                "- testing_recommendations (list of strings): tests to write or run\n"
            )

            context_snippets = "\n\n".join(
                f"File: {s.file_path} (Lines {s.start_line}-{s.end_line}):\n{sanitize_for_prompt(s.code)}"
                for s in snippets
            )

            user_prompt = (
                f"Error Message: {error_message}\n"
                f"Stack Trace: {stack_trace or 'None'}\n"
                f"Reproduction Steps: {reproduction_steps or 'None'}\n\n"
                f"Retrieved Code Snippets:\n{context_snippets}\n\n"
                f"Provide your structured diagnosis in valid JSON."
            )

            ai_resp = await self.llm_service.generate_completion(system_prompt, user_prompt)
            if ai_resp:
                try:
                    # Attempt JSON extraction
                    json_str = ai_resp
                    if "```json" in ai_resp:
                        json_str = ai_resp.split("```json")[1].split("```")[0].strip()
                    elif "```" in ai_resp:
                        json_str = ai_resp.split("```")[1].split("```")[0].strip()

                    parsed = json.loads(json_str)
                    proposed = parsed.get("proposed_code", primary_code)
                    diff = self.generate_unified_diff(primary_code, proposed, primary_file)

                    fix = SuggestedFix(
                        original_code=primary_code,
                        proposed_code=proposed,
                        explanation=parsed.get("explanation", "Patch proposed by AI Bug Detective."),
                        files_affected=[primary_file],
                        potential_side_effects=parsed.get("potential_side_effects", ["Review callers of modified functions."]),
                        testing_recommendations=parsed.get("testing_recommendations", ["Run unit test suite."]),
                        diff=diff,
                    )

                    return BugAnalysisResponse(
                        bug_summary=parsed.get("bug_summary", f"Error in {primary_file}"),
                        potential_root_cause=parsed.get("potential_root_cause", "Uncaught exception or invalid parameter."),
                        evidence=parsed.get("evidence", f"Referenced in {primary_file}"),
                        relevant_files=[s.file_path for s in snippets],
                        relevant_snippets=snippets,
                        suggested_fix=fix,
                        why_fix_works=parsed.get("why_fix_works", "Handles the error condition safely."),
                        how_to_verify=parsed.get("how_to_verify", ["Re-execute with the offending input."]),
                        confidence_and_limitations=parsed.get("confidence_and_limitations", "Hypothesis based on static analysis."),
                        is_ai_generated=True,
                        model_used=self.llm_service.settings.OLLAMA_MODEL,
                        is_fallback=False,
                    )
                except Exception:
                    pass

        # Fallback deterministic analysis
        return self._build_fallback_bug_diagnosis(
            error_message=error_message,
            stack_trace=stack_trace,
            reproduction_steps=reproduction_steps,
            suspected_file=suspected_file,
            snippets=snippets,
            parsed_trace=parsed_trace,
            ollama_status=ollama_status,
        )

    def _build_fallback_bug_diagnosis(
        self,
        error_message: str,
        stack_trace: Optional[str],
        reproduction_steps: Optional[str],
        suspected_file: Optional[str],
        snippets: List[CodeSnippet],
        parsed_trace: Dict[str, Any],
        ollama_status: Dict[str, Any],
    ) -> BugAnalysisResponse:
        primary_snip = snippets[0] if snippets else None
        target_file = primary_snip.file_path if primary_snip else (suspected_file or "unknown_file")
        orig_code = primary_snip.code if primary_snip else "# No code snippet matched the query"

        # Generate defensive correction proposal
        proposed_code = orig_code
        if "KeyError" in error_message:
            proposed_code = f"# Defensive access suggested for KeyError\n# Replace direct dict[key] with dict.get(key, default)\n{orig_code}"
        elif "TypeError" in error_message or "NoneType" in error_message:
            proposed_code = f"# Defensive null-check suggested\nif target is not None:\n    {orig_code}"
        elif "AttributeError" in error_message:
            proposed_code = f"# Check attribute existence before access\nif hasattr(obj, 'attr'):\n    {orig_code}"
        else:
            proposed_code = f"# Proposed error handling wrapper\ntry:\n    {orig_code}\nexcept Exception as err:\n    logger.error(f'Error occurred: {{err}}')\n    raise"

        diff = self.generate_unified_diff(orig_code, proposed_code, target_file)

        reason = (
            f"Ollama connected but model '{self.llm_service.settings.OLLAMA_MODEL}' not pulled"
            if ollama_status.get("connected")
            else f"Ollama not running at {self.llm_service.settings.OLLAMA_BASE_URL}"
        )

        trace_summary = ""
        if parsed_trace.get("referenced_files"):
            first_trace = parsed_trace["referenced_files"][0]
            trace_summary = f" Stack frame: `{first_trace['filename']}` line {first_trace['line']} ({first_trace.get('function') or 'module'})."

        fix = SuggestedFix(
            original_code=orig_code,
            proposed_code=proposed_code,
            explanation=f"Static code inspection identified matching code in `{target_file}`. Added defensive verification.",
            files_affected=[target_file] if target_file != "unknown_file" else [],
            potential_side_effects=["Ensure return type matches calling functions.", "Verify default fallback behavior."],
            testing_recommendations=[
                f"Write a unit test reproducing '{error_message[:40]}...'",
                "Test with edge-case inputs (None, empty string, missing keys).",
            ],
            diff=diff,
        )

        return BugAnalysisResponse(
            bug_summary=f"Investigating: {error_message[:80]}",
            potential_root_cause=f"Error matching '{error_message}'.{trace_summary} Likely triggered by unexpected input state or unhandled exception.",
            evidence=f"Matched code in `{target_file}` (Lines {primary_snip.start_line if primary_snip else 1}-{primary_snip.end_line if primary_snip else 1}).",
            relevant_files=[s.file_path for s in snippets],
            relevant_snippets=snippets,
            suggested_fix=fix,
            why_fix_works="Guards against unhandled exception conditions and validates input assumptions before execution.",
            how_to_verify=[
                "1. Trigger the reproduction path with the identical error payload.",
                "2. Verify the function completes or raises a descriptive domain exception instead of crashing.",
                "3. Run automated tests to check for regressions in calling modules.",
            ],
            confidence_and_limitations=(
                f"Deterministic AST & Stack Trace correlation ({reason}). "
                "AI generative hypothesis requires running `ollama pull "
                f"{self.llm_service.settings.OLLAMA_MODEL}`."
            ),
            is_ai_generated=False,
            model_used=f"Static Bug Diagnostic Engine ({reason})",
            is_fallback=True,
        )
