# meetwise

Find a meeting time across time zones, right from your tray.

A Windows system tray app built with Tauri 2, React and TypeScript, distributed through the Microsoft Store.

Lightweight and fast: it uses the WebView2 runtime that ships with Windows instead of bundling a browser, sits idle in the tray, and opens instantly when you need it. No account, no network, nothing stored except the time zones you add.

## Development

- `npm install`
- `npm run tauri dev` — run the app with hot reload
- `npm run tauri build` — production build
