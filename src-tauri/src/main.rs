// Punto de entrada de la app nativa.
//
// Solo se encarga de arrancar Tauri y registrar el plugin de SQLite, que es
// el que la capa offline (lib/db/sqliteSchema.js) usa para guardar los datos
// en la base local `contaven.db`.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running ContaVen");
}
