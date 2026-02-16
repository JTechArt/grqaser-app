import React from 'react';
import {View, StyleSheet} from 'react-native';
import {List, RadioButton, useTheme} from 'react-native-paper';
import {useSelector, useDispatch} from 'react-redux';
import type {RootState} from '../state';
import {updatePreferences} from '../state/slices/userSlice';
import {setThemePreference} from '../services/preferencesStorage';
import type {ThemeMode} from '../theme';

const THEME_OPTIONS: {value: ThemeMode; label: string}[] = [
  {value: 'light', label: 'Light'},
  {value: 'dark', label: 'Dark'},
  {value: 'auto', label: 'System (auto)'},
];

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const themeMode = useSelector((s: RootState) => s.user.preferences.theme);

  const handleThemeChange = (value: ThemeMode) => {
    dispatch(updatePreferences({theme: value}));
    setThemePreference(value).catch(() => {});
  };

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <List.Section>
        <List.Subheader>Appearance</List.Subheader>
        <RadioButton.Group
          onValueChange={v => handleThemeChange(v as ThemeMode)}
          value={themeMode}>
          {THEME_OPTIONS.map(opt => (
            <RadioButton.Item
              key={opt.value}
              label={opt.label}
              value={opt.value}
              color={theme.colors.primary}
            />
          ))}
        </RadioButton.Group>
      </List.Section>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
});

export default SettingsScreen;
