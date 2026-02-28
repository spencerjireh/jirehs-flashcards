#[tauri::command]
pub fn set_traffic_lights_visible(window: tauri::WebviewWindow, visible: bool) {
    #[cfg(target_os = "macos")]
    {
        let _ = window.with_webview(move |webview| {
            use objc2_app_kit::{NSWindow, NSWindowButton};

            // Safety: ns_window() returns a valid NSWindow pointer on macOS
            // when called inside with_webview (which runs on the main thread).
            unsafe {
                let ns_window: &NSWindow = &*webview.ns_window().cast();
                let buttons = [
                    NSWindowButton::CloseButton,
                    NSWindowButton::MiniaturizeButton,
                    NSWindowButton::ZoomButton,
                ];
                for button_type in buttons {
                    if let Some(button) = ns_window.standardWindowButton(button_type) {
                        button.setHidden(!visible);
                    }
                }
            }
        });
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, visible);
    }
}
