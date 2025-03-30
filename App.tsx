import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView } from 'react-native';
import AuthScreen from './screens/AuthScreen';
import NewPickupScreen from './screens/NewPickupScreen';
import CreateJobScreen from './screens/CreateJobScreen';
import { AuthProvider, useAuth } from './contexts/AuthProvider';
import React from 'react';
import { supabase } from './lib/supabase';

// Define our navigation types
type RootStackParamList = {
  Auth: undefined;
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
  JobDetails: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Home screen component
function HomeScreen({ navigation }: any) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigation.replace('Auth');
  };

  const QUICK_ACTIONS = [
    { title: 'Start New Pickup', icon: '🚚', route: 'NewPickup', primary: true },
    { title: 'Create Job', icon: '📝', route: 'CreateJob', primary: true },
    { title: 'Document Load', icon: '📄', route: 'DocumentLoad' },
    { title: 'Report Issue', icon: '⚠️', route: 'ReportIssue' },
    { title: 'View Job Details', icon: '📋', route: 'JobDetails' },
  ];

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

// Details screen component
function DetailsScreen({ route }: any) {
  const { itemId } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Details Screen</Text>
      <Text>Item ID: {itemId}</Text>
    </View>
  );
}

function PlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Placeholder Screen</Text>
    </View>
  );
}

function Navigation() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session ? (
          <React.Fragment>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="CreateJob" 
              component={CreateJobScreen}
              options={{ 
                headerShown: true,
                headerTitle: "Create New Job",
                headerBackTitle: "Back"
              }} 
            />
            <Stack.Screen 
              name="NewPickup" 
              component={NewPickupScreen}
              options={{ 
                headerShown: true,
                headerTitle: "New Pickup",
                headerBackTitle: "Back"
              }} 
            />
            <Stack.Screen 
              name="PickupConfirmation" 
              component={PlaceholderScreen}
              options={{ 
                headerShown: true,
                headerTitle: "Confirmation",
                headerBackTitle: "Back"
              }} 
            />
            <Stack.Screen 
              name="DocumentLoad" 
              component={PlaceholderScreen}
              options={{ 
                headerShown: true,
                headerTitle: "Document Load",
                headerBackTitle: "Back"
              }} 
            />
            <Stack.Screen 
              name="ReportIssue" 
              component={PlaceholderScreen}
              options={{ 
                headerShown: true,
                headerTitle: "Report Issue",
                headerBackTitle: "Back"
              }} 
            />
            <Stack.Screen 
              name="JobDetails" 
              component={PlaceholderScreen}
              options={{ 
                headerShown: true,
                headerTitle: "Job Details",
                headerBackTitle: "Back"
              }} 
            />
          </React.Fragment>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
