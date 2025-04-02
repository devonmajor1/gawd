import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Alert, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthProvider';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons'; // Import icon sets
import { RootStackParamList } from '../App'; // <-- Import the type


type IconInfo = {
  library: keyof typeof IconLibraries; // Type restricting to imported libraries
  name: string;
};

type Action = {
  title: string;
  icon: IconInfo;
  screen?: keyof RootStackParamList; // Make screen optional, references keys from RootStackParamList
  fontFamily?: string; // Add optional font family name
};

// Define the components for easier lookup
const IconLibraries = {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
};

// Add the Admin action directly to the list for consistent styling
// We'll rely on navigation guards later to truly restrict access
const QUICK_ACTIONS: Action[] = [
  { title: 'Start New Pickup', icon: { library: 'MaterialIcons', name: 'local-shipping' }, screen: 'NewPickup', fontFamily: 'Oswald-Bold' },
  { title: 'Create New Job', icon: { library: 'MaterialIcons', name: 'add-circle-outline' }, screen: 'CreateJob', fontFamily: 'Oswald-Bold' },
  { title: 'View Active Jobs', icon: { library: 'FontAwesome5', name: 'list-alt' }, screen: 'ActiveJobs', fontFamily: 'Inter-Regular' },
  { title: 'Manage Drivers', icon: { library: 'MaterialIcons', name: 'people' }, screen: 'ManageDrivers' },
  { title: 'Manage Vehicles', icon: { library: 'FontAwesome5', name: 'truck' }, screen: 'ManageVehicles' },
  { title: 'Admin: Job Status', icon: { library: 'Ionicons', name: 'settings-outline' }, screen: 'AdminJobStatus', fontFamily: 'Inter-Regular' },
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
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    console.log("HomeScreen: Signing out...");
    try {
       await signOut();
       // Navigation should automatically switch to Auth screen via the listener in App.tsx
    } catch(error) {
        console.error("Sign out error in HomeScreen:", error);
        Alert.alert("Error", "Failed to sign out.");
    }
  };

  const handleActionPress = (screen: keyof RootStackParamList | undefined) => {
    if (screen) {
      console.log(`Navigating to: ${screen}`); // Add log
      navigation.navigate(screen);
    } else {
      Alert.alert("Coming Soon", "This feature is not yet implemented.");
    }
  };

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
          {QUICK_ACTIONS.map((action, index) => {
            const IconComponent = IconLibraries[action.icon.library];
            // Determine the font family to use, fallback to system default
            const titleFontFamily = action.fontFamily; // If undefined, default behavior applies

            return (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={() => handleActionPress(action.screen)}
              >
                <IconComponent name={action.icon.name as any} size={32} color="#007AFF" style={styles.actionIcon} />
                <Text style={[
                  styles.actionTitle,
                  // Conditionally apply fontFamily style
                  titleFontFamily ? { fontFamily: titleFontFamily } : {}
                ]}>
                  {action.title}
                </Text>
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
    paddingBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionTitle: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 8,
  },
  signOut: {
    color: '#007AFF',
    fontSize: 16,
  },
  titleHome: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionIcon: {
    marginRight: 12,
  },
}); 