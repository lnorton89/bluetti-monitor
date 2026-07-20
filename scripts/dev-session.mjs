import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

const ANSI_ESCAPE_PATTERN = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))/g;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_RETAIN_BYTES = 512 * 1024;

export function createDevSessionLogger({
  logPath,
  clock = () => new Date(),
  consoleWriter = (line) => process.stdout.write(`${line}\n`),
  maxBytes = DEFAULT_MAX_BYTES,
  retainBytes = DEFAULT_RETAIN_BYTES,
  processId = process.pid,
} = {}) {
  if (!logPath) {
    throw new Error("createDevSessionLogger requires logPath");
  }

  const startedAt = clock();
  const sessionId = `${startedAt.toISOString()}-${processId}`;

  function writeRecord(component, event, details = {}) {
    const timestamp = clock().toISOString();
    const record = sanitizeRecord({
      timestamp,
      sessionId,
      component,
      event,
      ...details,
    });

    writeConsoleRecord(record, consoleWriter);

    try {
      mkdirSync(dirname(logPath), { recursive: true });
      rotateLogIfNeeded(logPath, maxBytes, retainBytes);
      appendFileSync(logPath, `${JSON.stringify(record)}\n`, "utf8");
    } catch {
      // Development logging must not bring down the supervised processes.
    }

    return record;
  }

  return {
    sessionId,
    event(component, event, context = {}) {
      return writeRecord(component, event, { context });
    },
    output(component, stream, line) {
      const cleanLine = stripAnsi(String(line)).trimEnd();
      if (cleanLine.trim().length === 0) {
        return null;
      }

      return writeRecord(component, "output", { stream, line: cleanLine });
    },
  };
}

export function pipeProcessOutput(stream, { component, streamName, logger }) {
  if (!stream) {
    return;
  }

  stream.setEncoding("utf8");
  let pending = "";

  stream.on("data", (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      logger.output(component, streamName, line);
    }
  });

  stream.on("end", () => {
    if (pending.length > 0) {
      logger.output(component, streamName, pending);
      pending = "";
    }
  });
}

export function stripAnsi(value) {
  return value.replace(ANSI_ESCAPE_PATTERN, "");
}

function sanitizeRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  );
}

function writeConsoleRecord(record, consoleWriter) {
  const time = record.timestamp.slice(11, 23);
  const prefix = `[${time}] [${record.component}]`;

  if (record.event === "output") {
    consoleWriter(`${prefix} ${record.line}`);
    return;
  }

  const context = record.context && Object.keys(record.context).length > 0
    ? ` ${JSON.stringify(record.context)}`
    : "";
  consoleWriter(`${prefix} ${record.event}${context}`);
}

function rotateLogIfNeeded(logPath, maxBytes, retainBytes) {
  if (!existsSync(logPath) || statSync(logPath).size <= maxBytes) {
    return;
  }

  const contents = readFileSync(logPath, "utf8");
  const retainedStart = Math.max(0, contents.length - retainBytes);
  const newlineIndex = contents.indexOf("\n", retainedStart);
  const retained = newlineIndex >= 0 ? contents.slice(newlineIndex + 1) : "";
  writeFileSync(logPath, retained, "utf8");
}
