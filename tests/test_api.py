import os

os.environ["TESTING"] = "1"

from backend.api import app


def test_api_routes_registered():
    routes = [route.path for route in app.routes]
    assert "/api/health/live" in routes
    assert "/api/health/ready" in routes
    assert "/api/overview" in routes
    assert "/api/chart" in routes
    assert "/api/watchlist" in routes
    assert "/api/scanner/connectivity" in routes
    assert "/api/config/credentials" in routes
    assert "/api/config/symbol" in routes
    assert "/api/config/automation" in routes
    assert "/api/control/pause" in routes
    assert "/api/control/resume" in routes
    assert "/api/control/kill" in routes
    assert "/api/control/close-position" in routes
    assert "/api/control/reconcile" in routes


def test_api_metadata():
    assert app.title == "EdgePilot Delta Testnet Trading Bot API"
    assert app.version == "1.1.0"
