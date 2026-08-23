use tauri::Manager;

#[allow(dead_code)]
pub fn show_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        // Log errors in debug builds; in release they are non-fatal UI glitches.
        #[cfg(debug_assertions)]
        {
            if let Err(e) = window.unminimize() {
                eprintln!("[window] unminimize failed: {e}");
            }
            if let Err(e) = window.show() {
                eprintln!("[window] show failed: {e}");
            }
            if let Err(e) = window.set_focus() {
                eprintln!("[window] set_focus failed: {e}");
            }
        }
        #[cfg(not(debug_assertions))]
        {
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

