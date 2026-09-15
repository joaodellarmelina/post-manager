import React from 'react';

/**
 * Small line icons for the toolbar, drawn as raw <svg>: react-native-web hands
 * lowercase tags to react-dom, so this needs no dependency. 16px, 1.6 stroke,
 * on a 24-unit grid — close to SF Symbols in weight so they sit next to the
 * system font without shouting.
 */
export type IconName = 'calendar' | 'list' | 'search' | 'folder' | 'person' | 'sparkle';

const PATHS: Record<IconName, string> = {
  // month grid: rounded frame, header line, two rows of day dots as short dashes
  calendar:
    'M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7A1.5 1.5 0 0 1 5 5.5Z M3.5 10h17 M8 3.5v3.5 M16 3.5v3.5 M7.5 13.5h1.5 M11.25 13.5h1.5 M15 13.5h1.5 M7.5 16.5h1.5 M11.25 16.5h1.5',
  // three rows, dot + line
  list: 'M5 7h.01 M9 7h10 M5 12h.01 M9 12h10 M5 17h.01 M9 17h10',
  search: 'M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z M15.3 15.3 20 20',
  folder:
    'M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2a1.5 1.5 0 0 1 1.06.44L11.5 7.7a1 1 0 0 0 .7.3H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-10Z',
  person: 'M12 4.5a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Z M4.75 20c.6-3.6 3.6-5.75 7.25-5.75S18.65 16.4 19.25 20',
  // four-point star
  sparkle: 'M12 3.5c.6 4.4 2.6 6.9 8.5 8.5-5.9 1.6-7.9 4.1-8.5 8.5-.6-4.4-2.6-6.9-8.5-8.5 5.9-1.6 7.9-4.1 8.5-8.5Z',
};

export function Icon({ name, color, size = 16 }: { name: IconName; color: string; size?: number }) {
  return React.createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    React.createElement('path', {
      d: PATHS[name],
      fill: 'none',
      stroke: color,
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  );
}
