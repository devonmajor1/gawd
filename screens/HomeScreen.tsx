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

// --- Define Screen Permissions ---
// Map Screen names (keys from RootStackParamList) to allowed roles
const screenPermissions: { [key in keyof RootStackParamList]?: string[] } = {
  'NewPickup': ['driver'], // Only drivers can start a new pickup
  'CreateJob': ['admin', 'manager'], // Only admin/manager can create jobs
  'ActiveJobs': ['admin', 'manager', 'driver'], // All these roles can view active jobs
  'PickupList': ['admin', 'manager', 'driver'], // All these roles can view history
  'ManageDrivers': ['admin', 'manager'], // Only admin/manager can manage drivers
  'ManageVehicles': ['admin', 'manager'], // Only admin/manager can manage vehicles
  'AdminJobStatus': ['admin'], // Only admin can access this
  // Add other screens from RootStackParamList if they need specific permissions
  // Screens not listed here (like 'Home', 'Auth', 'ProfileSetup') are implicitly accessible
  // Or you can define a default policy (e.g., deny all not listed).
};

// List of all possible actions
const ALL_QUICK_ACTIONS: Action[] = [
  { title: 'Start New Pickup', icon: { library: 'MaterialIcons', name: 'local-shipping' }, screen: 'NewPickup', fontFamily: 'Oswald-Bold' },
  { title: 'Create New Job', icon: { library: 'MaterialIcons', name: 'add-circle-outline' }, screen: 'CreateJob', fontFamily: 'Oswald-Bold' },
  { title: 'View Active Jobs', icon: { library: 'FontAwesome5', name: 'list-alt' }, screen: 'ActiveJobs', fontFamily: 'Inter-Regular' },
  { title: 'View Pickup History', icon: { library: 'FontAwesome5', name: 'history' }, screen: 'PickupList' },
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
  const { user, role, signOut } = useAuth();

  // --- Helper Function to Check Access ---
  const canAccess = (screenName: keyof RootStackParamList | undefined): boolean => {
    // If the action doesn't navigate anywhere, allow it (or handle differently)
    if (!screenName) return true;
    // If the screen isn't in our permissions list, default to accessible (change if needed)
    if (!screenPermissions[screenName]) return true;
    // If no role, deny access to protected screens
    if (!role) return false;
    // Check if the user's role is included in the allowed roles for this screen
    return screenPermissions[screenName]?.includes(role) ?? false;
  };

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

  // --- Filter actions based on role BEFORE rendering ---
  const accessibleActions = ALL_QUICK_ACTIONS.filter(action => canAccess(action.screen));

  return (
    <SafeAreaView style={styles.containerHome}>
      <View style={styles.header}>
        {/* Display role for debugging/info */}
        <Text style={styles.roleText}>Role: {role || 'None'}</Text>
        <Text style={styles.titleHome}>Quick Actions</Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOut}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.grid}>
          {accessibleActions.map((action, index) => {
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
           {/* Optional: Show message if no actions are available */}
           {accessibleActions.length === 0 && (
             <Text style={styles.noActionsText}>No actions available for your role.</Text>
           )}
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
    paddingHorizontal: 16,
    paddingVertical: 10, // Adjust padding if needed
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
    textAlign: 'center', // Center title if role text pushes it
    flex: 1, // Allow title to take space
  },
  actionIcon: {
    // marginRight: 12,
  },
  roleText: { // Added style for displaying role
     fontSize: 12,
     color: '#6c757d',
     position: 'absolute', // Position it if needed, or keep inline
     left: 16,
     bottom: -15, // Adjust position
  },
  noActionsText: { // Added style
     width: '100%',
     textAlign: 'center',
     marginTop: 30,
     fontSize: 16,
     color: '#6c757d',
  }
}); 