use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, PhysicalPosition, Rect, WebviewWindow,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            // The check mark reflects the real setting, which the user can also change in Windows Settings.
            let starts_with_windows = app.autolaunch().is_enabled().unwrap_or(false);
            let autostart_item = CheckMenuItem::with_id(
                app,
                "autostart",
                "Start with Windows",
                true,
                starts_with_windows,
                None::<&str>,
            )?;
            let about_item = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let tray_menu = Menu::with_items(
                app,
                &[&autostart_item, &separator, &about_item, &quit_item],
            )?;
            let _tray = TrayIconBuilder::new()
                .icon(tauri::include_image!("icons/tray.png"))
                .tooltip("meetwise")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "autostart" => toggle_autostart(app, &autostart_item),
                    "about" => show_about(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        rect,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = position_popover(&window, rect);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            if let Some(main_window) = app.get_webview_window("main") {
                let hide_target = main_window.clone();
                main_window.on_window_event(move |event| {
                    match event {
                        tauri::WindowEvent::CloseRequested { api, .. } => {
                            api.prevent_close();
                            let _ = hide_target.hide();
                        }
                        tauri::WindowEvent::Focused(false) => {
                            let _ = hide_target.hide();
                        }
                        tauri::WindowEvent::Resized(_) => {
                            let _ = snap_to_taskbar(&hide_target);
                        }
                        _ => {}
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn show_about(app: &AppHandle) {
    let pkg: serde_json::Value = serde_json::from_str(include_str!("../../package.json"))
        .expect("package.json is valid JSON");
    let version = pkg["version"].as_str().unwrap_or("unknown");
    let author = pkg["author"].as_str().unwrap_or("unknown");

    app.dialog()
        .message(format!("meetwise\nVersion {version}\n© 2026 {author}"))
        .title("About meetwise")
        .kind(MessageDialogKind::Info)
        .show(|_| {});
}

fn position_popover(window: &WebviewWindow, tray_rect: Rect) -> tauri::Result<()> {
    let scale = window.scale_factor()?;
    let icon = tray_rect.position.to_physical::<i32>(scale);

    let Some(monitor) = window.monitor_from_point(icon.x as f64, icon.y as f64)? else {
        return Ok(());
    };
    let work_area = monitor.work_area();
    let size = window.outer_size()?;

    let x = (icon.x - size.width as i32).max(work_area.position.x);
    let y = work_area.position.y + work_area.size.height as i32 - size.height as i32;

    window.set_position(PhysicalPosition::new(x, y))
}

fn snap_to_taskbar(window: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.current_monitor()? else {
        return Ok(());
    };
    let work_area = monitor.work_area();
    let size = window.outer_size()?;
    let x = window.outer_position()?.x;
    let y = work_area.position.y + work_area.size.height as i32 - size.height as i32;

    window.set_position(PhysicalPosition::new(x, y))
}

// Windows has already flipped the check mark when this runs, so the item's state is the user's choice.
// If the setting can't be changed, put the check mark back so the menu never shows the wrong state.
fn toggle_autostart(app: &AppHandle, item: &CheckMenuItem<tauri::Wry>) {
    let enable = item.is_checked().unwrap_or(false);
    let autolaunch = app.autolaunch();
    let result = if enable {
        autolaunch.enable()
    } else {
        autolaunch.disable()
    };
    if result.is_err() {
        let _ = item.set_checked(autolaunch.is_enabled().unwrap_or(false));
    }
}
