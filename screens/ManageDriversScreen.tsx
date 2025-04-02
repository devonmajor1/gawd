import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';
import { Database } from '../types/database.types'; // Assuming you have generated types

// Define the Driver type based on your schema
type Driver = Database['public']['Tables']['drivers']['Row'];

export default function ManageDriversScreen({ navigation }: any) {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the "Add New Driver" form
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Fetch drivers associated with the current user
  const fetchDrivers = useCallback(async () => {
    if (!user) {
      setError('User not authenticated.');
      setIsLoading(false);
      return;
    }

    console.log('Fetching drivers for user:', user.id);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (fetchError) {
        console.error('Error fetching drivers:', fetchError);
        throw fetchError;
      }

      console.log('Fetched drivers:', data);
      setDrivers(data || []);
    } catch (err: any) {
      setError(`Failed to load drivers: ${err.message}`);
      setDrivers([]); // Clear drivers on error
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Dependency: re-run if user changes

  // Fetch drivers when the component mounts or user changes
  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]); // fetchDrivers is stable due to useCallback

  // Handle adding a new driver
  const handleAddDriver = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a driver.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter the driver\'s name.');
      return;
    }
     if (!licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter the driver\'s license number.');
      return;
    }
    // Add more validation as needed (e.g., phone format)

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('drivers')
        .insert({
          name: name.trim(),
          license_number: licenseNumber.trim(),
          phone_number: phoneNumber.trim() || null, // Allow empty phone number
          user_id: user.id,
          is_active: true, // Default to active
        });

      if (insertError) {
        console.error('Error inserting driver:', insertError);
        // Check for unique constraint violation (example for PostgreSQL)
        if (insertError.code === '23505') { // Unique violation code
             Alert.alert('Error', 'A driver with this license number already exists.');
        } else {
            throw insertError;
        }
      } else {
        // Clear form and refresh list
        setName('');
        setLicenseNumber('');
        setPhoneNumber('');
        Alert.alert('Success', 'Driver added successfully.');
        await fetchDrivers(); // Refresh the list
      }
    } catch (err: any) {
      setError(`Failed to add driver: ${err.message}`);
      Alert.alert('Error', `Failed to add driver: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render item for the FlatList
  const renderDriverItem = ({ item }: { item: Driver }) => (
    <View style={styles.driverItem}>
      <Text style={styles.driverName}>{item.name}</Text>
      <Text style={styles.driverDetail}>License: {item.license_number || 'N/A'}</Text>
      <Text style={styles.driverDetail}>Phone: {item.phone_number || 'N/A'}</Text>
      {/* Add Edit/Deactivate buttons here later if needed */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
         behavior={Platform.OS === "ios" ? "padding" : "height"}
         style={styles.flexContainer}
      >
        <Text style={styles.headerTitle}>Manage Drivers</Text>

        {/* Add Driver Form */}
        <View style={styles.formContainer}>
           <Text style={styles.formTitle}>Add New Driver</Text>
           <TextInput
              style={styles.input}
              placeholder="Driver Name *"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
           />
           <TextInput
              style={styles.input}
              placeholder="License Number *"
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              autoCapitalize="characters" // Common for license plates/numbers
           />
           <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
           />
           <TouchableOpacity
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleAddDriver}
              disabled={isSubmitting}
           >
              {isSubmitting ? (
                 <ActivityIndicator color="#fff" />
              ) : (
                 <Text style={styles.buttonText}>Add Driver</Text>
              )}
           </TouchableOpacity>
           {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {/* Driver List */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : drivers.length === 0 && !error ? (
          <Text style={styles.noDataText}>No drivers found. Add one above.</Text>
        ) : (
          <FlatList
            data={drivers}
            renderItem={renderDriverItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            ListHeaderComponent={<Text style={styles.listTitle}>Your Drivers</Text>}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  flexContainer: {
     flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#343a40',
  },
  formContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    paddingBottom: 20,
  },
  formTitle: {
     fontSize: 18,
     fontWeight: '600',
     marginBottom: 12,
     color: '#495057',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorText: {
    color: '#dc3545',
    marginTop: 10,
    textAlign: 'center',
  },
  loader: {
    marginTop: 30,
  },
  list: {
    flex: 1, // Take remaining space
    paddingHorizontal: 16,
  },
  listTitle: {
     fontSize: 18,
     fontWeight: '600',
     marginBottom: 12,
     color: '#495057',
  },
  driverItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  driverDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#6c757d',
  },
}); 