'use strict';

const { app, BrowserWindow, ipcMain, protocol, net, shell, nativeTheme, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

const posts = require('./posts');
const { buildMenu } = require('./menu');

const isDev = process.env.ELECTRON_DEV === '1';
const DIST = path.join(__dirname, '..', 'dist');

let mainWindow = null;
let watcher = null;
/** Suppresses the fs watcher while we are the ones writing. */
let selfWriteUntil = 0;

app.setName('post manager');

// Must run before app is ready.
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);

/**
 * Serves the exported Expo bundle. Expo emits absolute `/_expo/static/...`
 * URLs, which break under file:// — a custom standard scheme keeps them valid.
 */
function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response('Bad request', { status: 400 });
    }

    const rel = path.normalize(pathname === '/' ? 'index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
    const file = path.join(DIST, rel);

    if (!file.startsWith(DIST + path.sep) && file !== path.join(DIST, 'index.html')) {
      return new Response('Forbidden', { status: 403 });
    }

    // Unknown paths fall back to index.html so client-side routing works.
    const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(DIST, 'index.html');
    return net.fetch(pathToFileURL(target).toString());
  });
}

let pendingNotify = null;

function notifyChanged() {
  const now = Date.now();
  if (now < selfWriteUntil) {
    // Our own write is in flight. Don't drop the event — defer it, or an
    // external edit landing in this window would never reach the UI.
    if (!pendingNotify) {
      pendingNotify = setTimeout(() => {
        pendingNotify = null;
        notifyChanged();
      }, selfWriteUntil - now + 50);
    }
    return;
  }
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('posts:changed');
}

/** Watches the vault so edits made in other apps show up here. */
function startWatcher() {
  let timer = null;
  try {
    watcher = fs.watch(posts.VAULT_DIR, { persistent: false }, () => {
      clearTimeout(timer);
      timer = setTimeout(notifyChanged, 200);
    });
    watcher.on('error', () => {});
  } catch {
    // A missing or unwatchable folder is not fatal; the UI still works.
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 940,
    minHeight: 620,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 18, y: 18 },
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
      // Chromium throttles timers in unfocused windows to roughly once a
      // minute. That would stall the editor's 800 ms autosave whenever the
      // user types and immediately switches app — exactly when saving matters.
      backgroundThrottling: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Never let the app navigate away from itself; open real links in Safari.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:8081');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL('app://-/');
  }
}

function registerIpc() {
  ipcMain.handle('posts:list', () => posts.listPosts());
  ipcMain.handle('posts:read', (_e, filename) => posts.readOne(filename));
  ipcMain.handle('posts:dir', () => posts.VAULT_DIR);

  ipcMain.handle('posts:save', async (_e, filename, data) => {
    selfWriteUntil = Date.now() + 700;
    const saved = await posts.savePost(filename || null, data ?? {});
    selfWriteUntil = Date.now() + 700;
    return saved;
  });

  ipcMain.handle('posts:remove', async (_e, filename) => {
    const full = posts.resolveInVault(filename);
    selfWriteUntil = Date.now() + 700;
    // Trash rather than unlink: deleting someone's draft must be undoable.
    await shell.trashItem(full);
    return true;
  });

  ipcMain.handle('posts:reveal', async (_e, filename) => {
    if (filename) {
      shell.showItemInFolder(posts.resolveInVault(filename));
    } else {
      await shell.openPath(posts.VAULT_DIR);
    }
    return true;
  });

  ipcMain.on('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    registerAppProtocol();
    registerIpc();

    try {
      await posts.seedIfEmpty();
    } catch (err) {
      dialog.showErrorBox('Não foi possível acessar a pasta', String(err.message ?? err));
    }

    buildMenu(() => mainWindow, posts.VAULT_DIR);
    createWindow();
    startWatcher();

    nativeTheme.on('updated', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setVibrancy('sidebar');
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (watcher) watcher.close();
    app.quit();
  });
}
