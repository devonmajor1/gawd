import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons'; // Import icon sets

type IconInfo = {
  library: keyof typeof IconLibraries; // Type restricting to imported libraries
  name: string;
};

type QuickAction = {
  title: string;
  icon: IconInfo; // Use the new IconInfo type
  route: string;
  primary?: boolean;
};

// Define the components for easier lookup
const IconLibraries = {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
};

// Add the Admin action directly to the list for consistent styling
// We'll rely on navigation guards later to truly restrict access
const QUICK_ACTIONS: QuickAction[] = [
  { 
    title: 'Start New Pickup', 
    icon: { library: 'FontAwesome5', name: 'truck' }, 
    route: 'NewPickup', 
    primary: true 
  },
  { 
    title: 'Create Job', 
    icon: { library: 'MaterialIcons', name: 'add-circle-outline' }, 
    route: 'CreateJob', 
    primary: true 
  },
  { 
    title: 'Document Load', 
    icon: { library: 'Ionicons', name: 'document-text-outline' }, 
    route: 'DocumentLoad' 
  },
  { 
    title: 'Report Issue', 
    icon: { library: 'MaterialIcons', name: 'report-problem' }, 
    route: 'ReportIssue' 
  },
  { 
    title: 'View Job Details', 
    icon: { library: 'Ionicons', name: 'list-outline' }, 
    route: 'JobDetails' 
  },
  // Add Admin action here
  { 
    title: 'Manage Job Status', 
    icon: { library: 'MaterialIcons', name: 'admin-panel-settings' }, 
    route: 'AdminJobStatus', 
    // primary: false // Explicitly not primary
  },
];

// Helper function to render the correct icon
const renderIcon = (iconInfo: IconInfo, size: number, color: string) => {
  const IconComponent = IconLibraries[iconInfo.library];
  if (!IconComponent) {
    return <FontAwesome5 name="question-circle" size={size} color={color} />; // Fallback icon
  }
  return <IconComponent name={iconInfo.name} size={size} color={color} />;
};

export default function HomeScreen({ navigation }: any) {
  // Uncomment this when ready to implement real admin checks
  // const { isAdmin } = useAuth(); 

  const handleSignOut = async () => {
    console.log("HomeScreen: Signing out...");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("HomeScreen: Sign out error", error);
      Alert.alert("Error", "Failed to sign out.");
    }
    // AuthProvider's onAuthStateChange will handle navigation update
  };

  // Function to manually update profile to ensure column exists
  // Removed fixProfiles function for brevity, assume it exists if needed

  return (
    <SafeAreaView style={styles.containerHome}>
      <View style={styles.header}>
        <Text style={styles.titleHome}>Quick Actions</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.grid}>
          {QUICK_ACTIONS.map((action) => {
            // Determine color - maybe admin has a different non-primary color?
            const iconColor = action.primary ? '#007AFF' : '#495057'; 
            return (
              <TouchableOpacity
                key={action.route}
                style={[
                  styles.actionButton,
                  action.primary && styles.primaryButton, // Admin button won't get this style
                ]}
                onPress={() => navigation.navigate(action.route)}
              >
                {renderIcon(action.icon, 32, iconColor)}
                <Text style={styles.actionTitle}>{action.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles adjustments
const styles = StyleSheet.create({
  containerHome: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    width: '48%',
    minHeight: 120,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#e7f3ff',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  actionTitle: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8, // Add some margin between icon and text
  },
  signOut: {
    color: '#007AFF',
    fontSize: 16,
  },
  titleHome: {
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 