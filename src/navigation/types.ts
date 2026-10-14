import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ScanRecord } from '../types';

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  ScanTab: undefined; // placeholder tab button, intercepted to open ScanStack instead
  Garage: undefined;
  ProfileStack: NavigatorScreenParams<ProfileStackParamList>;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

export type ProcessingParams = { mode: 'audio'; pendingScanId: string } | { mode: 'text'; text: string };

export type ScanStackParamList = {
  Scan: undefined;
  Processing: ProcessingParams;
  Results: { scan: ScanRecord };
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ScanFlow: NavigatorScreenParams<ScanStackParamList>;
};
