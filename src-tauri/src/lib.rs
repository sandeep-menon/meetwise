use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_positioner::{Position, WindowExt};

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
        .plugin(tauri_plugin_positioner::init())
        .setup(|app| {
            let about_item = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&about_item, &quit_item])?;
            let _tray = TrayIconBuilder::new()
                .icon(tauri::include_image!("icons/tray.png"))
                .tooltip("meetwise")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "about" => show_about(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.move_window(Position::TrayLeft);
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