"""Run the development API in an isolated, windowless Windows process group."""

import os
import subprocess
import sys


CREATE_NEW_PROCESS_GROUP = 0x00000200
CREATE_NO_WINDOW = 0x08000000
UVICORN_ARGS = [
    "-m",
    "uvicorn",
    "main:app",
    "--host",
    "127.0.0.1",
    "--port",
    "8000",
    "--reload",
]


def child_creation_flags(platform_name: str = os.name) -> int:
    if platform_name != "nt":
        return 0
    return CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW


def main() -> int:
    child = subprocess.Popen(
        [sys.executable, *UVICORN_ARGS],
        creationflags=child_creation_flags(),
        stdin=sys.stdin,
        stdout=sys.stdout,
        stderr=sys.stderr,
    )

    try:
        return child.wait()
    except KeyboardInterrupt:
        child.terminate()
        return child.wait()


if __name__ == "__main__":
    raise SystemExit(main())
