import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';

type QuickAction = {
  title: string;
  icon: string;
  route: string;
  primary?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Start New Pickup', icon: '🚚', route: 'NewPickup', primary: true },
  { title: 'Document Load', icon: '📄', route: 'DocumentLoad' },
  { title: 'Report Issue', icon: '⚠️', route: 'ReportIssue' },
  { title: 'View Job Details', icon: '📋', route: 'JobDetails' },
];

export default function HomeScreen({ navigation }: any) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigation.replace('Auth');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Actions</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.route}
            style={[
              styles.actionButton,
              action.primary && styles.primaryButton,
            ]}
            onPress={() => navigation.navigate(action.route)}
          >
            <Text style={styles.actionIcon}>{action.icon}</Text>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  signOut: {
    color: '#007AFF',
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionButton: {
    width: '47%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 