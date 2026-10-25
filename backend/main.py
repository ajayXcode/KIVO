"""Application entry point: sets up sanitized logging and runs Uvicorn ASGI server."""

import logging
import sys
import uvicorn

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from backend.config import get_settings
from backend.security import SensitiveDataRedactor


def setup_logging():
    settings = get_settings()
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    redactor = SensitiveDataRedactor(patterns_to_redact=[
        settings.DELTA_API_KEY,
        settings.DELTA_API_SECRET
    ])
    handler.addFilter(redactor)

    root_logger.handlers = [handler]


def start():
    setup_logging()
    settings = get_settings()
    logging.info(f"Starting EdgePilot Trading Bot on {settings.HOST}:{settings.PORT} (Environment: {settings.ENVIRONMENT.value})")
    uvicorn.run(
        "backend.api:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        reload=False
    )


if __name__ == "__main__":
    start()

