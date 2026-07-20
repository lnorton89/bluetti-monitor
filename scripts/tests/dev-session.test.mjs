import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { createDevSessionLogger, pipeProcessOutput, stripAnsi } from "../dev-session.mjs";

test("session logger writes labeled JSON records and strips ANSI output", () => {
  const root = mkdtempSync(join(tmpdir(), "bluetti-dev-session-"));
  const logPath = join(root, "dev-all.log");
  const consoleLines = [];
  const timestamps = [
    new Date("2026-07-20T01:00:00.000Z"),
    new Date("2026-07-20T01:00:01.000Z"),
    new Date("2026-07-20T01:00:02.000Z"),
  ];

  try {
    const logger = createDevSessionLogger({
      logPath,
      clock: () => timestamps.shift() ?? new Date("2026-07-20T01:00:03.000Z"),
      consoleWriter: (line) => consoleLines.push(line),
      processId: 42,
    });

    logger.event("supervisor", "session starting", { pid: 42 });
    logger.output("monitor", "stdout", "\u001b[32mready\u001b[0m");

    const records = readFileSync(logPath, "utf8").trim().split("\n").map(JSON.parse);
    assert.equal(records.length, 2);
    assert.equal(records[0].sessionId, "2026-07-20T01:00:00.000Z-42");
    assert.equal(records[1].component, "monitor");
    assert.equal(records[1].line, "ready");
    assert.match(consoleLines[1], /\[monitor\] ready$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("process output piping preserves complete and trailing lines", async () => {
  const seen = [];
  const stream = new PassThrough();
  pipeProcessOutput(stream, {
    component: "desktop",
    streamName: "stderr",
    logger: { output: (...args) => seen.push(args) },
  });

  stream.write("first\nsec");
  stream.end("ond");
  await new Promise((resolvePromise) => stream.once("end", resolvePromise));

  assert.deepEqual(seen, [
    ["desktop", "stderr", "first"],
    ["desktop", "stderr", "second"],
  ]);
});

test("rotation retains only complete JSON lines", () => {
  const root = mkdtempSync(join(tmpdir(), "bluetti-dev-rotation-"));
  const logPath = join(root, "dev-all.log");
  const oldRecords = Array.from({ length: 12 }, (_, index) => JSON.stringify({ index, value: "x".repeat(50) }));

  try {
    writeFileSync(logPath, `${oldRecords.join("\n")}\n`, "utf8");
    const logger = createDevSessionLogger({
      logPath,
      consoleWriter: () => {},
      maxBytes: 200,
      retainBytes: 120,
    });
    logger.event("supervisor", "rotated");

    const lines = readFileSync(logPath, "utf8").trim().split("\n");
    assert.ok(lines.length >= 1);
    for (const line of lines) {
      assert.doesNotThrow(() => JSON.parse(line));
    }
    assert.equal(JSON.parse(lines.at(-1)).event, "rotated");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stripAnsi removes terminal escape sequences", () => {
  assert.equal(stripAnsi("\u001b[31merror\u001b[0m"), "error");
});
