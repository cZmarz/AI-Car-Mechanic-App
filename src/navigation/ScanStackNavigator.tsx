import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ScanStackParamList } from './types';
import { useAppData } from '../context/AppDataContext';
import ScanScreen from '../screens/ScanScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ResultsScreen from '../screens/ResultsScreen';

const Stack = createNativeStackNavigator<ScanStackParamList>();

export default function ScanStackNavigator() {
  const { colors } = useAppData();

  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        // This whole stack is a modal presented over the tab bar, and on
        // Android there's no system nav bar to fall back on (it's hidden
        // for the edge-to-edge look) — every screen needs its own explicit
        // way out rather than relying on a hardware/gesture back button.
        headerLeft: () => (
          <Pressable
            hitSlop={8}
            onPress={() => navigation.getParent()?.navigate('MainTabs' as never)}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        ),
      })}
    >
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Scan' }} />
      <Stack.Screen
        name="Processing"
        component={ProcessingScreen}
        options={{ title: 'Analysing', gestureEnabled: false }}
      />
      <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Diagnosis' }} />
    </Stack.Navigator>
  );
}
