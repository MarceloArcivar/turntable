# Setup guide (things you do by hand)

You only do these steps once. Claude Code writes the code; these are the parts that need your accounts.

## 1. Open the project in VS Code

1. Unzip this folder somewhere you keep projects, e.g. `~/Projects/turntable`.
2. VS Code → **File → Open Folder…** → pick `turntable`.
3. Open the terminal in VS Code (**Terminal → New Terminal**) and run `claude` to start Claude Code.
4. First message to Claude Code:
   > Read CLAUDE.md, docs/SPEC.md and docs/DESIGN.md, look at the mockups, then start Phase 1.

*Why:* Claude Code reads `CLAUDE.md` automatically, but asking it to read the spec and design too
makes sure it starts with the full picture.

## 2. Create the Spotify app (before Phase 2)

1. Go to **developer.spotify.com/dashboard** and log in with your **Premium** account.
   *Why:* since 2026, Development Mode apps only work while the owner has Premium.
2. Click **Create app**.
   - App name: `Turntable`
   - Description: `Personal now-playing display for my iPad`
   - Redirect URIs — add both:
     - `http://127.0.0.1:8000/` (for testing on your computer)
     - your GitHub Pages address, added in step 4 (e.g. `https://<your-username>.github.io/turntable/`)
   - APIs used: tick **Web API**.
   *Why:* Spotify only sends you back to addresses on this list — that's what stops other sites from
   grabbing your login. `localhost` isn't accepted, but `127.0.0.1` is.
3. Open the app → **Settings** → copy the **Client ID** and give it to Claude Code when Phase 2 starts.
   **Don't** copy or share the Client Secret — we don't use it.
   *Why:* the Client ID is public by design; the secret would be a liability in a browser app.
4. **User Management** → add your own Spotify email (and up to 4 others later).
   *Why:* in Development Mode only listed accounts can log in.

## 3. Test locally

1. In the VS Code terminal, inside the project folder: `python3 -m http.server 8000`
2. Open **http://127.0.0.1:8000** in your browser (exactly this, not "localhost").
3. Play music on your phone and check the app updates.

## 4. Put it online with GitHub Pages (Phase 5)

1. Create a new GitHub repo called `turntable` (public or private with Pages enabled).
2. Ask Claude Code to commit and push the project.
3. GitHub repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / root → Save.
4. After a minute, your app is at `https://<your-username>.github.io/turntable/`.
5. Add that exact address (with the trailing `/`) as a Redirect URI in the Spotify dashboard.
   *Why:* same reason as above — Spotify must trust the online address too.

## 5. Set up the iPad

1. Open the GitHub Pages address in **Safari**, log in with Spotify.
2. **Share → Add to Home Screen.** Open it from the new icon (it runs full screen, no Safari bars).
3. Keep the screen on — pick one:
   - **Settings → Display & Brightness → Auto-Lock → Never** (simplest), or
   - **Settings → Accessibility → Guided Access** → on; open the app and triple-click the top button
     to lock the iPad into it (good if the iPad stays on a shelf).
4. Put the iPad on a stand, play music on your phone, enjoy.

## If something goes wrong

- **"INVALID_CLIENT: Invalid redirect URI"** → the address in the browser doesn't exactly match one in
  the dashboard (check `http` vs `https`, `127.0.0.1` vs `localhost`, trailing `/`).
- **403 after login** → your Spotify account isn't in User Management, or Premium lapsed.
- **Nothing updates** → make sure Spotify is actually playing on some device; the app shows what Spotify reports.
- **To disconnect the app from your account:** spotify.com → Account → *Manage apps* → remove Turntable.
