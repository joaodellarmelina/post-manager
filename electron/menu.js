'use strict';

const { Menu, app, shell } = require('electron');

/**
 * macOS menu bar. Beyond our own shortcuts this must carry the standard
 * Edit roles — without them Cmd+C/V/Z stop working in text inputs.
 */
function buildMenu(getWindow, vaultDir) {
  const send = (action) => () => {
    const win = getWindow();
    if (win) win.webContents.send('menu:action', action);
  };

  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        { label: 'New Post', accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { type: 'separator' },
        {
          label: 'Open Folder in Finder',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => shell.openPath(vaultDir),
        },
        { type: 'separator' },
        {
          label: 'Move to Trash',
          accelerator: 'CmdOrCtrl+Backspace',
          click: send('delete'),
        },
        { type: 'separator' },
        // Closes the editor panel first; the renderer closes the window only
        // when there is no panel open.
        { label: 'Close', accelerator: 'CmdOrCtrl+W', click: send('close-panel') },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find', accelerator: 'CmdOrCtrl+F', click: send('search') },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Today', accelerator: 'CmdOrCtrl+T', click: send('today') },
        { label: 'Previous Month', accelerator: 'CmdOrCtrl+Left', click: send('prev-month') },
        { label: 'Next Month', accelerator: 'CmdOrCtrl+Right', click: send('next-month') },
        { type: 'separator' },
        { label: 'Switch Calendar / List', accelerator: 'CmdOrCtrl+L', click: send('toggle-view') },
        { label: 'Show Filters', accelerator: 'CmdOrCtrl+1', click: send('toggle-sidebar') },
        { label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', click: send('shortcuts') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      role: 'window',
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };
