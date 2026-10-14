import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from './types';
import { useAppData } from '../context/AppDataContext';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import GarageScreen from '../screens/GarageScreen';
import ProfileStackNavigator from './ProfileStackNavigator';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screen: the ScanTab button intercepts tabPress and never
// actually navigates here (see listeners below) — it opens the modal
// ScanFlow stack on the root navigator instead.
function ScanTabPlaceholder() {
  return <View />;
}

export default function MainTabs() {
  const { colors } = useAppData();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // A custom height opts out of the tab bar's automatic safe-area
          // handling, so the bottom inset (Android nav bar / iOS home
          // indicator) has to be added back manually here.
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom + 6,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanTabPlaceholder}
        options={{
          tabBarLabel: 'Scan',
          tabBarIcon: ({ color }) => (
            <View style={[styles.scanButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="mic" size={24} color={colors.primaryText} />
            </View>
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            (navigation.getParent() as any)?.navigate('ScanFlow', { screen: 'Scan' });
          },
        })}
      />
      <Tab.Screen
        name="Garage"
        component={GarageScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
});
