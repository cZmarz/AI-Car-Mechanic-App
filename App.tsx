import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { AppDataProvider, useAppData } from './src/context/AppDataContext';
import RootNavigator from './src/navigation/RootNavigator';

function AppContent() {
  const { loading, settings, colors } = useAppData();

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Hide the system nav bar for an edge-to-edge look. 'overlay-swipe' keeps
    // it reachable via a swipe from the bottom edge without pushing our
    // layout around when it's revealed, and every screen gets its own
    // in-app back/close button so users aren't relying on the hidden
    // hardware button.
    NavigationBar.setVisibilityAsync('hidden');
    NavigationBar.setBehaviorAsync('overlay-swipe');
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </SafeAreaProvider>
  );
}
