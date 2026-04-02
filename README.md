# Spaces

Workspace Configuration manager for Windows

## ⚠️ Windows Limitation

**Window detection does not work for packaged/MSIX apps on Windows 10/11** — this includes Notepad, Calculator, Settings, Photos, and most other modern Windows apps installed from the Microsoft Store.

These apps launch via a broker process, so when Spaces spawns `notepad.exe`, Windows re-launches it as a child process under a different PID. Spaces cannot detect the correct window handle (HWND) for these apps.

**Workaround**: Use win32 (desktop) applications instead — apps installed via traditional `.exe` installers rather than the Microsoft Store.

## Requirements

- **Windows 10 or Windows 11** (64-bit)
- **Windows Subsystem for Linux (WSL)** — required at runtime for workspace scripting features

## Features

- **Multi-monitor workspace management** — organize apps across multiple monitors
- **Window placement persistence** — windows remember their position and size
- **Application launchers** — launch apps with custom arguments and window placements
- **Script/Terminal workspaces** — run PowerShell, CMD, or Windows Terminal commands
- **URL workspace items** — open URLs in your default browser
- **Human-readable storage** — spaces are saved in YAML format for easy editing and version control

## Configuration Storage

Spaces are stored in a YAML file at:
```
%APPDATA%\com.spaces.app\spaces.yaml
```

You can manually edit this file to:
- Add or modify workspace definitions
- Bulk-import/export configurations
- Track changes in version control

### YAML Structure

```yaml
spaces:
  - id: "<uuid>"
    name: "Workspace Name"
    description: "What this space is for"
    color: "blue|purple|green|orange|red|pink"
    items:
      - type: "application"       # Launch an app
        name: "App Name"
        path: "C:\\path\\to\\app.exe"
        args: ["--flag"]
        placement:                # Optional window position
          monitor_index: 0        # Which monitor (0, 1, ...)
          x: 0.0                  # 0-1 fraction of monitor width
          y: 0.0                  # 0-1 fraction of monitor height
          w: 0.5                  # Width as fraction of monitor
          h: 1.0                  # Height as fraction of monitor
          monitor_x: 0            # Monitor's screen position (pixels)
          monitor_y: 0
          monitor_width: 2560     # Monitor resolution
          monitor_height: 1440

      - type: "terminal"          # Run terminal commands
        name: "Terminal"
        shell: "wt|powershell|cmd"
        cwd: "C:\\working\\directory"
        commands: ["npm run dev"]

      - type: "url"               # Open URL in browser
        name: "Documentation"
        url: "https://example.com"

      - type: "script"            # Run a script
        name: "Build Script"
        shell: "powershell|cmd"
        cwd: "C:\\project"
        content: "npm run build"
```

## Development

```bash
# Install dependencies
deno install

# Run type checks
deno task typecheck

# Build frontend
deno task build

# Run unit tests
npm run test

# Run Tauri dev server
deno task tauri dev
```

> **Note**: On first run, Windows Defender or your antivirus may flag the executable. This is normal for unsigned Tauri applications.
