import {
  BluettiMqttServer,
  ConsoleLogger,
  WindowsHelperClient,
  createWindowsHelperRuntime,
  type DiscoveredBluetoothDevice,
} from "bluetti-mqtt-node";

const SCAN_RETRY_DELAY_MS = 3_000;
const SCAN_RETRY_COUNT = 3;
const STARTUP_GRACE_PERIOD_MS = 5_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;
const FALLBACK_MAC = "24:4C:AB:2C:24:8E";

export interface BluetoothDevice {
  mac: string;
  name: string;
  rssi?: number;
}

export interface BluettiMqttService {
  device: BluetoothDevice;
  stop: () => void;
}

export async function discoverAC500(): Promise<BluetoothDevice> {
  console.log("[bluetooth] Looking for AC500...");

  for (let attempt = 0; attempt < SCAN_RETRY_COUNT; attempt += 1) {
    const device = await scanForAC500();
    if (device) {
      return device;
    }

    if (attempt < SCAN_RETRY_COUNT - 1) {
      console.log(`[bluetooth] Retry ${attempt + 1}/${SCAN_RETRY_COUNT}...`);
      await Bun.sleep(SCAN_RETRY_DELAY_MS);
    }
  }

  console.log(`[bluetooth] Auto-discovery failed, using fallback MAC: ${FALLBACK_MAC}`);
  return { mac: FALLBACK_MAC, name: "AC500 (fallback)" };
}

export async function startBluettiMqttService(
  device: BluetoothDevice,
  brokerHost = "localhost",
): Promise<BluettiMqttService> {
  await assertNodeRuntimeWorks();

  const helper = new WindowsHelperClient();
  const runtime = createWindowsHelperRuntime(helper);
  const brokerUrl = normalizeBrokerUrl(brokerHost);
  const logger = new ConsoleLogger("info");
  const server = new BluettiMqttServer({
    addresses: [device.mac],
    transportFactory: runtime.transportFactory,
    intervalMs: DEFAULT_POLL_INTERVAL_MS,
    mqtt: { url: brokerUrl },
    logger,
  });

  console.log(`[bluetti-mqtt-node] Starting with MAC ${device.mac} and broker ${brokerUrl}...`);

  let stopped = false;
  const runPromise = server.run().finally(() => {
    helper.dispose();
  });

  void runPromise.catch((error: unknown) => {
    if (!stopped) {
      console.error("[bluetti-mqtt-node] Service exited unexpectedly", error);
    }
  });

  await verifyServiceStartup(runPromise, STARTUP_GRACE_PERIOD_MS);

  return {
    device,
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;
      console.log("[bluetti-mqtt-node] Stopping...");
      void server.stop().catch((error: unknown) => {
        console.error("[bluetti-mqtt-node] Failed to stop cleanly", error);
      });
    },
  };
}

async function scanForAC500(): Promise<BluetoothDevice | null> {
  console.log("[bluetooth] Scanning for Bluetti devices...");
  await assertNodeRuntimeWorks();

  const helper = new WindowsHelperClient();
  try {
    const runtime = createWindowsHelperRuntime(helper);
    const devices = await runtime.discovery?.discover();
    return parseDiscoveredDevices(devices ?? []);
  } finally {
    helper.dispose();
  }
}

function parseDiscoveredDevices(devices: readonly DiscoveredBluetoothDevice[]): BluetoothDevice | null {
  for (const device of devices) {
    if (!isValidMacAddress(device.address)) {
      continue;
    }

    const normalizedName = device.name.trim() || "Unknown";
    if (looksLikeBluetti(normalizedName)) {
      return {
        mac: device.address.toUpperCase(),
        name: normalizedName,
        rssi: parseRssi(device.rssi),
      };
    }
  }

  return null;
}

function parseRssi(rawRssi: number | undefined): number | undefined {
  if (rawRssi === undefined) {
    return undefined;
  }

  return Number.isFinite(rawRssi) ? rawRssi : undefined;
}

function looksLikeBluetti(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.includes("ac500") || normalized.includes("bluetti");
}

function isValidMacAddress(mac: string): boolean {
  return /^([0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i.test(mac);
}

async function verifyServiceStartup(runPromise: Promise<void>, gracePeriodMs: number) {
  const startupResult = await Promise.race([
    runPromise.then(
      () => ({ kind: "exit" as const }),
      (error) => ({ kind: "error" as const, error }),
    ),
    Bun.sleep(gracePeriodMs).then(() => ({ kind: "ready" as const })),
  ]);

  if (startupResult.kind === "exit") {
    throw new Error("bluetti-mqtt-node exited during startup.");
  }

  if (startupResult.kind === "error") {
    throw startupResult.error;
  }
}

async function assertNodeRuntimeWorks() {
  const process = Bun.spawn(["node", "--version"], {
    cwd: import.meta.dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  if (exitCode === 0) {
    return;
  }

  const details = `${stdout}\n${stderr}`.trim();
  throw new Error(details ? `node is not available on the host: ${details}` : "node is not available on the host.");
}

function normalizeBrokerUrl(brokerHost: string): string {
  if (/^[a-z]+:\/\//i.test(brokerHost)) {
    return brokerHost;
  }

  return `mqtt://${brokerHost}:1883`;
}
