// Joblink desktop app: a window around the local Joblink server.
// Layout: Joblink.exe (this Electron app) next to a "server" folder that holds the site and its own Node.js.
const { app, BrowserWindow, shell } = require("electron");
const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const PORT = 3456;
const appDir = path.dirname(process.execPath);
const serverDir = path.join(appDir, "server");
const logFile = path.join(serverDir, "joblink.log");
let server = null;
let win = null;

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

const ping = () =>
  new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path: "/", timeout: 2500 }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });

function startServer() {
  const runtime = path.join(serverDir, "runtime");
  const out = fs.openSync(logFile, "w");
  server = spawn(path.join(runtime, "node.exe"), ["local/run.mjs"], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(PORT), JOBLINK_NO_BROWSER: "1", PATH: `${runtime};${process.env.PATH || ""}` },
    stdio: ["ignore", out, out],
    windowsHide: true,
  });
  server.on("exit", () => {
    server = null;
  });
}

function stopServer() {
  if (server && server.pid) {
    // Kill the whole tree: node, vinext and the worker runtime.
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { windowsHide: true });
    server = null;
  }
}

function showError() {
  let tail = "";
  try {
    tail = fs.readFileSync(logFile, "utf8").split("\n").slice(-25).join("\n");
  } catch {
    tail = "(jurnal tapılmadı)";
  }
  const esc = tail.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const html = `<meta charset="utf-8"><body style="font-family:Segoe UI,Arial;padding:28px"><h2>Joblink açıla bilmədi</h2><p>Bu mətni göndərin:</p><pre style="background:#f4f4f4;padding:14px;white-space:pre-wrap">${esc}</pre></body>`;
  if (win) win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
}

async function boot() {
  win = new BrowserWindow({ width: 1440, height: 920, minWidth: 900, minHeight: 600, title: "Joblink", autoHideMenuBar: true, backgroundColor: "#f4f8f6" });
  win.loadFile(path.join(__dirname, "loading.html"));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) shell.openExternal(url);
    return { action: url.startsWith(`http://localhost:${PORT}`) ? "allow" : "deny" };
  });
  win.on("closed", () => {
    win = null;
  });

  if (!(await ping())) startServer();
  const deadline = Date.now() + 6 * 60 * 1000;
  while (Date.now() < deadline && win) {
    if (await ping()) {
      win.loadURL(`http://localhost:${PORT}`);
      return;
    }
    if (!server) break; // the server stopped before it became ready
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (win) showError();
}

app.whenReady().then(() => {
  // A "Joblink" shortcut on the real Desktop (also when it is redirected to OneDrive), once.
  try {
    const flag = path.join(app.getPath("userData"), "shortcut-created");
    if (!fs.existsSync(flag)) {
      shell.writeShortcutLink(path.join(app.getPath("desktop"), "Joblink.lnk"), { target: process.execPath, cwd: appDir, description: "Joblink" });
      fs.mkdirSync(path.dirname(flag), { recursive: true });
      fs.writeFileSync(flag, "1");
    }
  } catch {
    // The shortcut is optional.
  }
  boot();
});
app.on("window-all-closed", () => {
  stopServer();
  app.quit();
});
app.on("before-quit", stopServer);
