import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface AudioSpeedControlProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
}

const SPEED_OPTIONS = [
  {value: 0.5, label: '0.5x'},
  {value: 0.75, label: '0.75x'},
  {value: 1.0, label: '1x'},
  {value: 1.25, label: '1.25x'},
  {value: 1.5, label: '1.5x'},
  {value: 1.75, label: '1.75x'},
  {value: 2.0, label: '2x'},
];

const AudioSpeedControl: React.FC<AudioSpeedControlProps> = ({
  currentSpeed,
  onSpeedChange,
  disabled = false,
}) => {
  const theme = useTheme();

  const handleSpeedPress = (speed: number) => {
    if (!disabled) {
      onSpeedChange(speed);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="speedometer" size={16} color={theme.colors.onSurface} />
        <Text style={[styles.headerText, {color: theme.colors.onSurface}]}>
          Playback Speed
        </Text>
      </View>

      <View style={styles.speedContainer}>
        {SPEED_OPTIONS.map(option => {
          const isActive = currentSpeed === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.speedButton,
                {
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: theme.colors.outline,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
              onPress={() => handleSpeedPress(option.value)}
              disabled={disabled}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.speedText,
                  {
                    color: isActive
                      ? theme.colors.onPrimary
                      : theme.colors.onSurface,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  speedContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
  },
  speedButton: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default AudioSpeedControl;
