'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * The only surface the renderer gets. No fs, no path, no ipcRenderer itself —
 * every disk operation goes through a validated handler in the main process.
 */
contextBridge.exposeInMainWorld('vault', {
  list: () => ipcRenderer.invoke('posts:list'),
  read: (filename) => ipcRenderer.invoke('posts:read', filename),
  save: (filename, data) => ipcRenderer.invoke('posts:save', filename, data),
  remove: (filename) => ipcRenderer.invoke('posts:remove', filename),
  reveal: (filename) => ipcRenderer.invoke('posts:reveal', filename),
  getDir: () => ipcRenderer.invoke('posts:dir'),
  closeWindow: () => ipcRenderer.send('window:close'),

  /** Fired when the folder changes on disk, including from other apps. */
  onChanged: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('posts:changed', handler);
    return () => ipcRenderer.off('posts:changed', handler);
  },

  /** Native menu accelerators: 'new' | 'save' | 'close-panel' | 'today' | ... */
  onMenu: (cb) => {
    const handler = (_e, action) => cb(action);
    ipcRenderer.on('menu:action', handler);
    return () => ipcRenderer.off('menu:action', handler);
  },
});
