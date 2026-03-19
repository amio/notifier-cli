import path from "node:path";
import fs from "node:fs";
import { promisify } from "node:util";
import { execFile as execFileCallback, spawn } from "node:child_process";

import type { NotificationInput, Notifier } from "./index.ts";

const execFile = promisify(execFileCallback);
const SOUND_FILE_EXTENSIONS = new Set([
  ".aif",
  ".aiff",
  ".caf",
  ".m4a",
  ".mp3",
  ".wav"
]);

export type ExecFile = (
  command: string,
  args: string[]
) => Promise<unknown>;
type StartProcess = (command: string, args: string[]) => void;

type ResolveSoundPath = (sound: string) => string;
type Writable = {
  write(text: string): void;
};
const DEFAULT_SOUND = "Glass";
const ALERT_SOUND_DELAY_SECONDS = 0.15;

export class MacOsNotifier implements Notifier {
  readonly #execFile: ExecFile;
  readonly #startProcess: StartProcess;
  readonly #resolveSoundPath: ResolveSoundPath;
  readonly #stderr: Writable;

  constructor(
    dependencies: {
      execFile?: ExecFile;
      startProcess?: StartProcess;
      resolveSoundPath?: ResolveSoundPath;
      stderr?: Writable;
    } = {}
  ) {
    this.#execFile = dependencies.execFile ?? execFile;
    this.#startProcess = dependencies.startProcess ?? startProcess;
    this.#resolveSoundPath =
      dependencies.resolveSoundPath ?? resolveSoundPath;
    this.#stderr = dependencies.stderr ?? process.stderr;
  }

  async notify(input: NotificationInput): Promise<void> {
    const title = input.title?.trim();
    const message = input.message?.trim();
    const sound = input.sound ?? (!title && !message ? DEFAULT_SOUND : undefined);
    const backend = normalizeBackend(input.backend);
    const script = buildNotificationScript(
      { ...input, title, message },
      backend,
      Boolean(sound)
    );

    if (sound) {
      const soundPath = this.#resolveSoundPath(sound);
      if (input.debug) {
        this.#stderr.write(`[debug] exec: afplay ${quoteArg(soundPath)}\n`);
      }
      this.#startProcess("afplay", [soundPath]);
    }

    if (!script) {
      return;
    }

    const notificationArgs = ["-l", "JavaScript", "-e", script];

    if (input.debug) {
      this.#stderr.write(`[debug] backend: ${backend}\n`);
      this.#stderr.write(
        `[debug] exec: osascript ${notificationArgs.map(quoteArg).join(" ")}\n`
      );
    }

    await this.#execFile("osascript", notificationArgs);
  }
}

function buildNotificationScript(
  input: NotificationInput,
  backend: "legacy" | "standard" | "alert",
  delayForSound: boolean
): string | null {
  const primaryText =
    backend === "standard"
      ? input.message || input.title
      : input.title || input.message;
  const secondaryText =
    input.title && input.message && backend !== "standard"
      ? input.message
      : undefined;

  if (!primaryText) {
    return null;
  }

  if (backend === "alert") {
    const parts = [
      "const app = Application.currentApplication();",
      "app.includeStandardAdditions = true;",
      ...(delayForSound ? [`delay(${ALERT_SOUND_DELAY_SECONDS});`] : []),
      secondaryText
        ? `app.displayAlert(${JSON.stringify(primaryText)}, { message: ${JSON.stringify(secondaryText)} });`
        : `app.displayAlert(${JSON.stringify(primaryText)});`
    ];
    return parts.join(" ");
  }

  if (backend === "standard") {
    const options = input.title && input.message
      ? `{ withTitle: ${JSON.stringify(input.title)} }`
      : undefined;
    return [
      "const app = Application.currentApplication();",
      "app.includeStandardAdditions = true;",
      `app.displayNotification(${JSON.stringify(primaryText)}${options ? `, ${options}` : ""});`
    ].join(" ");
  }

  return [
    'ObjC.import("AppKit");',
    "const notification = $.NSUserNotification.alloc.init;",
    ...(input.title ? [`notification.title = ${JSON.stringify(input.title)};`] : []),
    ...(secondaryText
      ? [`notification.informativeText = ${JSON.stringify(secondaryText)};`]
      : []),
    "$.NSUserNotificationCenter.defaultUserNotificationCenter.scheduleNotification(notification);",
    "delay(1);"
  ].join(" ");
}

function normalizeBackend(
  value: string | undefined
): "legacy" | "standard" | "alert" {
  if (!value || value === "alert") {
    return "alert";
  }

  if (value === "standard") {
    return "standard";
  }

  if (value === "legacy") {
    return "legacy";
  }

  throw new Error(`Unsupported macOS backend: ${value}`);
}

function isSoundFileReference(sound: string): boolean {
  return (
    path.isAbsolute(sound) ||
    sound.startsWith("./") ||
    sound.startsWith("../") ||
    SOUND_FILE_EXTENSIONS.has(path.extname(sound).toLowerCase())
  );
}

function resolveSoundPath(sound: string): string {
  if (isSoundFileReference(sound)) {
    return sound;
  }

  for (const extension of SOUND_FILE_EXTENSIONS) {
    const candidate = path.join("/System/Library/Sounds", `${sound}${extension}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unknown macOS sound: ${sound}`);
}

function quoteArg(value: string): string {
  return JSON.stringify(value);
}

function startProcess(command: string, args: string[]): void {
  const child = spawn(command, args, {
    stdio: "ignore"
  });
  child.unref();
}
