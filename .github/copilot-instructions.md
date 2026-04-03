# Copilot Instructions

## Project Overview

**Spaces** is a Windows desktop workspace manager built with Tauri 2 (Rust backend + React frontend). It lets users configure and launch multi-monitor application workspaces, with window placement persistence stored in `%APPDATA%\com.spaces.app\spaces.yaml`.

## Commands

```bash
deno task dev          # Start Vite dev server
deno task tauri dev    # Run full Tauri app (dev mode)
deno task build        # Build frontend (tsc + vite build)
deno task typecheck    # TypeScript type-check only
npm run test           # Run Vitest in watch mode
npm run test:run       # Run all tests once
```

**Single test:**
```bash
npx vitest run src/path/to/file.test.tsx
```

## Architecture

Tauri app with two distinct layers:

- **`src/`** — React 19 + TypeScript frontend running in the Tauri webview. All state lives in `App.tsx` using `useState`/`useEffect`. No Redux or Zustand.
- **`src-tauri/src/lib.rs`** — Rust backend exposing Tauri commands for file I/O (`spaces.yaml`), process launching, and Windows API calls.

Frontend calls backend exclusively via `invoke()` from `@tauri-apps/api/core`. Available commands: `get_spaces`, `save_space`, `delete_space`, `launch_space`, `get_groups`, `save_group`, `delete_group`, `launch_group`, `get_monitors`.

**Component layout:**
- `components/ui/` — Shadcn-style Radix UI primitives with Tailwind styling (treat as a library, rarely edit)
- `components/forms/` — Dialog-based forms (`SpaceForm`, `GroupForm`, `ItemForm`)
- `components/` — Feature components (`SpacesSidebar`, `SpaceDetail`, `GroupDetail`, `MonitorLayout`, etc.)
- `hooks/` — Custom hooks (e.g., `useMonitors` fetches from Tauri with jsdom fallback)
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `types.ts` — All shared TypeScript types and constants

## Key Conventions

### TypeScript
- Strict mode is on. All code must pass `deno task typecheck`.
- `SpaceItem` is a **discriminated union** (`ApplicationItem | TerminalItem | UrlItem | ScriptItem`) — use the `type` field for exhaustive narrowing.
- Use `import type { ... }` for type-only imports.
- Path alias `@/` maps to `src/`.

### Styling
- Tailwind CSS 4 via Vite plugin. Always use `cn()` from `@/lib/utils` for conditional/merged class names.
- Dark mode is the default theme.

### Components
- Functional components only. No class components.
- PascalCase filenames for components (`SpaceDetail.tsx`), kebab-case for hooks (`use-monitors.ts`).
- Constants are `UPPER_SNAKE_CASE` (e.g., `ITEM_TYPE_LABELS`, `SPACE_COLORS`).

### Testing
- **Every frontend feature must have tests.** New components, hooks, and utilities are not complete without corresponding test files.
- Tests use **Vitest** + **@testing-library/react** + **jsdom**.
- Co-locate test files: `ComponentName.test.tsx` next to `ComponentName.tsx`.
- Global test setup/mocks are in `tests/setup.ts` — Tauri APIs are mocked there.
- Use factory functions (`makeSpace()`, `makeGroup()`) for test fixtures.
- Use `userEvent.setup()` for simulating user interactions.

```typescript
// Standard test structure
describe("ComponentName", () => {
  it("should do something", async () => {
    const user = userEvent.setup();
    const mockFn = vi.fn();
    render(<Component onAction={mockFn} />);
    await user.click(screen.getByRole("button", { name: /label/i }));
    expect(mockFn).toHaveBeenCalled();
  });
});
```

### Tauri / Windows
- This app targets **Windows only**. Packaged (MSIX/Store) apps cannot be detected by window handle — document this limitation if adding window management features.
- Window placement uses fractional coordinates (0.0–1.0) relative to monitor dimensions.
- The Rust backend uses the `windows` crate for Win32 API and `winvd` for virtual desktop support.

## YAML Config Format

Workspaces are stored at `%APPDATA%\com.spaces.app\spaces.json` (YAML content despite the `.json` extension). Groups use `groups.json` in the same directory. All field names are `camelCase` due to `#[serde(rename_all = "camelCase")]`. Optional fields (e.g., `placement`) are omitted when null.

```yaml
- id: 123e4567-e89b-12d3-a456-426614174000
  name: Dev Workspace
  description: Full-stack environment
  color: blue
  createdAt: 2024-01-15T10:30:00Z
  updatedAt: 2024-01-15T10:30:00Z
  isFavourite: true
  items:
    # Application item — launch an .exe with optional args and window placement
    - type: application
      id: app-001
      name: VS Code
      path: C:\Users\user\AppData\Local\Programs\Microsoft VS Code\Code.exe
      args:
        - C:\Projects\my-project
        - --new-window
      placement:
        monitorIndex: 0
        x: 0.0        # fractional position on monitor (0.0–1.0)
        y: 0.0
        w: 0.5
        h: 1.0
        monitorX: 0   # absolute pixel position of monitor
        monitorY: 0
        monitorWidth: 2560
        monitorHeight: 1440

    # Terminal item — run commands in a shell
    - type: terminal
      id: term-001
      name: Dev Terminal
      shell: wt        # wt | powershell | cmd
      cwd: C:\Projects\my-project
      commands:
        - npm run dev
      placement:
        monitorIndex: 0
        x: 0.5
        y: 0.0
        w: 0.5
        h: 1.0
        monitorX: 0
        monitorY: 0
        monitorWidth: 2560
        monitorHeight: 1440

    # URL item — open in default browser (no placement)
    - type: url
      id: url-001
      name: GitHub
      url: https://github.com/my-org/my-project

    # Script item — multi-line script written to a temp file and executed
    - type: script
      id: script-001
      name: Build
      shell: powershell  # powershell | cmd
      cwd: C:\Projects\my-project
      content: |
        npm run build
        Write-Host "Done"
```

**Terminal shell joining:** PowerShell/wt commands are joined with `"; "`, cmd commands with `" & "`. Scripts are written to `%TEMP%\<uuid>.ps1` or `.bat` and executed.

## Rust Conventions

All backend code lives in `src-tauri/src/lib.rs`.

### Tauri Commands
- Decorated with `#[tauri::command]`, registered in `invoke_handler`.
- Named in `snake_case` verb-noun style: `get_spaces`, `save_space`, `launch_space`.
- Always return `Result<T, String>` — errors are `.to_string()` or `format!(...)`.

```rust
#[tauri::command]
fn save_space(state: State<SpacesState>, space: Space) -> Result<(), String> {
    let mut spaces = state.spaces.lock().unwrap();
    // upsert logic...
    state.persist(&spaces)
}
```

### Error Handling
- Convert all errors to `String` with `.map_err(|e| e.to_string())?` or `format!("context: {e}")`.
- Use `.ok_or_else(|| format!("Item '{}' not found", id))?` for `Option` → `Result`.

### Data Models
- All structs derive `Serialize, Deserialize, Clone, Debug`.
- Use `#[serde(rename_all = "camelCase")]` on every struct (matches frontend TypeScript types).
- Use `#[serde(skip_serializing_if = "Option::is_none")]` for optional fields.
- `SpaceItem` is a tagged enum: `#[serde(tag = "type", rename_all = "camelCase")]` with `#[serde(rename = "application")]` etc. on variants.

### State & Persistence
- `SpacesState` holds `Mutex<Vec<Space>>` and `Mutex<Vec<SpaceGroup>>` for thread-safe access.
- Load on startup with graceful fallback: `serde_yaml::from_str(...).unwrap_or_default()`.
- Persist immediately after every mutation via `state.persist(&spaces)?`.

### Windows-Specific
- Win32 code is guarded with `#[cfg(target_os = "windows")]`.
- Window placement uses a polling loop (up to 200 × 50ms) waiting for the HWND to appear after process spawn.
- Virtual desktops managed via `winvd` crate.
- Multi-line scripts use temp files: `%TEMP%\<uuid>.ps1` or `.bat`.
