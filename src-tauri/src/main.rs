// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod agents;
mod api;
mod config;
mod db;
mod models;
mod scraper;
mod searxng;
mod tools;
mod tray;

use api::AppState;
use config::ConfigManager;
use db::Database;
use reqwest::Client;
use std::net::SocketAddr;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

fn get_app_data_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("DATA_DIR") {
        return PathBuf::from(dir);
    }

    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if cwd.ends_with("src-tauri") {
        if let Some(parent) = cwd.parent() {
            return parent.join("data");
        }
    }
    if cwd.join("src-tauri").exists() {
        return cwd.join("data");
    }

    #[cfg(target_os = "windows")]
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let new_dir = PathBuf::from(&local_app_data).join("Noectra AI").join("data");
        let legacy_dir = PathBuf::from(&local_app_data).join("Vane").join("data");

        // Seamless migration: If legacy Vane data exists and new directory doesn't, migrate it
        if legacy_dir.exists() && !new_dir.exists() {
            let _ = std::fs::create_dir_all(&new_dir);
            for file_name in ["vane.db", "vane.db-shm", "vane.db-wal", "config.json"] {
                let old_file = legacy_dir.join(file_name);
                let new_file = new_dir.join(file_name);
                if old_file.exists() && !new_file.exists() {
                    let _ = std::fs::copy(&old_file, &new_file);
                }
            }
        }
        return new_dir;
    }

    #[cfg(target_os = "macos")]
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("Noectra AI")
            .join("data");
    }

    #[cfg(target_os = "linux")]
    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("noectra-ai")
            .join("data");
    }

    PathBuf::from("data")
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_autostart_status(app: tauri::AppHandle) -> Result<bool, String> {
    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn set_autostart_status(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    if enable {
        app.autolaunch().enable().map_err(|e| e.to_string())?;
    } else {
        app.autolaunch().disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn set_dwm_window_theme(hwnd: isize, is_dark: bool) {
    use std::ffi::c_void;

    type DwmSetWindowAttributeFn = unsafe extern "system" fn(
        isize,
        u32,
        *const c_void,
        u32,
    ) -> i32;

    unsafe {
        extern "system" {
            fn LoadLibraryA(lpLibFileName: *const u8) -> *mut c_void;
            fn GetProcAddress(hModule: *mut c_void, lpProcName: *const u8) -> *mut c_void;
        }

        let dwmapi = LoadLibraryA(b"dwmapi.dll\0".as_ptr());
        if !dwmapi.is_null() {
            let func_ptr = GetProcAddress(dwmapi, b"DwmSetWindowAttribute\0".as_ptr());
            if !func_ptr.is_null() {
                let dwm_set_attribute: DwmSetWindowAttributeFn = std::mem::transmute(func_ptr);

                // 20 = DWMWA_USE_IMMERSIVE_DARK_MODE (Windows 10 20H1+ and Windows 11)
                // 19 = older Windows 10 builds
                let dark_mode_val: i32 = if is_dark { 1 } else { 0 };
                let _ = dwm_set_attribute(
                    hwnd,
                    20,
                    &dark_mode_val as *const _ as *const c_void,
                    std::mem::size_of::<i32>() as u32,
                );
                let _ = dwm_set_attribute(
                    hwnd,
                    19,
                    &dark_mode_val as *const _ as *const c_void,
                    std::mem::size_of::<i32>() as u32,
                );

                // 35 = DWMWA_CAPTION_COLOR (Windows 11 build 22000+)
                // COLORREF format is 0x00BBGGRR
                let caption_color: u32 = if is_dark {
                    0x000E0907 // #07090e dark background
                } else {
                    0x00FFFFFF // #ffffff clean light background
                };
                let _ = dwm_set_attribute(
                    hwnd,
                    35,
                    &caption_color as *const _ as *const c_void,
                    std::mem::size_of::<u32>() as u32,
                );

                // 36 = DWMWA_TEXT_COLOR (Windows 11 build 22000+)
                let text_color: u32 = if is_dark {
                    0x00FFFFFF // Pure white text
                } else {
                    0x002A170F // Slate 900 (#0f172a) text
                };
                let _ = dwm_set_attribute(
                    hwnd,
                    36,
                    &text_color as *const _ as *const c_void,
                    std::mem::size_of::<u32>() as u32,
                );
            }
        }
    }
}

#[tauri::command]
fn sync_window_theme(app: tauri::AppHandle, theme: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let is_dark = theme.to_lowercase() == "dark";
        let t = if is_dark {
            Some(tauri::Theme::Dark)
        } else {
            Some(tauri::Theme::Light)
        };
        let _ = window.set_theme(t);

        #[cfg(target_os = "windows")]
        if let Ok(hwnd) = window.hwnd() {
            set_dwm_window_theme(hwnd.0 as isize, is_dark);
        }
    }
    Ok(())
}

#[tokio::main]
async fn main() {
    let data_dir = get_app_data_dir();

    std::fs::create_dir_all(&data_dir).ok();

    let db_path = data_dir.join("vane.db");
    let config_path = data_dir.join("config.json");

    let db = Database::new(db_path).expect("Failed to initialize SQLite database");
    let config = ConfigManager::new(config_path);
    let http_client = Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to build reqwest client");

    let initial_theme = config
        .get_config()
        .preferences
        .get("theme")
        .and_then(|v| v.as_str())
        .unwrap_or("dark")
        .to_string();

    let state = AppState {
        db,
        config,
        http_client,
    };

    let router = api::create_router(state);

    // Spawn local Axum API server on 127.0.0.1:3001
    tokio::spawn(async move {
        let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
        println!("Starting internal Noectra AI API server on http://{}", addr);
        if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
            let _ = axum::serve(listener, router).await;
        } else {
            eprintln!("Failed to bind Axum internal server to {}", addr);
        }
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .setup(move |app| {
            // Apply initial theme to main window
            let is_dark = initial_theme.to_lowercase() != "light";
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_theme(if is_dark {
                    Some(tauri::Theme::Dark)
                } else {
                    Some(tauri::Theme::Light)
                });
                #[cfg(target_os = "windows")]
                if let Ok(hwnd) = window.hwnd() {
                    set_dwm_window_theme(hwnd.0 as isize, is_dark);
                }
            }

            // Setup System Tray
            let tray_state = tray::setup_tray(app.handle())
                .expect("Failed to initialize system tray");
            app.manage(tray_state);

            // Check if launched on boot with --minimized or --silent flag
            let is_minimized_launch = std::env::args().any(|arg| arg == "--minimized" || arg == "--silent");
            if is_minimized_launch {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            // Intercept main window close button to minimize/hide to tray instead of quitting
            if let Some(window) = app.get_webview_window("main") {
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Some(w) = app_handle.get_webview_window("main") {
                            let _ = w.hide();
                        }
                    }
                });
            }

            // Auto-hide tray companion hub when user clicks outside (loses focus)
            if let Some(tray_window) = app.get_webview_window("tray-hub") {
                let tray_win_clone = tray_window.clone();
                tray_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = tray_win_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_autostart_status,
            set_autostart_status,
            sync_window_theme,
            tray::update_tray_status,
            tray::toggle_tray_hub_cmd,
            tray::open_workspace_cmd,
            tray::open_route_cmd,
            tray::exit_app_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
