import pytest
from httpx import AsyncClient
from backend.app.fixtures.sample_repo import SAMPLE_REPO_ID, DELIBERATE_BUG_EXAMPLE


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "diagnostics" in data


@pytest.mark.asyncio
async def test_settings_endpoint(client: AsyncClient):
    response = await client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["backend_status"] == "healthy"
    assert "configured_model" in data


@pytest.mark.asyncio
async def test_demo_repositories(client: AsyncClient):
    response = await client.get("/api/demo-repositories")
    assert response.status_code == 200
    data = response.json()
    assert "built_in_fixture" in data
    assert "curated_github_repos" in data


@pytest.mark.asyncio
async def test_invalid_repo_url_rejected(client: AsyncClient):
    response = await client.post(
        "/api/repositories/analyze",
        json={"url": "https://gitlab.com/invalid/repo"},
    )
    assert response.status_code == 400
    assert "detail" in response.json()


@pytest.mark.asyncio
async def test_load_sample_and_query_flow(client: AsyncClient):
    # Load built-in sample repository fixture
    load_resp = await client.post("/api/demo-repositories/load-sample")
    assert load_resp.status_code == 200
    data = load_resp.json()
    assert data["status"] == "success"
    repo_id = data["repository_id"]

    # 1. Check repository overview
    repo_resp = await client.get(f"/api/repositories/{repo_id}")
    assert repo_resp.status_code == 200
    repo_data = repo_resp.json()
    assert repo_data["name"] == "medic-auth"
    assert "FastAPI" in repo_data["frameworks"]

    # 2. Check files list
    files_resp = await client.get(f"/api/repositories/{repo_id}/files")
    assert files_resp.status_code == 200
    files_data = files_resp.json()
    assert files_data["total_files"] > 0
    paths = [f["path"] for f in files_data["files"]]
    assert "src/main.py" in paths

    # 3. Check file content
    content_resp = await client.get(f"/api/repositories/{repo_id}/files/content?path=src/auth.py")
    assert content_resp.status_code == 200
    c_data = content_resp.json()
    assert "AuthService" in c_data["content"]

    # 4. Path traversal attempt on file content
    traversal_resp = await client.get(f"/api/repositories/{repo_id}/files/content?path=../../etc/passwd")
    assert traversal_resp.status_code == 403

    # 5. Ask question
    ask_resp = await client.post(
        f"/api/repositories/{repo_id}/ask",
        json={"question": "Where is the login endpoint implemented?", "max_snippets": 3},
    )
    assert ask_resp.status_code == 200
    ask_data = ask_resp.json()
    assert ask_data["grounded_in_code"] is True
    assert len(ask_data["referenced_files"]) > 0

    # 6. Bug Detective
    debug_resp = await client.post(
        f"/api/repositories/{repo_id}/debug",
        json=DELIBERATE_BUG_EXAMPLE,
    )
    assert debug_resp.status_code == 200
    debug_data = debug_resp.json()
    assert "KeyError" in debug_data["bug_summary"] or "KeyError" in debug_data["potential_root_cause"]
    assert "src/auth.py" in debug_data["relevant_files"]
    assert debug_data["suggested_fix"]["diff"] != ""

    # 7. Contributor guide
    guide_resp = await client.get(f"/api/repositories/{repo_id}/contributor-guide")
    assert guide_resp.status_code == 200
    guide_data = guide_resp.json()
    assert len(guide_data["entry_points"]) > 0
    assert len(guide_data["common_contributions"]) > 0

    # 8. History
    hist_resp = await client.get("/api/history")
    assert hist_resp.status_code == 200
    hist_data = hist_resp.json()
    assert len(hist_data) >= 1

    # 9. Delete history
    del_resp = await client.delete(f"/api/history/{repo_id}")
    assert del_resp.status_code == 200
