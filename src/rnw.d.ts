// react-native-web accepts a few props the React Native types don't declare.
// `dataSet` renders as data-* attributes, which is how we hook CSS that
// StyleSheet cannot express (-webkit-app-region for the draggable title bar).
import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    dataSet?: Record<string, string>;
  }
  interface PressableProps {
    dataSet?: Record<string, string>;
  }
  interface TextProps {
    dataSet?: Record<string, string>;
  }
}
