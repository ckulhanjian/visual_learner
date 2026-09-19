"""End-to-end smoke test. Prints PASS/FAIL for a human to read; asserts nothing."""

import io

from app import create_app
from app.extensions import db
from app.seed import run_seed

WRITE_KEY = "verify-key"


def check(label, condition):
    print(f"[{'PASS' if condition else 'FAIL'}] {label}")


def main():
    app = create_app("testing")
    app.config["ATLAS_WRITE_KEY"] = WRITE_KEY
    keyed = {"X-Atlas-Key": WRITE_KEY}

    with app.app_context():
        db.create_all()
        run_seed()

    client = app.test_client()

    resp = client.get("/api/v1/health")
    check("GET /health returns 200", resp.status_code == 200)

    resp = client.get("/api/v1/meta")
    check("GET /meta returns the controlled vocabularies", "visual_kinds" in resp.get_json())

    resp = client.get("/api/v1/categories")
    categories = resp.get_json()
    check("GET /categories returns 200", resp.status_code == 200)
    check("categories carry a published_count", bool(categories) and "published_count" in categories[0])

    resp = client.get("/api/v1/tags")
    check("GET /tags returns 200", resp.status_code == 200)

    resp = client.get("/api/v1/visuals")
    published_slugs = {v["slug"] for v in resp.get_json()}
    check("public /visuals excludes pending items", "pending-example" not in published_slugs)

    resp = client.get("/api/v1/visuals/pending-example")
    check("a pending visual returns 404 to the public", resp.status_code == 404)

    resp = client.get("/api/v1/visuals/pending-example", headers=keyed)
    check("a pending visual is visible with a valid key", resp.status_code == 200)

    resp = client.get("/api/v1/visuals/does-not-exist")
    check("a missing visual also returns 404 (same as pending)", resp.status_code == 404)

    anon_payload = {
        "title": "Anonymous Submission",
        "kind": "svg",
        "source": "<svg></svg>",
        "category_slug": "physics",
        "summary_md": "test",
    }
    resp = client.post("/api/v1/visuals", json=anon_payload)
    check("anonymous submission returns 201", resp.status_code == 201)
    check("anonymous submission is queued as pending", resp.get_json().get("status") == "pending")

    trusted_payload = {**anon_payload, "title": "Trusted Submission"}
    resp = client.post("/api/v1/visuals", json=trusted_payload, headers=keyed)
    check("a keyed submission is published immediately", resp.get_json().get("status") == "published")

    wrong_key_payload = {**anon_payload, "title": "Wrong Key Submission"}
    resp = client.post("/api/v1/visuals", json=wrong_key_payload, headers={"X-Atlas-Key": "wrong-key"})
    check("a wrong key does not grant trust", resp.get_json().get("status") == "pending")

    resp = client.post("/api/v1/visuals", json={"kind": "svg", "category_slug": "physics"})
    check("a missing required field is a 422", resp.status_code == 422)

    resp = client.patch("/api/v1/visuals/fourier-series-square-wave", json={"title": "x"})
    check("PATCH without a key is rejected", resp.status_code == 401)

    dup_payload = {**anon_payload, "title": "Duplicate Title"}
    client.post("/api/v1/visuals", json=dup_payload, headers=keyed)
    resp = client.post("/api/v1/visuals", json=dup_payload, headers=keyed)
    check("a slug collision resolves with a numeric suffix", resp.get_json().get("slug") == "duplicate-title-2")

    resp = client.delete("/api/v1/categories/signals-systems")
    check("DELETE without a key is rejected", resp.status_code == 401)

    resp = client.delete("/api/v1/categories/signals-systems", headers=keyed)
    check("deleting a non-empty category is a 409", resp.status_code == 409)

    resp = client.post(
        "/api/v1/uploads",
        data={"file": (io.BytesIO(b"fake-png-bytes"), "test.png")},
        content_type="multipart/form-data",
    )
    check("an image upload succeeds", resp.status_code == 201)
    check("an image upload returns asset_path", "asset_path" in resp.get_json())

    resp = client.post(
        "/api/v1/uploads",
        data={"file": (io.BytesIO(b"<html></html>"), "test.html")},
        content_type="multipart/form-data",
    )
    check("a disallowed file extension is rejected", resp.status_code == 422)

    app.config["RATE_LIMIT_MAX"] = 3
    rate_limit_headers = {"X-Forwarded-For": "203.0.113.5"}
    for i in range(3):
        client.post(
            "/api/v1/visuals",
            json={**anon_payload, "title": f"Rate Limit {i}"},
            headers=rate_limit_headers,
        )
    resp = client.post(
        "/api/v1/visuals", json={**anon_payload, "title": "Rate Limit Over"}, headers=rate_limit_headers
    )
    check("the rate limit trips at the configured count", resp.status_code == 429)
    check("a 429 carries a Retry-After header", "Retry-After" in resp.headers)

    resp = client.post(
        "/api/v1/visuals",
        json={**anon_payload, "title": "Rate Limit Keyholder"},
        headers={**rate_limit_headers, **keyed},
    )
    check("keyholders are exempt from the rate limit", resp.status_code == 201)


if __name__ == "__main__":
    main()
