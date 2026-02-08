# Example API integration tests
def test_results_api(client):
    response = client.get("/api/results")
    assert response.status_code == 200