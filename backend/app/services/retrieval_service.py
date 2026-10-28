import re
import math
from typing import List, Dict, Any, Tuple
from collections import Counter
from backend.app.models.qa import CodeSnippet


class RetrievalService:
    @staticmethod
    def tokenize(text: str) -> List[str]:
        """
        Tokenizes text into words and code identifiers, splitting camelCase and snake_case.
        """
        # Split on non-alphanumeric
        raw_tokens = re.findall(r"[a-zA-Z0-9_\.]+", text.lower())
        tokens = set()
        for t in raw_tokens:
            tokens.add(t)
            # Split snake_case
            if "_" in t:
                tokens.update(part for part in t.split("_") if len(part) > 1)
            # Split dots
            if "." in t:
                tokens.update(part for part in t.split(".") if len(part) > 1)
            # Split camelCase
            camel_parts = re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?=[A-Z][a-z]|\d|\W|$)|\d+", t)
            tokens.update(p.lower() for p in camel_parts if len(p) > 1)

        return [tok for tok in tokens if len(tok) > 1]

    @staticmethod
    def chunk_file(file_path: str, content: str, language: str, symbols: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Breaks a file into logical chunks (based on AST symbols or sliding windows).
        """
        lines = content.splitlines()
        chunks: List[Dict[str, Any]] = []

        if not lines:
            return chunks

        # If file has defined AST functions/classes, create symbol chunks first
        covered_lines = set()
        for sym in symbols:
            s_type = sym.get("type")
            start = sym.get("line", 1)
            end = sym.get("end_line", start + 30)
            end = min(end, len(lines))

            # Include docstrings / headers
            snippet_lines = lines[start - 1 : end]
            code = "\n".join(snippet_lines)

            chunks.append({
                "file_path": file_path,
                "start_line": start,
                "end_line": end,
                "code": code,
                "language": language,
                "symbol_name": sym.get("name", ""),
                "symbol_type": s_type,
            })
            for line_no in range(start, end + 1):
                covered_lines.add(line_no)

        # For remaining or all lines, create 40-line overlapping windows (step 25)
        window_size = 45
        step = 25
        for start_idx in range(0, len(lines), step):
            end_idx = min(start_idx + window_size, len(lines))
            start_line = start_idx + 1
            end_line = end_idx

            # Don't duplicate if already fully covered by a clean small symbol
            code = "\n".join(lines[start_idx:end_idx])
            chunks.append({
                "file_path": file_path,
                "start_line": start_line,
                "end_line": end_line,
                "code": code,
                "language": language,
                "symbol_name": "",
                "symbol_type": "block",
            })

            if end_idx >= len(lines):
                break

        return chunks

    def retrieve_relevant_snippets(
        self,
        query: str,
        files_data: List[Dict[str, Any]],  # list of {path, content, language, symbols}
        max_snippets: int = 5,
        target_file: str = None,
    ) -> List[CodeSnippet]:
        """
        Performs hybrid retrieval across all indexed files.
        Combines exact symbol matches, filename matching, and BM25 term weighting.
        """
        query_tokens = self.tokenize(query)
        if not query_tokens:
            query_tokens = [w.lower() for w in query.split() if w.strip()]

        query_counter = Counter(query_tokens)

        # Generate all chunks
        all_chunks: List[Dict[str, Any]] = []
        for f in files_data:
            path = f["path"]
            # If target_file is specified (e.g. from stack trace or input), prioritize it
            content = f.get("content", "")
            language = f.get("language", "text")
            symbols = f.get("symbols", [])
            chunks = self.chunk_file(path, content, language, symbols)
            all_chunks.extend(chunks)

        if not all_chunks:
            return []

        # Score chunks
        scored_chunks: List[Tuple[float, Dict[str, Any]]] = []

        for chunk in all_chunks:
            score = 0.0
            file_path_lower = chunk["file_path"].lower()
            code_lower = chunk["code"].lower()
            symbol_lower = chunk["symbol_name"].lower()

            # Target file boost
            if target_file and (target_file.lower() in file_path_lower or file_path_lower in target_file.lower()):
                score += 5.0

            # Symbol match boost
            if chunk["symbol_name"]:
                for q in query_tokens:
                    if q == symbol_lower:
                        score += 6.0
                    elif q in symbol_lower:
                        score += 3.5

            # File path match boost
            for q in query_tokens:
                if q in file_path_lower:
                    score += 2.5

            # Code body keyword matching (term frequency)
            code_tokens = self.tokenize(chunk["code"])
            code_counter = Counter(code_tokens)

            for token, q_count in query_counter.items():
                if token in code_counter:
                    # BM25-like sublinear term frequency
                    tf = code_counter[token]
                    score += math.log(1 + tf) * 1.2

            if score > 0:
                scored_chunks.append((score, chunk))

        # Sort descending by score
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # Deduplicate and pick top snippets
        results: List[CodeSnippet] = []
        seen_ranges = set()

        for score, chunk in scored_chunks:
            key = (chunk["file_path"], chunk["start_line"])
            if key in seen_ranges:
                continue

            seen_ranges.add(key)
            results.append(
                CodeSnippet(
                    file_path=chunk["file_path"],
                    start_line=chunk["start_line"],
                    end_line=chunk["end_line"],
                    code=chunk["code"],
                    language=chunk["language"],
                    relevance_score=round(float(score), 2),
                )
            )

            if len(results) >= max_snippets:
                break

        return results
