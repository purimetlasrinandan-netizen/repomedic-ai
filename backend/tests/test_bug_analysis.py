import pytest
from backend.app.services.indexing_service import IndexingService
from backend.app.services.retrieval_service import RetrievalService
from backend.app.services.llm_service import LLMService
from backend.app.services.bug_analysis_service import BugAnalysisService
from backend.app.fixtures.sample_repo import SAMPLE_FILES, DELIBERATE_BUG_EXAMPLE


@pytest.mark.asyncio
async def test_bug_detective_analysis():
    indexing = IndexingService()
    retrieval = RetrievalService()
    llm = LLMService()
    bug_service = BugAnalysisService(retrieval, llm)

    files_data = []
    for path, content in SAMPLE_FILES.items():
        analysis = indexing.analyze_file(path, content)
        analysis["content"] = content
        files_data.append(analysis)

    result = await bug_service.analyze_bug(
        error_message=DELIBERATE_BUG_EXAMPLE["error_message"],
        stack_trace=DELIBERATE_BUG_EXAMPLE["stack_trace"],
        reproduction_steps=DELIBERATE_BUG_EXAMPLE["reproduction_steps"],
        suspected_file=DELIBERATE_BUG_EXAMPLE["suspected_file"],
        files_data=files_data,
    )

    assert result.bug_summary is not None
    assert "KeyError" in result.potential_root_cause or "KeyError" in result.bug_summary
    assert len(result.relevant_files) > 0
    assert "src/auth.py" in result.relevant_files
    assert result.suggested_fix is not None
    assert len(result.how_to_verify) > 0
    assert result.suggested_fix.diff != ""
