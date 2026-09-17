# Noectra AI — Agent Instructions & Operational Rules

This document establishes the mandatory architectural rules, engineering standards, and behavioral constraints for any AI coding agent operating within the **Noectra AI** repository (`amirrezamortazavifard/noectra-ai`).

Whenever a new agent session is started, you MUST read, adhere to, and strictly enforce every rule defined in this document without exception.

---

## 1. Mandatory GitHub Synchronization (Critical Law)
- **Every change must reach GitHub**: Whenever you modify source code, add features, optimize styles, fix bugs, or create new assets, you **MUST** immediately commit and push the changes to GitHub:
  - Remote: `origin/main` (`https://github.com/amirrezamortazavifard/noectra-ai.git`).
  - Use informative, conventional commit messages (e.g. `feat: ...`, `fix: ...`, `chore: ...`, `style: ...`).
- **Never leave local changes unpushed**: Before ending your task or concluding the turn, verify with `git status` that working tree is clean and `origin/main` is up to date.

---

## 2. Strict English Language in Software & UI
- **Software UI is 100% English**: All user-facing text inside the software must be written strictly in high-grade, professional English:
  - Page titles, headings, buttons, and badges.
  - Toast notifications, alert dialogues, and confirmation prompts.
  - System tray menu items, tooltips, and status indicators.
  - Error messages and placeholder texts.
  - In-code comments, docstrings, logs, and changelogs.
- **User Communication vs. Software Code**: While the project owner may converse in Persian (Farsi), you must **NEVER** introduce Persian or mixed-language text into the application source code or UI components.

---

## 3. Data Storage & OS-Native AppData Architecture
- **Never write to installation directories**: On Windows, applications installed in `C:\Program Files` lack write permissions under standard user accounts.
- **App Data Directory Standard**:
  - **Windows**: `%LOCALAPPDATA%\Noectra AI\data\`
  - **macOS**: `~/Library/Application Support/Noectra AI/data`
  - **Linux**: `~/.local/share/noectra-ai/data`
- **Preserve Migration Logic**: The SQLite database (`vane.db`), WAL files (`vane.db-wal`, `vane.db-shm`), and `config.json` reside in this data directory. The automatic migration logic in `src-tauri/src/main.rs` from legacy `Vane` to `Noectra AI` must remain intact.

---

## 4. Vite File Watcher & Windows Cargo DLL Lock (EBUSY Prevention)
- On Windows, when Cargo compiles Rust dependencies into `src-tauri/target/debug/deps/*.dll`, the operating system applies mandatory file write locks.
- **Mandatory Configuration**: `vite.config.ts` must ALWAYS contain:
  ```ts
  server: {
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  ```
  Never remove this ignore rule; doing so causes immediate `EBUSY: resource busy or locked` compiler crashes during `npm run tauri dev`.

---

## 5. Dual-Theme Support: Strict Dark & Light Parity
- **No Hardcoded Dark Backgrounds in Light Theme**:
  - Never hardcode dark colors (e.g., `bg-[#0c101a]`, `bg-neutral-900`, `text-white`) without a `dark:` prefix.
  - All cards, headers, sidebars, modals, and input fields must be styled for both themes:
    - **Light mode**: `bg-light-primary` or `bg-white`, `border-light-200`, `text-slate-900` / `text-black`.
    - **Dark mode**: `dark:bg-dark-primary` or `dark:bg-[#0c101a]`, `dark:border-white/10`, `dark:text-white`.
- **High-Contrast Form Elements**:
  - Native `<select>` dropdowns and inputs must specify explicit text colors (`text-slate-900 dark:text-white font-medium`) so option text is never faint or invisible on light backgrounds.

---

## 6. Tauri Webview External Links
- Standard anchor tags `<a href="..." target="_blank">` do not open in the user's default OS browser inside Tauri webviews.
- Always use `openExternalLink()` from `@/lib/openExternal` (or `@tauri-apps/plugin-opener`) for all external URLs, GitHub links, documentation, and download mirrors.

---

## 7. Version Synchronization Across Codebase
When updating the version or preparing a release, the version number must be updated across all 5 configuration files simultaneously:
1. `package.json` (`"version": "X.Y.Z"`)
2. `src-tauri/Cargo.toml` (`version = "X.Y.Z"`)
3. `src-tauri/tauri.conf.json` (`"version": "X.Y.Z"`)
4. `src/main.tsx` (`NEXT_PUBLIC_VERSION: 'X.Y.Z'`)
5. `src-tauri/src/tray.rs` (Tray title string: `"🌟 Noectra AI Studio vX.Y.Z"`)

---

## 8. Multi-Platform Automated Releases (CI/CD)
- Official releases and multi-platform packages are orchestrated by GitHub Actions at `.github/workflows/release.yml`.
- Automated builds produce:
  - **Windows**: `.exe` (NSIS setup) & `.msi` (WiX installer)
  - **macOS**: `.dmg` (Apple Silicon & Universal)
  - **Linux**: `.AppImage`, `.deb`, and `.rpm`
- To trigger a production release build, create and push a git tag matching `v*.*.*` (e.g. `git tag v1.0.1; git push origin v1.0.1`).

---

## 9. Branding, Icons & Resource Cache Handling
- The official brand icon is located at:
  - `src-tauri/icons/` (53 platform-specific icon assets generated via `npx @tauri-apps/cli icon`)
  - `public/icon.png` (HTML favicon & Webview assets)
- **Windows Icon Cache Gotcha**:
  - Cargo caches compiled Windows `.res` resource files in `src-tauri/target/`. If you update icon assets, you MUST execute `cargo clean` inside `src-tauri` so the Windows RC compiler re-embeds the new icon into `noectra-ai.exe`.

---

## 10. Privacy & Git Cleanliness
- The following files must NEVER be committed to the repository (enforced via `.gitignore`):
  - Personal databases: `data/*.db`, `data/*.db-wal`, `data/*.db-shm`
  - Secrets & keys: `data/config.json`, `.env`, `.env.local`
  - Build outputs & dependencies: `node_modules/`, `dist/`, `src-tauri/target/`, `release_builds/`
- Always maintain `data/config.example.json` as a sanitized template.

---

## 11. PowerShell Shell Rules (Windows Host)
- Operating system shell is **PowerShell**.
- PowerShell does **NOT** support `&&` for command chaining.
- Always use `;` (semicolon) to separate sequential commands (e.g., `git add .; git commit -m "..."; git push origin main`).

---

## 12. Pre-Completion Validation
- Always run `npm run build` to verify TypeScript type checking and bundle creation before completing non-trivial frontend changes.
- Ensure the application builds cleanly with zero regressions.
