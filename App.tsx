import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthScreen from './screens/AuthScreen';
import NewPickupScreen from './screens/NewPickupScreen';
import CreateJobScreen from './screens/CreateJobScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import AdminJobStatusScreen from './screens/AdminJobStatusScreen';
import HomeScreen from './screens/HomeScreen';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import ManageDriversScreen from './screens/ManageDriversScreen';
import ManageVehiclesScreen from './screens/ManageVehiclesScreen';
import ActiveJobsScreen from './screens/ActiveJobsScreen';
import { useFonts } from 'expo-font';

// Define AND export our navigation types
export type RootStackParamList = {
  Auth: undefined;
  CompleteProfile: undefined;
  Home: undefined;
  Details: { itemId: number };
  NewPickup: undefined;
  CreateJob: undefined;
  PickupConfirmation: {
    details: {
      pickupLocation: string;
      contactName: string;
      contactPhone: string;
      itemDescription: string;
      specialInstructions: string;
    };
  };
  DocumentLoad: undefined;
  ReportIssue: undefined;
  JobDetails: { jobId: string };
  AdminJobStatus: undefined;
  ManageDrivers: undefined;
  ManageVehicles: undefined;
  ActiveJobs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Details screen component
function DetailsScreen({ route }: any) {
  const { itemId } = route.params;
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>Details Screen</Text>
      <Text>Item ID: {itemId}</Text>
    </View>
  );
}

// Generic Placeholder Screen 
function PlaceholderScreen({route}: any) {
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>{route.name}</Text>
    </View>
  );
}

function Navigation() {
  // Get state from AuthProvider
  const { session, user, profile, loading, refreshProfile } = useAuth();
  const [hasCompletedProfileBefore, setHasCompletedProfileBefore] = useState<boolean>(false);
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);

  // Set a timeout to force proceed to main screen if loading takes too long
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading && session) {
      // If we've been loading for more than 3 seconds with a valid session,
      // assume the profile should be complete and proceed to main screen
      timeoutId = setTimeout(() => {
        console.log('Navigation: Loading timeout exceeded, forcing proceed to main screen');
        setLoadingTimeout(true);
      }, 3000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, session]);

  // Determine if profile exists and has been completed before
  // This check runs AFTER session is confirmed
  // If completed_profile flag exists, use it, otherwise fall back to checking first/last name
  // This handles both new users with the flag and existing users who completed their profile before the flag was added
  const hasCompletedProfile = !!profile?.completed_profile;
  const hasFirstLastName = !!profile?.first_name && !!profile?.last_name;
  const isProfileComplete = hasCompletedProfile || hasFirstLastName || hasCompletedProfileBefore || loadingTimeout;

  console.log(`Navigation Check: Loading=${loading}, Session=${!!session}, User=${!!user}, ProfileComplete=${isProfileComplete}, HasNames=${hasFirstLastName}, CompletedProfileFlag=${hasCompletedProfile}, StoredFlag=${hasCompletedProfileBefore}, TimeoutOverride=${loadingTimeout}`);

  // Check local storage for completed profile flag on initial render
  useEffect(() => {
    const checkStoredProfileCompletion = async () => {
      if (session?.user && !isProfileComplete) { // Only check if not already complete
        try {
          const storedValue = await AsyncStorage.getItem(`profile_completed_${session.user.id}`);
          if (storedValue === 'true') {
            console.log('Navigation: Found stored profile completion flag');
            setHasCompletedProfileBefore(true);
          }
        } catch (error) {
          console.error('Error checking stored profile completion:', error);
        }
      }
    };
    
    checkStoredProfileCompletion();
  }, [session, isProfileComplete]); // Added isProfileComplete dependency

  // When profile is detected as complete, store that in AsyncStorage
  useEffect(() => {
    const storeProfileCompletion = async () => {
      if (session?.user && (hasCompletedProfile || hasFirstLastName) && !hasCompletedProfileBefore) {
        try {
          console.log('Navigation: Storing profile completion flag');
          await AsyncStorage.setItem(`profile_completed_${session.user.id}`, 'true');
          setHasCompletedProfileBefore(true); // Update local state too
        } catch (error) {
          console.error('Error storing profile completion:', error);
        }
      }
    };
    
    storeProfileCompletion();
  }, [session, hasCompletedProfile, hasFirstLastName, hasCompletedProfileBefore]); // Added hasCompletedProfileBefore

  // Auto-update existing profiles that have names but don't have the completed_profile flag
  useEffect(() => {
    const updateExistingProfile = async () => {
      // Only run for authenticated users with a profile that has names but no completed_profile flag
      if (session?.user && profile && hasFirstLastName && !hasCompletedProfile) {
        console.log('Navigation: Updating existing profile to set completed_profile flag');
        
        try {
          const { error } = await supabase.from('profiles').update({ 
            completed_profile: true,
            updated_at: new Date().toISOString()
          }).eq('id', session.user.id);
          
          if (error) {
            console.error('Error updating existing profile:', error);
          } else {
            console.log('Successfully updated existing profile with completed_profile flag');
            // We don't need to refresh the profile immediately - just set the local flag
            // This avoids a redundant database call that would slow down loading
            setHasCompletedProfileBefore(true);
            
            // Refresh the profile in the background after a small delay
            setTimeout(() => {
              refreshProfile?.();
            }, 500);
          }
        } catch (err) {
          console.error('Unexpected error updating profile:', err);
        }
      }
    };
    
    updateExistingProfile();
  }, [session, profile, hasFirstLastName, hasCompletedProfile, refreshProfile]);

  // Show loading indicator while AuthProvider is initializing
  // But don't show it for more than 5 seconds
  const [showLoadingTooLong, setShowLoadingTooLong] = useState(false);
  
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (loading) {
      timeoutId = setTimeout(() => {
        setShowLoadingTooLong(true);
      }, 5000);
    } else {
      setShowLoadingTooLong(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);
  
  if (loading && !showLoadingTooLong) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  
  // If loading takes too long, show a message but proceed with navigation
  if (loading && showLoadingTooLong) {
    // Display a brief loading message but continue with navigation
    Alert.alert(
      "Still Working", 
      "Taking longer than expected, but you can continue using the app.",
      [{ text: "OK" }]
    );
    // Fall through to navigation logic
  }

  // Determine which stack of screens to show
  let stackToShow;
  if (session && user) {
    // User is logged in (session exists)
    if (isProfileComplete) {
      // Logged in AND profile is complete -> Show Main App
      console.log("Navigation: Rendering Main App Stack");
      stackToShow = (
        <React.Fragment>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CreateJob" component={CreateJobScreen} options={{ headerShown: true, headerTitle: "Create New Job", headerBackTitle: "Back" }} />
          <Stack.Screen name="NewPickup" component={NewPickupScreen} options={{ headerShown: true, headerTitle: "New Pickup", headerBackTitle: "Back" }} />
          <Stack.Screen name="ManageDrivers" component={ManageDriversScreen} options={{ headerShown: true, headerTitle: "Manage Drivers", headerBackTitle: "Back" }} />
          <Stack.Screen name="ManageVehicles" component={ManageVehiclesScreen} options={{ headerShown: true, headerTitle: "Manage Vehicles", headerBackTitle: "Back" }} />
          <Stack.Screen name="PickupConfirmation" component={PlaceholderScreen} options={{ headerShown: true, headerTitle: "Confirmation", headerBackTitle: "Back" }} />
          <Stack.Screen name="DocumentLoad" component={PlaceholderScreen} options={{ headerShown: true, headerTitle: "Document Load", headerBackTitle: "Back" }} />
          <Stack.Screen name="ReportIssue" component={PlaceholderScreen} options={{ headerShown: true, headerTitle: "Report Issue", headerBackTitle: "Back" }} />
          <Stack.Screen name="ActiveJobs" component={ActiveJobsScreen} options={{ headerShown: true, headerTitle: "Active Jobs", headerBackTitle: "Back" }} />
          <Stack.Screen name="JobDetails" component={PlaceholderScreen} options={{ headerShown: true, headerTitle: "Job Details", headerBackTitle: "Back" }} />
          
          
          {/* Always include Admin screen for testing */}
          {/* {isAdmin && ( */} 
            <Stack.Screen 
              name="AdminJobStatus" 
              component={AdminJobStatusScreen} 
              options={{ headerShown: true, headerTitle: "Admin: Job Status", headerBackTitle: "Back" }}
            />
          {/* )} */}
        </React.Fragment>
      );
    } else {
      // Logged in BUT profile is INCOMPLETE -> Show Complete Profile Screen
      console.log("Navigation: Rendering Complete Profile Screen");
      stackToShow = (
        <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ headerShown: false }} />
      );
    }
  } else {
    // No session OR no user -> Show Auth Screen
    console.log("Navigation: Rendering Auth Screen");
    stackToShow = (
      <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {stackToShow}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Load custom fonts
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'), // Verify this path/file exists
    'Oswald-Bold': require('./assets/fonts/Oswald-Bold.ttf'),   // Verify this path/file exists
  });

  // Optional: Log font loading errors
  useEffect(() => {
    if (fontError) {
      console.error("Font Loading Error:", fontError);
      // You might want to display an error message to the user
    }
  }, [fontError]);

  // Render loading indicator or null while fonts are loading
  if (!fontsLoaded && !fontError) {
     // Optionally return a dedicated loading screen component like AppLoading
     // Or a simple ActivityIndicator
    return (
       <View style={appStyles.loadingContainer}>
          <ActivityIndicator size="large" />
       </View>
    );
    // Or return null; but this might cause a flicker
  }

  // Fonts are loaded (or errored out), render the main app
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  containerCenter: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerHome: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  titleHome: {
    fontSize: 24,
    fontWeight: 'bold',
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
  signOut: {
    color: '#007AFF',
    fontSize: 16,
  },
  grid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    aspectRatio: 1,
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
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  developerTools: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  developerButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  developerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const appStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
