# Deferred Items

- During the live smoke test, FastAPI emitted transient `database is locked` warnings while MQTT ingestion and dashboard history requests overlapped. The API recovered automatically and telemetry continued, but SQLite connection/transaction serialization should be investigated separately from the development-supervisor work.
