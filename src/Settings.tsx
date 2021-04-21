import { useContext, useMemo } from 'react';
import { ThemeContext } from './contexts/theme';
import React from 'react';
import { View, Switch, ScrollView, Platform, Alert } from 'react-native';
import { useTheme, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, ListItem } from 'react-native-elements';
import { Registration } from './Registration';
import { createStackNavigator } from '@react-navigation/stack';
import { useDeliveryInterval, useIoTCentralClient, useSimulation } from './hooks/iotc';
import { defaults } from './contexts/defaults';
import { StorageContext } from './contexts/storage';
import { LogsContext } from './contexts/logs';
import Strings from 'strings';
import { camelToName } from 'components/typography';
import { useBoolean } from 'hooks/common';
import { ThemeMode } from 'types';

const Stack = createStackNavigator();

type ProfileItem = {
  title: string;
  subtitle?: string;
  icon: string;
  value?: boolean;
  action?: {
    type: 'switch' | 'expand' | 'select';
    fn: (...args: any) => void;
  };
};

export default function Settings() {
  const { clear } = useContext(StorageContext);
  const { clear: clearLogs } = useContext(LogsContext);
  const [client, clearClient] = useIoTCentralClient();
  const [centralSimulated, simulate] = useSimulation();
  const { mode } = useContext(ThemeContext);
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const [deliveryInterval] = useDeliveryInterval();
  console.log(deliveryInterval);

  // const updateUIItems = (title: string, val: any) => {
  //   setItems(current =>
  //     current.map(i => {
  //       if (i.title === title) {
  //         i = { ...i, value: val };
  //       }
  //       return i;
  //     }),
  //   );
  // };

  const items = useMemo<ProfileItem[]>(
    () => [
      {
        title: 'Registration',
        icon: 'hammer-outline',
        action: {
          type: 'expand',
          fn: navigation => {
            navigation.navigate('Registration', { previousScreen: 'root' });
          },
        },
      },
      {
        title: 'Clear Data',
        icon: 'trash-outline',
        action: {
          type: 'select',
          fn: async val => {
            await client?.disconnect();
            await clear();
            clearLogs();
            clearClient();
            Alert.alert('Success', 'Successfully clean data');
          },
        },
      },
      {
        title: Strings.Settings.Theme.Title,
        icon: 'moon-outline',
        subtitle: camelToName(ThemeMode[mode].toLowerCase()),
        action: {
          type: 'expand',
          fn: navigation => {
            navigation.navigate('Theme', { previousScreen: 'root' });
          },
        },
      },
      {
        title: Strings.Settings.DeliveryInterval.Title,
        icon: 'timer-outline',
        subtitle: camelToName(Strings.Settings.DeliveryInterval[`${deliveryInterval}` as keyof typeof Strings.Settings.DeliveryInterval]),
        action: {
          type: 'expand',
          fn: navigation => {
            navigation.navigate('Interval', { previousScreen: 'root' });
          },
        },
      },
      ...(defaults.dev
        ? [
          {
            title: 'Simulation Mode',
            icon: dark ? 'sync-outline' : 'sync',
            action: {
              type: 'switch',
              fn: async val => {
                await simulate(val);
              },
            },
            value: centralSimulated,
          } as ProfileItem,
        ]
        : []),
    ],
    [
      mode,
      centralSimulated,
      clear,
      clearLogs,
      clearClient,
      client,
      dark,
      simulate,
    ],
  );

  return (
    <View style={{ flex: 1, marginTop: insets.top, marginBottom: insets.bottom }}>
      <Stack.Navigator
        screenOptions={({ route }) => ({
          headerShown: false, // TODO: fix header
        })}>
        <Stack.Screen name="setting_root">
          {() => <Root items={items} colors={colors} dark={dark} />}
        </Stack.Screen>
        <Stack.Screen name="Registration" component={Registration} />
      </Stack.Navigator>
    </View>
  );
}

const RightElement = React.memo<{
  item: ProfileItem;
  colors: any;
  dark: boolean;
}>(({ item, colors, dark }) => {
  const [enabled, setEnabled] = useBoolean(item.value as boolean);
  if (item.action && item.action.type === 'switch') {
    return (
      <Switch
        value={enabled}
        onValueChange={() => {
          item.action?.fn();
          setEnabled.Toggle();
        }}
        {...(Platform.OS === 'android' && {
          thumbColor: item.value
            ? colors.primary
            : dark
              ? colors.text
              : colors.background,
          trackColor: { true: colors.border, false: colors.border },
        })}
      />
    );
  }
  return null;
});

const Root = React.memo<{ items: ProfileItem[]; colors: any; dark: boolean }>(
  ({ items, colors, dark }) => {
    const nav = useNavigation<any>();
    return (
      <ScrollView style={{ flex: 1 }}>
        {items.map((item, index) => (
          <ListItem
            key={`setting-${index}`}
            bottomDivider
            containerStyle={{ backgroundColor: colors.card }}
            onPress={
              item.action && item.action.type !== 'switch'
                ? item.action.fn.bind(null, nav)
                : undefined
            }>
            <Icon name={item.icon} type="ionicon" color={colors.text} />
            <ListItem.Content>
              <ListItem.Title style={{ color: colors.text }}>
                {item.title}
              </ListItem.Title>
              {item.subtitle && (
                <ListItem.Subtitle>{item.subtitle}</ListItem.Subtitle>
              )}
            </ListItem.Content>
            <RightElement item={item} colors={colors} dark={dark} />
            {item.action && item.action.type === 'expand' && (
              <ListItem.Chevron />
            )}
          </ListItem>
        ))}
      </ScrollView>
    );
  },
);
