import test from "node:test";
import assert from "node:assert/strict";

import { MacOsNotifier } from "../src/platforms/macos.ts";

test(
  "uses alert by default and resolves built-in sounds to afplay",
  async () => {
    const commands: Array<{ command: string; args: string[] }> = [];
    const notifier = new MacOsNotifier({
      execFile: async (command, args) => {
        commands.push({ command, args });
      },
      startProcess: (command, args) => {
        commands.push({ command, args });
      },
      resolveSoundPath: (sound) => `/System/Library/Sounds/${sound}.aiff`
    });

    await notifier.notify({
      title: "Title",
      message: "Message",
      sound: "Glass"
    });

    assert.deepEqual(commands, [
      {
        command: "afplay",
        args: ["/System/Library/Sounds/Glass.aiff"]
      },
      {
        command: "osascript",
        args: [
          "-l",
          "JavaScript",
          "-e",
          'const app = Application.currentApplication(); app.includeStandardAdditions = true; delay(0.15); app.displayAlert("Title", { message: "Message" });'
        ]
      }
    ]);
  }
);

test("uses the legacy backend script when requested", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    },
    startProcess: (command, args) => {
      commands.push({ command, args });
    }
  });

  await notifier.notify({
    title: "Title",
    message: "Message",
    backend: "legacy"
  });

  assert.deepEqual(commands, [
    {
        command: "osascript",
        args: [
          "-l",
          "JavaScript",
          "-e",
          'ObjC.import("AppKit"); const notification = $.NSUserNotification.alloc.init; notification.title = "Title"; notification.informativeText = "Message"; $.NSUserNotificationCenter.defaultUserNotificationCenter.scheduleNotification(notification); delay(1);'
        ]
      }
  ]);
});

test("uses the standard-additions backend script when requested", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    }
  });

  await notifier.notify({
    title: "Title",
    message: "Message",
    backend: "standard"
  });

  assert.deepEqual(commands, [
    {
      command: "osascript",
      args: [
        "-l",
        "JavaScript",
        "-e",
        'const app = Application.currentApplication(); app.includeStandardAdditions = true; app.displayNotification("Message", { withTitle: "Title" });'
      ]
    }
  ]);
});

test("uses the alert backend script when requested", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    }
  });

  await notifier.notify({
    title: "Title",
    message: "Message",
    backend: "alert"
  });

  assert.deepEqual(commands, [
    {
      command: "osascript",
      args: [
        "-l",
        "JavaScript",
        "-e",
        'const app = Application.currentApplication(); app.includeStandardAdditions = true; app.displayAlert("Title", { message: "Message" });'
      ]
    }
  ]);
});

test("uses the alert backend with message only", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    }
  });

  await notifier.notify({
    message: "Message only",
    backend: "alert"
  });

  assert.deepEqual(commands, [
    {
      command: "osascript",
      args: [
        "-l",
        "JavaScript",
        "-e",
        'const app = Application.currentApplication(); app.includeStandardAdditions = true; app.displayAlert("Message only");'
      ]
    }
  ]);
});

test("plays sound only when no alert text is provided", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    },
    startProcess: (command, args) => {
      commands.push({ command, args });
    }
  });

  await notifier.notify({
    sound: "/tmp/ping.aiff"
  });

  assert.deepEqual(commands, [
    {
      command: "afplay",
      args: ["/tmp/ping.aiff"]
    }
  ]);
});

test("plays the default sound when no input is provided", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    },
    startProcess: (command, args) => {
      commands.push({ command, args });
    },
    resolveSoundPath: (sound) => `/System/Library/Sounds/${sound}.aiff`
  });

  await notifier.notify({});

  assert.deepEqual(commands, [
    {
      command: "afplay",
      args: ["/System/Library/Sounds/Glass.aiff"]
    }
  ]);
});

test("writes debug output for executed commands", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const stderr: string[] = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    },
    startProcess: (command, args) => {
      commands.push({ command, args });
    },
    stderr: { write: (text: string) => stderr.push(text) }
  });

  await notifier.notify({
    title: "Title",
    message: "Message",
    sound: "Glass",
    debug: true
  });

  assert.equal(commands.length, 2);
  assert.match(stderr.join(""), /\[debug\] backend: alert/);
  assert.match(stderr.join(""), /\[debug\] exec: afplay/);
  assert.match(stderr.join(""), /\[debug\] exec: osascript/);
});

test("plays custom sound files after showing notification", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    },
    startProcess: (command, args) => {
      commands.push({ command, args });
    }
  });

  await notifier.notify({
    title: "Title",
    message: "Message",
    sound: "/tmp/ping.aiff"
  });

  assert.deepEqual(commands, [
    {
      command: "afplay",
      args: ["/tmp/ping.aiff"]
    },
    {
      command: "osascript",
      args: [
        "-l",
        "JavaScript",
        "-e",
        'const app = Application.currentApplication(); app.includeStandardAdditions = true; delay(0.15); app.displayAlert("Title", { message: "Message" });'
      ]
    }
  ]);
});

test("escapes title and message in the generated JXA script", async () => {
  const commands: Array<{ command: string; args: string[] }> = [];
  const notifier = new MacOsNotifier({
    execFile: async (command, args) => {
      commands.push({ command, args });
    }
  });

  await notifier.notify({
    title: 'He said "Hi"',
    message: "Line \\ path"
  });

  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0], {
    command: "osascript",
    args: [
      "-l",
      "JavaScript",
      "-e",
      'const app = Application.currentApplication(); app.includeStandardAdditions = true; app.displayAlert("He said \\"Hi\\"", { message: "Line \\\\ path" });'
    ]
  });
});
