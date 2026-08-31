/**
 * Global CSS that react-native-web's StyleSheet cannot express:
 * window transparency for the vibrancy effect, the draggable title bar
 * region, and native-looking scrollbars.
 *
 * `data-drag` / `data-nodrag` are set via RN's `dataSet` prop.
 */
const CSS = `
  html, body, #root {
    background: transparent !important;
    height: 100%;
    margin: 0;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  [data-drag="true"] { -webkit-app-region: drag; }
  [data-nodrag="true"] { -webkit-app-region: no-drag; }

  input, textarea { -webkit-app-region: no-drag; }
  textarea, input { outline: none; }
  ::selection { background: rgba(0,122,255,0.28); }

  *::-webkit-scrollbar { width: 9px; height: 9px; }
  *::-webkit-scrollbar-track { background: transparent; }
  *::-webkit-scrollbar-thumb {
    background: rgba(128,128,128,0.38);
    border-radius: 5px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  *::-webkit-scrollbar-thumb:hover { background-color: rgba(128,128,128,0.6); background-clip: content-box; }

  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
  }
`;

export function installWebStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('postmanager-styles')) return;
  const el = document.createElement('style');
  el.id = 'postmanager-styles';
  el.textContent = CSS;
  document.head.appendChild(el);
}

export const DRAG = { drag: 'true' } as const;
export const NO_DRAG = { nodrag: 'true' } as const;
