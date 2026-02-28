import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import {perfMonitor} from '../utils/performanceMonitor';

const PerformanceDashboard: React.FC = () => {
  const [measures, setMeasures] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!__DEV__) {
      return;
    }

    const unsubscribe = perfMonitor.subscribe(() => {
      setMeasures(perfMonitor.getMeasures());
    });
    setMeasures(perfMonitor.getMeasures());

    return unsubscribe;
  }, []);

  if (!__DEV__) {
    return null;
  }

  const entries = Object.entries(measures).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <View style={styles.container} pointerEvents="none" testID="perf-dashboard">
      <Text style={styles.title}>Startup Perf</Text>
      {entries.length === 0 ? (
        <Text style={styles.item}>No measures yet</Text>
      ) : (
        entries.map(([name, duration]) => (
          <Text key={name} style={styles.item}>
            {name}: {duration}ms
          </Text>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    maxWidth: 240,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  title: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  item: {
    color: '#d1fae5',
    fontSize: 11,
    marginBottom: 2,
  },
});

export default PerformanceDashboard;
