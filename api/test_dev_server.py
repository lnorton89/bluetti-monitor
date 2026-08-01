import unittest
from unittest.mock import patch

import dev_server


class DevServerTest(unittest.TestCase):
    def test_windows_child_uses_isolated_windowless_creation_flags(self):
        self.assertEqual(
            dev_server.child_creation_flags("nt"),
            dev_server.CREATE_NEW_PROCESS_GROUP | dev_server.CREATE_NO_WINDOW,
        )
        self.assertEqual(dev_server.child_creation_flags("posix"), 0)

    @patch("dev_server.subprocess.Popen")
    def test_main_runs_uvicorn_with_the_current_python(self, popen):
        popen.return_value.wait.return_value = 0

        self.assertEqual(dev_server.main(), 0)
        popen.assert_called_once_with(
            [dev_server.sys.executable, *dev_server.UVICORN_ARGS],
            creationflags=dev_server.child_creation_flags(),
            stdin=dev_server.sys.stdin,
            stdout=dev_server.sys.stdout,
            stderr=dev_server.sys.stderr,
        )


if __name__ == "__main__":
    unittest.main()
