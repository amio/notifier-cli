# notifier-cli

Minimal system notification CLI.

The current macOS adapter defaults to `displayAlert(...)` via `osascript` JXA, and plays sounds through `afplay`. When both alert text and sound are present, sound starts first and the alert is delayed slightly so it lands with or just after the sound.

## Usage

```bash
npm i -g notifier-cli
```

```bash
notify -h # show help
notify # play default sound
notify --title "Build finished" --message "All tests passed"
notify -t "Build finished"
notify -m "Message only"
notify --title "Ping" --message "Check this" --sound Glass
notify --sound ./sound.aiff
```

## Options

- `--title` alert title; if `--message` is absent this becomes the main alert text
- `--message` alert body; if `--title` is absent this becomes the main alert text
- `--sound` built-in sound name or path to a sound file
- `--backend` macOS backend selection: `alert`, `legacy`, or `standard`
- `--debug` print debug information and executed commands to stderr
- `--help` print usage and all built-in sounds
- `-t` short form of `--title`
- `-m` short form of `--message`
- `-s` short form of `--sound`
- `-b` short form of `--backend`
- `-d` short form of `--debug`
- `-h` short form of `--help`

Behavior:

- If both `title` and `message` are omitted but `sound` is provided, only the sound is played.
- If `title`, `message`, and `sound` are all omitted, the default sound `Glass` is played.
- If sound and alert text are both provided, sound starts first and the alert is shown shortly after.

## Development

```bash
npm test
```
