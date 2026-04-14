from __future__ import annotations

from conftest import runtime_api_client, runtime_get, runtime_staff_headers


def test_dev_database_size_endpoint_is_protected_and_reports_shape() -> None:
    with runtime_api_client() as client:
        unauthorized = runtime_get(client, "/api/dev/database-size")
        assert unauthorized.status_code == 401

        receptionist_headers = runtime_staff_headers(client, email="recepcion@sunbronze.local")
        receptionist_response = runtime_get(client, "/api/dev/database-size", headers=receptionist_headers)
        assert receptionist_response.status_code == 403

        headers = runtime_staff_headers(client)
        response = runtime_get(client, "/api/dev/database-size", headers=headers)

    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload["total_bytes"], int)
    assert payload["total_label"].endswith(("MB", "GB", "TB"))
    assert isinstance(payload["tables"], list)
    for table in payload["tables"]:
        assert {"schema_name", "table_name", "total_bytes", "data_bytes", "index_bytes", "total_label", "percentage"} <= set(table)
