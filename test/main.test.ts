import test from "node:test";
import assert from "node:assert/strict";

import { main } from "../src/main.ts";

test("returns usage error when title is missing", async () => {
  const logs: string[] = [];
  const calls: unknown[] = [];
  const code = await main(["--message", "body"], {
    platform: "darwin",
    stderr: { write: (text: string) => logs.push(text) },
    createNotifier: () => ({
      notify: async (input: unknown) => {
        calls.push(input);
      }
    })
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [{ message: "body" }]);
  assert.equal(logs.length, 0);
});

test("returns usage error when message is missing", async () => {
  const logs: string[] = [];
  const calls: unknown[] = [];
  const code = await main(["--title", "hello"], {
    platform: "darwin",
    stderr: { write: (text: string) => logs.push(text) },
    createNotifier: () => ({
      notify: async (input: unknown) => {
        calls.push(input);
      }
    })
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [{ title: "hello" }]);
  assert.equal(logs.length, 0);
});

test("dispatches to macOS notifier with parsed arguments", async () => {
  const calls: unknown[] = [];
  const code = await main(
    ["--title", "Hello", "--message", "World", "--sound", "Glass"],
    {
      platform: "darwin",
      createNotifier: (platform) => {
        calls.push(platform);
        return {
          notify: async (input: unknown) => {
            calls.push(input);
          }
        };
      }
    }
  );

  assert.equal(code, 0);
  assert.deepEqual(calls, [
    "darwin",
    { title: "Hello", message: "World", sound: "Glass" }
  ]);
});

test("supports short flags", async () => {
  const calls: unknown[] = [];
  const code = await main(["-t", "Hello", "-m", "World", "-s", "Glass"], {
    platform: "darwin",
    createNotifier: (platform) => {
      calls.push(platform);
      return {
        notify: async (input: unknown) => {
          calls.push(input);
        }
      };
    }
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [
    "darwin",
    { title: "Hello", message: "World", sound: "Glass" }
  ]);
});

test("passes backend and debug flags to the notifier", async () => {
  const calls: unknown[] = [];
  const logs: string[] = [];
  const code = await main(
    ["--title", "Hello", "--message", "World", "--backend", "legacy", "--debug"],
    {
      platform: "darwin",
      stderr: { write: (text: string) => logs.push(text) },
      createNotifier: (platform) => {
        calls.push(platform);
        return {
          notify: async (input: unknown) => {
            calls.push(input);
          }
        };
      }
    }
  );

  assert.equal(code, 0);
  assert.deepEqual(calls, [
    "darwin",
    {
      title: "Hello",
      message: "World",
      backend: "legacy",
      debug: true
    }
  ]);
  assert.equal(logs.length, 0);
});

test("returns error for unsupported platforms", async () => {
  const logs: string[] = [];
  const code = await main(["--title", "Hello", "--message", "World"], {
    platform: "linux",
    stderr: { write: (text: string) => logs.push(text) }
  });

  assert.equal(code, 1);
  assert.match(logs.join(""), /Unsupported platform: linux/);
});

test("returns usage error for unknown options", async () => {
  const logs: string[] = [];
  const code = await main(
    ["--title", "Hello", "--message", "World", "--wat", "nope"],
    {
      stderr: { write: (text: string) => logs.push(text) }
    }
  );

  assert.equal(code, 1);
  assert.match(logs.join(""), /Unknown option '--wat'/);
  assert.match(logs.join(""), /Usage: notifier-cli/);
});

test("prints help and available sound values with -h", async () => {
  const stdout: string[] = [];
  const code = await main(["-h"], {
    stdout: { write: (text: string) => stdout.push(text) }
  });

  assert.equal(code, 0);
  assert.match(stdout.join(""), /Usage: notifier-cli/);
  assert.match(stdout.join(""), /Built-in sounds:/);
  assert.match(stdout.join(""), /\bGlass\b/);
  assert.match(stdout.join(""), /\bSosumi\b/);
});

test("allows sound-only invocations", async () => {
  const calls: unknown[] = [];
  const code = await main(["-s", "Glass"], {
    platform: "darwin",
    createNotifier: () => ({
      notify: async (input: unknown) => {
        calls.push(input);
      }
    })
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [{ sound: "Glass" }]);
});

test("plays the default sound when no flags are provided", async () => {
  const calls: unknown[] = [];
  const code = await main([], {
    platform: "darwin",
    createNotifier: () => ({
      notify: async (input: unknown) => {
        calls.push(input);
      }
    })
  });

  assert.equal(code, 0);
  assert.deepEqual(calls, [{ sound: "Glass" }]);
});

test("returns notifier execution errors", async () => {
  const logs: string[] = [];
  const code = await main(["--title", "Hello", "--message", "World"], {
    platform: "darwin",
    stderr: { write: (text: string) => logs.push(text) },
    createNotifier: () => ({
      notify: async () => {
        throw new Error("osascript failed");
      }
    })
  });

  assert.equal(code, 1);
  assert.match(logs.join(""), /osascript failed/);
});
