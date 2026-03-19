import { parseArgs } from "node:util";

import { createPlatformNotifier, type Notifier } from "./platforms/index.ts";

type Writable = {
  write(text: string): void;
};

export type MainDependencies = {
  platform?: NodeJS.Platform;
  stderr?: Writable;
  stdout?: Writable;
  createNotifier?: (platform: NodeJS.Platform) => Notifier;
};

type CliOptions = {
  help?: boolean;
  title?: string;
  message?: string;
  sound?: string;
  backend?: string;
  debug?: boolean;
};

const DEFAULT_SOUND = "Glass";
const BUILT_IN_SOUNDS = [
  "Basso",
  "Blow",
  "Bottle",
  "Frog",
  "Funk",
  "Glass",
  "Hero",
  "Morse",
  "Ping",
  "Pop",
  "Purr",
  "Sosumi",
  "Submarine",
  "Tink"
] as const;
const USAGE =
  "Usage: notify [--title <title>] [--message <message>] [--sound <sound-name-or-file>]\n"
  + "       notify [-t <title>] [-m <message>] [-s <sound-name-or-file>]\n"
  + "       notify [--backend <legacy|standard|alert>] [--debug] [--help]\n";
const HELP = `${USAGE}
Options:
  --title, -t     Alert title
  --message, -m   Alert body
  --sound, -s     Built-in sound name or path to a sound file
  --backend, -b   macOS backend: alert, legacy, standard
  --debug, -d     Print debug information and executed commands
  --help, -h      Show this help

Behavior:
  If only title or message is provided, the alert uses that text.
  If only sound is provided, only the sound is played.
  If nothing is provided, the default sound "${DEFAULT_SOUND}" is played.
  If sound and alert text are both provided, sound starts first.

Built-in sounds:
  ${BUILT_IN_SOUNDS.join(", ")}
`;

export async function main(
  argv: string[],
  dependencies: MainDependencies = {}
): Promise<number> {
  const stderr = dependencies.stderr ?? process.stderr;
  const stdout = dependencies.stdout ?? process.stdout;

  let options: CliOptions;
  try {
    options = parseCliOptions(argv);
  } catch (error) {
    stderr.write(formatError(error));
    stderr.write(USAGE);
    return 1;
  }

  if (options.help) {
    stdout.write(HELP);
    return 0;
  }

  const platform = dependencies.platform ?? process.platform;
  if (!options.title && !options.message && !options.sound) {
    options = { ...options, sound: DEFAULT_SOUND };
  }

  try {
    const createNotifier =
      dependencies.createNotifier ?? createPlatformNotifier;
    const notifier = createNotifier(platform);
    await notifier.notify(options);
    return 0;
  } catch (error) {
    stderr.write(formatError(error));
    return 1;
  }
}

function parseCliOptions(argv: string[]): CliOptions {
  const { values } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      title: { type: "string", short: "t" },
      message: { type: "string", short: "m" },
      sound: { type: "string", short: "s" },
      backend: { type: "string", short: "b" },
      debug: { type: "boolean", short: "d" }
    },
    allowPositionals: false
  });

  return {
    ...(values.help ? { help: true } : {}),
    ...(values.title ? { title: values.title } : {}),
    ...(values.message ? { message: values.message } : {}),
    ...(values.sound ? { sound: values.sound } : {}),
    ...(values.backend ? { backend: values.backend } : {}),
    ...(values.debug ? { debug: true } : {})
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.message}\n`;
  }

  return "Unknown error\n";
}
