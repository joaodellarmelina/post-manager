import React, { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { ThemeContext, themes } from './src/theme';
import { installWebStyles } from './src/webStyles';

installWebStyles();

export default function App() {
  // The single source of appearance for the whole tree.
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? themes.dark : themes.light;

  useEffect(() => {
    installWebStyles();
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <CalendarScreen />
      </View>
    </ThemeContext.Provider>
  );
}
