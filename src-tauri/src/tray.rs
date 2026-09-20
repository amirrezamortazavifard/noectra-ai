use std::sync::Mutex;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

// Maintained for 6-Point Version Synchronization compliance (User Rule 7)
pub const TRAY_TITLE: &str = "🌟 Noectra AI Studio v1.0.1";

pub struct TrayState {
    pub current_status: Mutex<String>,
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
    // Build tray icon without unstyled native Win32 context menu.
    // Both Left-click and Right-click toggle the modern styled TrayHub window.
    let mut builder = TrayIconBuilder::with_id("main-tray")
        .tooltip(format!("{TRAY_TITLE} - Neural Research Studio (Ready)"))
        .show_menu_on_left_click(false);

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    // Both Left-click and Right-click invoke the modern styled companion hub
    builder = builder.on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click {
            button: MouseButton::Left | MouseButton::Right,
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
        current_status: Mutex::new("Idle & Operational".to_string()),
    };

    Ok(state)
}

#[tauri::command]
pub fn update_tray_status(app: AppHandle, status: String) -> Result<(), String> {
    if let Some(state) = app.try_state::<TrayState>() {
        if let Ok(mut current) = state.current_status.lock() {
            *current = status.clone();
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
