use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 1. Spawn Ollama background service ("ollama serve")
            let ollama_command = app
                .shell()
                .sidecar("ollama")
                .expect("Failed to create ollama sidecar command")
                .args(["serve"]);

            let (_ollama_rx, _ollama_child) = ollama_command
                .spawn()
                .expect("Failed to spawn Ollama sidecar process");

            // 2. Spawn FastAPI sidecar
            let backend_command = app
                .shell()
                .sidecar("dental-backend")
                .expect("Failed to create backend sidecar command");

            let (_backend_rx, _backend_child) = backend_command
                .spawn()
                .expect("Failed to spawn FastAPI sidecar process");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Error while running Dental AI Suite application");
}