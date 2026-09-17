use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow, Wry};

pub struct TrayState {
    pub status_item: Mutex<MenuItem<Wry>>,
}

pub fn position_tray_hub(tray_win: &WebviewWindow) {
    if let Ok(Some(monitor)) = tray_win.current_monitor() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let win_w = (420.0 * scale) as i32;
        let win_h = (640.0 * scale) as i32;
        let margin_x = (16.0 * scale) as i32;
        let margin_y = (56.0 * scale) as i32;

        let x = (size.width as i32) - win_w - margin_x;
        let y = (size.height as i32) - win_h - margin_y;

        let _ = tray_win.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
    }
}

pub fn toggle_tray_hub(app: &AppHandle) {
    if let Some(tray_window) = app.get_webview_window("tray-hub") {
        let is_visible = tray_window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = tray_window.hide();
        } else {
            position_tray_hub(&tray_window);
            let _ = tray_window.show();
            let _ = tray_window.unminimize();
            let _ = tray_window.set_focus();
        }
    } else {
        toggle_workspace(app);
    }
}

pub fn toggle_workspace(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);
        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
}

pub fn open_workspace(app: &AppHandle) {
    if let Some(tray_window) = app.get_webview_window("tray-hub") {
        let _ = tray_window.hide();
    }
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.unminimize();
        let _ = main_window.set_focus();
    }
}

pub fn setup_tray(app: &AppHandle) -> Result<TrayState, Box<dyn std::error::Error>> {
    // 1. Menu items (Strictly English)
    let title_item = MenuItem::with_id(
        app,
        "title",
        "🌟 Noectra AI Studio v1.0.0",
        false,
        None::<&str>,
    )?;
    let status_item = MenuItem::with_id(
        app,
        "status",
        "● Status: Idle & Operational",
        false,
        None::<&str>,
    )?;
    let server_item = MenuItem::with_id(
        app,
        "server",
        "⚡ Engine Core: 127.0.0.1:3001",
        false,
        None::<&str>,
    )?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let toggle_hub_item = MenuItem::with_id(
        app,
        "toggle_hub",
        "👁 Toggle Quick Companion Hub",
        true,
        None::<&str>,
    )?;
    let open_workspace_item = MenuItem::with_id(
        app,
        "open_workspace",
        "🚀 Open Full Workspace",
        true,
        None::<&str>,
    )?;
    let new_chat_item = MenuItem::with_id(
        app,
        "new_chat",
        "➕ Start New Research Session",
        true,
        None::<&str>,
    )?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(
        app,
        "quit",
        "❌ Terminate & Exit Engine",
        true,
        None::<&str>,
    )?;

    // 2. Context menu
    let menu = Menu::with_items(
        app,
        &[
            &title_item,
            &status_item,
            &server_item,
            &sep1,
            &toggle_hub_item,
            &open_workspace_item,
            &new_chat_item,
            &sep2,
            &quit_item,
        ],
    )?;

    // 3. Tray icon builder
    let mut builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("Noectra AI - Neural Research Studio (Ready)")
        .menu(&menu)
        .show_menu_on_left_click(false);

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    // 4. Menu click events
    builder = builder.on_menu_event(|app, event| {
        match event.id().as_ref() {
            "toggle_hub" => {
                toggle_tray_hub(app);
            }
            "open_workspace" => {
                open_workspace(app);
            }
            "new_chat" => {
                open_workspace(app);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("navigate-to", "/");
                }
            }
            "quit" => {
                println!("Terminating Noectra AI via System Tray...");
                app.exit(0);
            }
            _ => {}
        }
    });

    // 5. Tray icon left click toggles companion hub
    builder = builder.on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            let app = tray.app_handle();
            toggle_tray_hub(app);
        }
    });

    builder.build(app)?;

    let state = TrayState {
        status_item: Mutex::new(status_item),
    };

    Ok(state)
}

#[tauri::command]
pub fn update_tray_status(app: AppHandle, status: String) -> Result<(), String> {
    if let Some(state) = app.try_state::<TrayState>() {
        if let Ok(status_item) = state.status_item.lock() {
            let is_idle = status.to_lowercase().contains("ready")
                || status.to_lowercase().contains("idle")
                || status.to_lowercase().contains("operational");
            let display_text = if is_idle {
                format!("● Status: {}", status)
            } else {
                format!("◐ Status: {}", status)
            };
            let _ = status_item.set_text(&display_text);
        }
    }
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = format!("Noectra AI - {}", status);
        let _ = tray.set_tooltip(Some(tooltip));
    }
    Ok(())
}

#[tauri::command]
pub fn toggle_tray_hub_cmd(app: AppHandle) {
    toggle_tray_hub(&app);
}

#[tauri::command]
pub fn open_workspace_cmd(app: AppHandle) {
    open_workspace(&app);
}

#[tauri::command]
pub fn open_route_cmd(app: AppHandle, route: String) {
    open_workspace(&app);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("navigate-to", route);
    }
}

#[tauri::command]
pub fn exit_app_cmd(app: AppHandle) {
    app.exit(0);
}
