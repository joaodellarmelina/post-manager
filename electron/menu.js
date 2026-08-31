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
      label: 'Arquivo',
      submenu: [
        { label: 'Novo Post', accelerator: 'CmdOrCtrl+N', click: send('new') },
        { label: 'Salvar', accelerator: 'CmdOrCtrl+S', click: send('save') },
        { type: 'separator' },
        {
          label: 'Abrir Pasta no Finder',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => shell.openPath(vaultDir),
        },
        { type: 'separator' },
        {
          label: 'Mover para o Lixo',
          accelerator: 'CmdOrCtrl+Backspace',
          click: send('delete'),
        },
        { type: 'separator' },
        // Closes the editor panel first; the renderer closes the window only
        // when there is no panel open.
        { label: 'Fechar', accelerator: 'CmdOrCtrl+W', click: send('close-panel') },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Desfazer' },
        { role: 'redo', label: 'Refazer' },
        { type: 'separator' },
        { role: 'cut', label: 'Recortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Colar' },
        { role: 'selectAll', label: 'Selecionar Tudo' },
        { type: 'separator' },
        { label: 'Buscar', accelerator: 'CmdOrCtrl+F', click: send('search') },
      ],
    },
    {
      label: 'Visualizar',
      submenu: [
        { label: 'Hoje', accelerator: 'CmdOrCtrl+T', click: send('today') },
        { label: 'Mês Anterior', accelerator: 'CmdOrCtrl+Left', click: send('prev-month') },
        { label: 'Próximo Mês', accelerator: 'CmdOrCtrl+Right', click: send('next-month') },
        { type: 'separator' },
        { label: 'Mostrar Filtros', accelerator: 'CmdOrCtrl+1', click: send('toggle-sidebar') },
        { type: 'separator' },
        { role: 'reload', label: 'Recarregar' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tela Cheia' },
      ],
    },
    {
      role: 'window',
      label: 'Janela',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        { type: 'separator' },
        { role: 'front', label: 'Trazer Tudo para a Frente' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };
