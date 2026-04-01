use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use uuid::Uuid;

// ──────────────────────────────────────────────────────────────────────────────
// Data models (must mirror src/types.ts)
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WindowPlacement {
    pub monitor_index: usize,
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SpaceItem {
    #[serde(rename = "application")]
    Application {
        id: String,
        name: String,
        path: String,
        args: Vec<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        placement: Option<WindowPlacement>,
    },
    #[serde(rename = "terminal")]
    Terminal {
        id: String,
        name: String,
        cwd: String,
        commands: Vec<String>,
        shell: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        placement: Option<WindowPlacement>,
    },
    #[serde(rename = "url")]
    Url {
        id: String,
        name: String,
        url: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        placement: Option<WindowPlacement>,
    },
    #[serde(rename = "script")]
    Script {
        id: String,
        name: String,
        content: String,
        shell: String,
        cwd: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        placement: Option<WindowPlacement>,
    },
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Space {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub items: Vec<SpaceItem>,
    pub created_at: String,
    pub updated_at: String,
}

// ──────────────────────────────────────────────────────────────────────────────
// App state – in-memory spaces protected by a Mutex, plus the path to persist
// ──────────────────────────────────────────────────────────────────────────────

pub struct SpacesState {
    pub spaces: Mutex<Vec<Space>>,
    pub data_file: PathBuf,
}

impl SpacesState {
    pub fn load(data_file: PathBuf) -> Self {
        let spaces = if data_file.exists() {
            fs::read_to_string(&data_file)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            Vec::new()
        };
        SpacesState {
            spaces: Mutex::new(spaces),
            data_file,
        }
    }

    fn persist(&self, spaces: &[Space]) -> Result<(), String> {
        if let Some(parent) = self.data_file.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(spaces).map_err(|e| e.to_string())?;
        fs::write(&self.data_file, json).map_err(|e| e.to_string())
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tauri commands
// ──────────────────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_spaces(state: State<SpacesState>) -> Vec<Space> {
    state.spaces.lock().unwrap().clone()
}

#[tauri::command]
fn save_space(state: State<SpacesState>, space: Space) -> Result<Space, String> {
    let mut spaces = state.spaces.lock().unwrap();
    let now = Utc::now().to_rfc3339();

    let idx = spaces.iter().position(|s| s.id == space.id);
    let saved = if let Some(i) = idx {
        // Update existing
        let mut updated = space;
        updated.updated_at = now;
        spaces[i] = updated.clone();
        updated
    } else {
        // Create new
        let mut new_space = space;
        new_space.id = Uuid::new_v4().to_string();
        new_space.created_at = now.clone();
        new_space.updated_at = now;
        spaces.push(new_space.clone());
        new_space
    };

    state.persist(&spaces)?;
    Ok(saved)
}

#[tauri::command]
fn delete_space(state: State<SpacesState>, id: String) -> Result<(), String> {
    let mut spaces = state.spaces.lock().unwrap();
    let before = spaces.len();
    spaces.retain(|s| s.id != id);
    if spaces.len() == before {
        return Err(format!("Space '{}' not found", id));
    }
    state.persist(&spaces)
}

#[tauri::command]
fn launch_space(state: State<SpacesState>, id: String) -> Result<(), String> {
    let spaces = state.spaces.lock().unwrap();
    let space = spaces
        .iter()
        .find(|s| s.id == id)
        .ok_or_else(|| format!("Space '{}' not found", id))?
        .clone();
    drop(spaces); // release lock before spawning processes

    for item in &space.items {
        launch_item(item)?;
    }
    Ok(())
}

fn launch_item(item: &SpaceItem) -> Result<(), String> {
    use std::process::Command;

    match item {
        SpaceItem::Application { path, args, placement, .. } => {
            let child = Command::new(path)
                .args(args)
                .spawn()
                .map_err(|e| format!("Failed to launch application: {e}"))?;
            #[cfg(target_os = "windows")]
            if let Some(p) = placement {
                win32::place_window_async(child.id(), p.monitor_index, p.x, p.y, p.w, p.h);
            }
            drop(child);
        }

        SpaceItem::Url { url, .. } => {
            Command::new("cmd")
                .args(["/c", "start", "", url])
                .spawn()
                .map_err(|e| format!("Failed to open URL: {e}"))?;
        }

        SpaceItem::Terminal { name, cwd, commands, shell, placement, .. } => {
            let cmd_str = commands.join("; ");
            let child = match shell.as_str() {
                "wt" => {
                    let mut cmd = Command::new("wt");
                    cmd.arg("new-tab").args(["--title", name]);
                    if !cwd.is_empty() {
                        cmd.args(["-d", cwd]);
                    }
                    if !commands.is_empty() {
                        cmd.args(["powershell", "-NoExit", "-Command", &cmd_str]);
                    }
                    cmd.spawn()
                        .map_err(|e| format!("Failed to open Windows Terminal: {e}"))?
                }
                "powershell" => {
                    let mut cmd = Command::new("powershell");
                    if !cwd.is_empty() {
                        cmd.args(["-WorkingDirectory", cwd]);
                    }
                    if !commands.is_empty() {
                        cmd.args(["-NoExit", "-Command", &cmd_str]);
                    }
                    cmd.spawn()
                        .map_err(|e| format!("Failed to open PowerShell: {e}"))?
                }
                _ => {
                    let mut cmd = Command::new("cmd");
                    if !commands.is_empty() {
                        let joined = commands.join(" & ");
                        cmd.args(["/k", &joined]);
                    }
                    if !cwd.is_empty() {
                        cmd.current_dir(cwd);
                    }
                    cmd.spawn()
                        .map_err(|e| format!("Failed to open CMD: {e}"))?
                }
            };
            #[cfg(target_os = "windows")]
            if let Some(p) = placement {
                win32::place_window_async(child.id(), p.monitor_index, p.x, p.y, p.w, p.h);
            }
            drop(child);
        }

        SpaceItem::Script { content, shell, cwd, placement, .. } => {
            use std::io::Write;
            let (ext, interpreter_args): (&str, Vec<&str>) = match shell.as_str() {
                "cmd" => ("bat", vec!["/c"]),
                _ => ("ps1", vec!["-ExecutionPolicy", "Bypass", "-File"]),
            };
            let tmp_path =
                std::env::temp_dir().join(format!("spaces_{}.{}", Uuid::new_v4(), ext));
            let mut f = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
            f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
            drop(f);

            let runner = if shell == "cmd" { "cmd" } else { "powershell" };
            let mut cmd = Command::new(runner);
            cmd.args(&interpreter_args);
            cmd.arg(tmp_path.to_str().unwrap_or_default());
            if !cwd.is_empty() {
                cmd.current_dir(cwd);
            }
            let child = cmd.spawn().map_err(|e| format!("Failed to run script: {e}"))?;
            #[cfg(target_os = "windows")]
            if let Some(p) = placement {
                win32::place_window_async(child.id(), p.monitor_index, p.x, p.y, p.w, p.h);
            }
            drop(child);
        }
    }

    Ok(())
}

// ──────────────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_file = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir")
                .join("spaces.json");
            app.manage(SpacesState::load(data_file));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_spaces,
            save_space,
            delete_space,
            launch_space,
            get_monitors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ──────────────────────────────────────────────────────────────────────────────
// Monitor info
// ──────────────────────────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub scale_factor: f64,
}

#[tauri::command]
fn get_monitors(window: tauri::WebviewWindow) -> Vec<MonitorInfo> {
    window
        .available_monitors()
        .unwrap_or_else(|_| vec![])
        .into_iter()
        .enumerate()
        .map(|(i, m)| MonitorInfo {
            index: i,
            name: m
                .name()
                .cloned()
                .unwrap_or_else(|| format!("Display {}", i + 1)),
            width: m.size().width,
            height: m.size().height,
            x: m.position().x,
            y: m.position().y,
            scale_factor: m.scale_factor(),
        })
        .collect()
}

// ──────────────────────────────────────────────────────────────────────────────
// Win32 window placement helpers (Windows only)
// ──────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod win32 {
    use windows::Win32::{
        Foundation::{BOOL, HWND, LPARAM, RECT},
        Graphics::Gdi::{EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFO},
        UI::WindowsAndMessaging::{
            EnumWindows, GetWindowThreadProcessId, IsWindowVisible, SetWindowPos,
            SWP_NOACTIVATE, SWP_NOZORDER,
        },
    };

    // ── Monitor enumeration ───────────────────────────────────────────────────

    struct MonitorCollector(Vec<RECT>);

    unsafe extern "system" fn enum_monitor_proc(
        hmonitor: HMONITOR,
        _: HDC,
        _: *mut RECT,
        lparam: LPARAM,
    ) -> BOOL {
        let collector = &mut *(lparam.0 as *mut MonitorCollector);
        let mut info: MONITORINFO = std::mem::zeroed();
        info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
        if GetMonitorInfoW(hmonitor, &mut info).as_bool() {
            collector.0.push(info.rcMonitor);
        }
        BOOL(1)
    }

    fn get_monitor_rects() -> Vec<RECT> {
        let mut collector = MonitorCollector(Vec::new());
        unsafe {
            let _ = EnumDisplayMonitors(
                HDC::default(),
                None,
                Some(enum_monitor_proc),
                LPARAM(&mut collector as *mut MonitorCollector as isize),
            );
        }
        collector.0
    }

    // ── Window handle lookup by PID ───────────────────────────────────────────

    struct FindState {
        target_pid: u32,
        hwnd_raw: isize,
    }

    unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let state = &mut *(lparam.0 as *mut FindState);
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if pid == state.target_pid && IsWindowVisible(hwnd).as_bool() {
            state.hwnd_raw = hwnd.0 as isize;
            return BOOL(0); // stop enumeration
        }
        BOOL(1)
    }

    fn find_hwnd_raw(pid: u32) -> Option<isize> {
        let mut state = FindState { target_pid: pid, hwnd_raw: 0 };
        unsafe {
            let _ = EnumWindows(
                Some(enum_windows_proc),
                LPARAM(&mut state as *mut FindState as isize),
            );
        }
        if state.hwnd_raw != 0 { Some(state.hwnd_raw) } else { None }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /// Spawns a background thread that polls for the process window (up to 5 s)
    /// and then moves/resizes it using `SetWindowPos`.
    pub fn place_window_async(
        pid: u32,
        monitor_index: usize,
        x: f64,
        y: f64,
        w: f64,
        h: f64,
    ) {
        let monitor_rects = get_monitor_rects();
        let Some(rect) = monitor_rects.get(monitor_index).copied() else {
            return;
        };
        let mw = (rect.right - rect.left) as f64;
        let mh = (rect.bottom - rect.top) as f64;
        let px: i32 = rect.left + (x * mw) as i32;
        let py: i32 = rect.top + (y * mh) as i32;
        let pw: i32 = (w * mw) as i32;
        let ph: i32 = (h * mh) as i32;

        std::thread::spawn(move || {
            for _ in 0..50 {
                std::thread::sleep(std::time::Duration::from_millis(100));
                if let Some(raw) = find_hwnd_raw(pid) {
                    unsafe {
                        let hwnd = HWND(raw as _);
                        let _ = SetWindowPos(
                            hwnd,
                            None,
                            px,
                            py,
                            pw,
                            ph,
                            SWP_NOACTIVATE | SWP_NOZORDER,
                        );
                    }
                    break;
                }
            }
        });
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper – resolve AppHandle path (kept for future use)
// ──────────────────────────────────────────────────────────────────────────────
#[allow(dead_code)]
fn app_data_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("failed to resolve app data dir")
}

