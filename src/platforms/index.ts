import { MacOsNotifier } from "./macos.ts";

export type NotificationInput = {
  title?: string;
  message?: string;
  sound?: string;
  backend?: string;
  debug?: boolean;
};

export type Notifier = {
  notify(input: NotificationInput): Promise<void>;
};

export function createPlatformNotifier(platform: NodeJS.Platform): Notifier {
  if (platform === "darwin") {
    return new MacOsNotifier();
  }

  throw new Error(`Unsupported platform: ${platform}`);
}
