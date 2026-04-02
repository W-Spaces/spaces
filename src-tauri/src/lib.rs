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
    /// Absolute physical-pixel left edge of the target monitor
    pub monitor_x: i32,
    /// Absolute physical-pixel top edge of the target monitor
    pub monitor_y: i32,
    /// Physical-pixel width of the target monitor
    pub monitor_width: u32,
    /// Physical-pixel height of the target monitor
    pub monitor_height: u32,
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
                .and_then(|s| serde_yaml::from_str(&s).ok())
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
        let yaml_content = serde_yaml::to_string(spaces).map_err(|e| e.to_string())?;
        fs::write(&self.data_file, yaml_content).map_err(|e| e.to_string())
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

    eprintln!(
        "[launch_space] launching space '{}' with {} items",
        space.name,
        space.items.len()
    );
    for item in &space.items {
        let (item_name, placement) = match item {
            SpaceItem::Application {
                name, placement, ..
            } => (name.as_str(), placement.as_ref()),
            SpaceItem::Terminal {
                name, placement, ..
            } => (name.as_str(), placement.as_ref()),
            SpaceItem::Url { name, .. } => (name.as_str(), None),
            SpaceItem::Script {
                name, placement, ..
            } => (name.as_str(), placement.as_ref()),
        };
        if let Some(p) = placement {
            eprintln!(
                "  item '{}': placement monitorIndex={} monitorX={} monitorY={} monitorW={} monitorH={} x={:.3} y={:.3} w={:.3} h={:.3}",
                item_name, p.monitor_index, p.monitor_x, p.monitor_y, p.monitor_width, p.monitor_height, p.x, p.y, p.w, p.h
            );
        } else {
            eprintln!("  item '{}': no placement", item_name);
        }
    }

    #[cfg(target_os = "windows")]
    let desktop_id = win32::create_virtual_desktop();

    for item in &space.items {
        #[cfg(target_os = "windows")]
        launch_item_with_desktop(item, desktop_id)?;
        #[cfg(not(target_os = "windows"))]
        launch_item(item)?;
    }
    Ok(())
}

#[allow(dead_code)]
fn launch_item(item: &SpaceItem) -> Result<(), String> {
    use std::process::Command;

    match item {
        SpaceItem::Application {
            path,
            args,
            placement,
            ..
        } => {
            let child = Command::new(path)
                .args(args)
                .spawn()
                .map_err(|e| format!("Failed to launch application: {e}"))?;
            #[cfg(target_os = "windows")]
            if let Some(p) = placement {
                win32::place_window_async(
                    child.id(),
                    p.monitor_x,
                    p.monitor_y,
                    p.monitor_width,
                    p.monitor_height,
                    p.x,
                    p.y,
                    p.w,
                    p.h,
                );
            }
            drop(child);
        }

        SpaceItem::Url { url, .. } => {
            Command::new("cmd")
                .args(["/c", "start", "", url])
                .spawn()
                .map_err(|e| format!("Failed to open URL: {e}"))?;
        }

        SpaceItem::Terminal {
            name,
            cwd,
            commands,
            shell,
            placement,
            ..
        } => {
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
                win32::place_window_async(
                    child.id(),
                    p.monitor_x,
                    p.monitor_y,
                    p.monitor_width,
                    p.monitor_height,
                    p.x,
                    p.y,
                    p.w,
                    p.h,
                );
            }
            drop(child);
        }

        SpaceItem::Script {
            content,
            shell,
            cwd,
            placement,
            ..
        } => {
            use std::io::Write;
            let (ext, interpreter_args): (&str, Vec<&str>) = match shell.as_str() {
                "cmd" => ("bat", vec!["/c"]),
                _ => ("ps1", vec!["-ExecutionPolicy", "Bypass", "-File"]),
            };
            let tmp_path = std::env::temp_dir().join(format!("spaces_{}.{}", Uuid::new_v4(), ext));
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
            let child = cmd
                .spawn()
                .map_err(|e| format!("Failed to run script: {e}"))?;
            #[cfg(target_os = "windows")]
            if let Some(p) = placement {
                win32::place_window_async(
                    child.id(),
                    p.monitor_x,
                    p.monitor_y,
                    p.monitor_width,
                    p.monitor_height,
                    p.x,
                    p.y,
                    p.w,
                    p.h,
                );
            }
            drop(child);
        }
    }

    Ok(())
}

/// Like launch_item but also moves newly-spawned windows onto the given virtual desktop.
#[cfg(target_os = "windows")]
fn launch_item_with_desktop(item: &SpaceItem, desktop_id: i64) -> Result<(), String> {
    use std::process::Command;

    match item {
        SpaceItem::Application {
            path,
            args,
            placement,
            ..
        } => {
            let child = Command::new(path)
                .args(args)
                .spawn()
                .map_err(|e| format!("Failed to launch application: {e}"))?;
            let pid = child.id();
            drop(child);

            let placement = placement.clone();
            std::thread::spawn(move || {
                win32::move_hwnd_to_desktop(pid, desktop_id);
                if let Some(p) = placement {
                    win32::place_window_async(
                        pid,
                        p.monitor_x,
                        p.monitor_y,
                        p.monitor_width,
                        p.monitor_height,
                        p.x,
                        p.y,
                        p.w,
                        p.h,
                    );
                }
            });
        }

        SpaceItem::Url { url, .. } => {
            Command::new("cmd")
                .args(["/c", "start", "", url])
                .spawn()
                .map_err(|e| format!("Failed to open URL: {e}"))?;
        }

        SpaceItem::Terminal {
            name,
            cwd,
            commands,
            shell,
            placement,
            ..
        } => {
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
                        cmd.args(["/k", &commands.join(" & ")]);
                    }
                    if !cwd.is_empty() {
                        cmd.current_dir(cwd);
                    }
                    cmd.spawn()
                        .map_err(|e| format!("Failed to open CMD: {e}"))?
                }
            };
            let pid = child.id();
            drop(child);

            let placement = placement.clone();
            std::thread::spawn(move || {
                win32::move_hwnd_to_desktop(pid, desktop_id);
                if let Some(p) = placement {
                    win32::place_window_async(
                        pid,
                        p.monitor_x,
                        p.monitor_y,
                        p.monitor_width,
                        p.monitor_height,
                        p.x,
                        p.y,
                        p.w,
                        p.h,
                    );
                }
            });
        }

        SpaceItem::Script {
            content,
            shell,
            cwd,
            placement,
            ..
        } => {
            use std::io::Write;
            let (ext, interpreter_args) = match shell.as_str() {
                "cmd" => ("bat", vec!["/c"]),
                _ => ("ps1", vec!["-ExecutionPolicy", "Bypass", "-File"]),
            };
            let tmp_path = std::env::temp_dir().join(format!("spaces_{}.{}", Uuid::new_v4(), ext));
            let mut f = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
            f.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
            drop(f);

            let runner = if shell == "cmd" { "cmd" } else { "powershell" };
            let mut cmd = Command::new(runner);
            cmd.args(&interpreter_args)
                .arg(tmp_path.to_str().unwrap_or_default());
            if !cwd.is_empty() {
                cmd.current_dir(cwd);
            }
            let child = cmd
                .spawn()
                .map_err(|e| format!("Failed to run script: {e}"))?;
            let pid = child.id();
            drop(child);

            let placement = placement.clone();
            std::thread::spawn(move || {
                win32::move_hwnd_to_desktop(pid, desktop_id);
                if let Some(p) = placement {
                    win32::place_window_async(
                        pid,
                        p.monitor_x,
                        p.monitor_y,
                        p.monitor_width,
                        p.monitor_height,
                        p.x,
                        p.y,
                        p.w,
                        p.h,
                    );
                }
            });
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
    let list = window
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
        .collect::<Vec<_>>();
    eprintln!("[get_monitors] reporting {} monitors:", list.len());
    for m in &list {
        eprintln!(
            "  [{}] {} | pos=({},{}) | size={}x{} | scale={}",
            m.index, m.name, m.x, m.y, m.width, m.height, m.scale_factor
        );
    }
    list
}

// ──────────────────────────────────────────────────────────────────────────────
// Win32 window placement helpers (Windows only)
// ──────────────────────────────────────────────────────────────────────────────

#[cfg(target_os = "windows")]
mod win32 {
    use windows::Win32::{
        Foundation::{CloseHandle, BOOL, HWND, LPARAM, RECT},
        Graphics::Gdi::{EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFO},
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32First, Process32Next, PROCESSENTRY32,
            TH32CS_SNAPPROCESS,
        },
        UI::WindowsAndMessaging::{
            EnumWindows, GetWindowRect, GetWindowThreadProcessId, IsIconic, IsWindowVisible,
            IsZoomed, SetWindowPos, ShowWindow, SWP_NOACTIVATE, SWP_NOZORDER, SW_RESTORE,
        },
    };

    #[allow(dead_code)]
    struct MonitorCollector(Vec<RECT>);

    #[allow(dead_code)]
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

    #[allow(dead_code)]
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

    /// Returns a set containing `root_pid` and all of its descendant PIDs.
    /// Uses a snapshot so it captures child processes spawned after the parent.
    fn get_descendant_pids(root_pid: u32) -> std::collections::HashSet<u32> {
        let mut result = std::collections::HashSet::new();
        result.insert(root_pid);
        unsafe {
            let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
                return result;
            };
            let mut entry: PROCESSENTRY32 = std::mem::zeroed();
            entry.dwSize = std::mem::size_of::<PROCESSENTRY32>() as u32;
            let mut rows: Vec<(u32, u32)> = Vec::new(); // (pid, parent_pid)
            if Process32First(snapshot, &mut entry).is_ok() {
                loop {
                    rows.push((entry.th32ProcessID, entry.th32ParentProcessID));
                    if Process32Next(snapshot, &mut entry).is_err() {
                        break;
                    }
                }
            }
            let _ = CloseHandle(snapshot);
            // Iteratively expand the set with children of already-known PIDs.
            let mut changed = true;
            while changed {
                changed = false;
                for (pid, parent) in &rows {
                    if result.contains(parent) && result.insert(*pid) {
                        changed = true;
                    }
                }
            }
        }
        result
    }

    struct FindState {
        related_pids: std::collections::HashSet<u32>,
        hwnd_raw: isize,
        found_pid: u32,
    }

    unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let state = &mut *(lparam.0 as *mut FindState);
        let mut pid: u32 = 0;
        GetWindowThreadProcessId(hwnd, Some(&mut pid));
        if state.related_pids.contains(&pid) && IsWindowVisible(hwnd).as_bool() {
            state.hwnd_raw = hwnd.0 as isize;
            state.found_pid = pid;
            return BOOL(0); // stop enumeration
        }
        BOOL(1)
    }

    /// Raw handle lookup — searches the process tree rooted at `pid`.
    pub fn find_hwnd_raw(pid: u32) -> Option<isize> {
        let related_pids = get_descendant_pids(pid);
        let mut state = FindState {
            related_pids,
            hwnd_raw: 0,
            found_pid: 0,
        };
        unsafe {
            let _ = EnumWindows(
                Some(enum_windows_proc),
                LPARAM(&mut state as *mut FindState as isize),
            );
        }
        if state.hwnd_raw != 0 {
            if state.found_pid != pid {
                eprintln!(
                    "[find_hwnd] pid={pid} — window owned by child pid={}",
                    state.found_pid
                );
            }
            Some(state.hwnd_raw)
        } else {
            None
        }
    }

    // ── Windows version detection ─────────────────────────────────────────────

    /// Detected Windows OS version (major, minor, build number).
    pub struct WindowsVersionInfo {
        pub major: u32,
        pub minor: u32,
        pub build: u32,
    }

    impl WindowsVersionInfo {
        /// Returns true when the build number identifies Windows 11 (≥ 22000).
        pub fn is_windows_11(&self) -> bool {
            self.major >= 10 && self.build >= 22000
        }

        /// Returns true when the build number identifies Windows 10 (< 22000).
        pub fn is_windows_10(&self) -> bool {
            self.major == 10 && self.build < 22000
        }

        /// Returns true for any Windows version that supports virtual desktops
        /// (Windows 10 and later).
        pub fn is_supported(&self) -> bool {
            self.major >= 10
        }

        /// Human-readable label for logging.
        pub fn label(&self) -> &'static str {
            if self.is_windows_11() {
                "Windows 11"
            } else if self.is_windows_10() {
                "Windows 10"
            } else {
                "Unknown/Unsupported"
            }
        }
    }

    /// Returns Windows version information obtained via `RtlGetVersion` from
    /// `ntdll.dll`.  This API is reliable and works even when
    /// `GetVersionExW` returns faked values due to compatibility shims.
    pub fn get_windows_version_info() -> WindowsVersionInfo {
        // Mirror of the OSVERSIONINFOEXW structure from the Windows SDK.
        #[repr(C)]
        struct OsVersionInfoExW {
            dw_os_version_info_size: u32,
            dw_major_version: u32,
            dw_minor_version: u32,
            dw_build_number: u32,
            dw_platform_id: u32,
            sz_csd_version: [u16; 128],
            dw_service_pack_major: u16,
            dw_service_pack_minor: u16,
            suite_mask: u16,
            product_type: u8,
            reserved: u8,
        }

        // RtlGetVersion is the authoritative version query from the NT kernel.
        // Unlike GetVersionExW it is not subject to application compatibility
        // shims that lie about the OS version to legacy apps.
        extern "system" {
            fn RtlGetVersion(version_information: *mut OsVersionInfoExW) -> i32;
        }

        let mut info = OsVersionInfoExW {
            dw_os_version_info_size: std::mem::size_of::<OsVersionInfoExW>() as u32,
            dw_major_version: 0,
            dw_minor_version: 0,
            dw_build_number: 0,
            dw_platform_id: 0,
            sz_csd_version: [0; 128],
            dw_service_pack_major: 0,
            dw_service_pack_minor: 0,
            suite_mask: 0,
            product_type: 0,
            reserved: 0,
        };

        // RtlGetVersion returns an NTSTATUS; 0 (STATUS_SUCCESS) means success.
        // Failure is practically impossible here but we handle it gracefully by
        // returning a zeroed struct so callers treat the version as unsupported.
        let status = unsafe { RtlGetVersion(&mut info) };
        if status != 0 {
            return WindowsVersionInfo {
                major: 0,
                minor: 0,
                build: 0,
            };
        }

        WindowsVersionInfo {
            major: info.dw_major_version,
            minor: info.dw_minor_version,
            build: info.dw_build_number,
        }
    }

    // ── Windows 10/11 virtual desktop via winvd (IVirtualDesktopManagerInternal) ──

    /// Creates a new Windows 10/11 virtual desktop (Task View desktop) and
    /// switches the display to it. Returns the 0-based desktop index on success,
    /// or -1 on failure.
    pub fn create_virtual_desktop() -> i64 {
        let ver = get_windows_version_info();
        eprintln!(
            "[create_virtual_desktop] Windows version: {}.{}.{} ({})",
            ver.major,
            ver.minor,
            ver.build,
            ver.label()
        );

        if !ver.is_supported() {
            eprintln!(
                "[create_virtual_desktop] WARNING: Windows {}.{}.{} does not support virtual desktops; skipping",
                ver.major, ver.minor, ver.build
            );
            return -1;
        }

        let count = winvd::get_desktop_count().unwrap_or(0);
        if winvd::create_desktop().is_ok() {
            // Switch the user to the new desktop
            let _ = winvd::switch_desktop(count);
            eprintln!("[create_virtual_desktop] created virtual desktop at index {count}");
            count as i64
        } else {
            eprintln!("[create_virtual_desktop] WARNING: create_desktop() failed on {} ({}.{}.{}); virtual desktop skipped",
                ver.label(), ver.major, ver.minor, ver.build);
            -1
        }
    }

    /// Moves a window (identified by PID) to the virtual desktop at the given
    /// 0-based index. Polls until the window appears (up to ~10 s).
    pub fn move_hwnd_to_desktop(pid: u32, desktop_index: i64) {
        if desktop_index < 0 {
            return;
        }

        // Poll for the window handle (up to ~10 s)
        let mut found = None;
        for _ in 0..200 {
            if let Some(h) = find_hwnd_raw(pid) {
                found = Some(HWND(h as *mut std::ffi::c_void));
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        let Some(hwnd) = found else {
            return;
        };

        let _ = winvd::move_window_to_desktop(desktop_index as u32, &hwnd);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /// Spawns a background thread that waits for the window to be placeable,
    /// then moves/resizes it using `SetWindowPos`.
    #[allow(clippy::too_many_arguments)]
    pub fn place_window_async(
        pid: u32,
        monitor_x: i32,
        monitor_y: i32,
        monitor_width: u32,
        monitor_height: u32,
        x: f64,
        y: f64,
        w: f64,
        h: f64,
    ) {
        // Compute absolute pixel coords from the monitor's physical pixel rect
        // (passed directly from the frontend — no EnumDisplayMonitors needed).
        let mw = monitor_width as f64;
        let mh = monitor_height as f64;
        let px: i32 = monitor_x + (x * mw) as i32;
        let py: i32 = monitor_y + (y * mh) as i32;
        let pw: i32 = (w * mw) as i32;
        let ph: i32 = (h * mh) as i32;

        eprintln!(
            "[place_window_async] pid={pid} | monitor=({monitor_x},{monitor_y} {monitor_width}x{monitor_height}) | frac=({x:.3},{y:.3} {w:.3}x{h:.3}) | target=({px},{py} {pw}x{ph})"
        );

        std::thread::spawn(move || {
            // Poll for the window handle (up to ~10 s)
            let mut hwnd_opt = None;
            for _ in 0..200 {
                if let Some(h) = find_hwnd_raw(pid) {
                    hwnd_opt = Some(HWND(h as *mut std::ffi::c_void));
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            let Some(hwnd) = hwnd_opt else {
                eprintln!("[place_window_async] pid={pid} — HWND not found after 10 s, giving up");
                return;
            };

            eprintln!("[place_window_async] pid={pid} — found HWND {:?}", hwnd);

            unsafe {
                // Log current rect before any changes
                let mut before_rect: RECT = std::mem::zeroed();
                let _ = GetWindowRect(hwnd, &mut before_rect);
                eprintln!(
                    "[place_window_async] pid={pid} — before rect: ({},{} {}x{})",
                    before_rect.left,
                    before_rect.top,
                    before_rect.right - before_rect.left,
                    before_rect.bottom - before_rect.top
                );

                // Wait until window is no longer minimized or maximized before positioning
                for _ in 0..80 {
                    if !IsIconic(hwnd).as_bool() && !IsZoomed(hwnd).as_bool() {
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }

                // Restore window if minimized/maximized before positioning
                let _ = ShowWindow(hwnd, SW_RESTORE);
                std::thread::sleep(std::time::Duration::from_millis(100));

                // Apply placement
                let result =
                    SetWindowPos(hwnd, None, px, py, pw, ph, SWP_NOACTIVATE | SWP_NOZORDER);

                // Log result and actual rect after
                let mut after_rect: RECT = std::mem::zeroed();
                let _ = GetWindowRect(hwnd, &mut after_rect);
                eprintln!(
                    "[place_window_async] pid={pid} — SetWindowPos result={:?} | after rect: ({},{} {}x{})",
                    result,
                    after_rect.left, after_rect.top,
                    after_rect.right - after_rect.left,
                    after_rect.bottom - after_rect.top
                );
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
