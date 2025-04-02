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
  ScrollView, // Added ScrollView for form
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';
import { Database } from '../types/database.types'; // Assuming you have generated types

// Define the Vehicle type based on your schema
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

export default function ManageVehiclesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the "Add New Vehicle" form
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');

  // Fetch vehicles associated with the current user
  const fetchVehicles = useCallback(async () => {
    if (!user) {
      setError('User not authenticated.');
      setIsLoading(false);
      return;
    }

    console.log('Fetching vehicles for user:', user.id);
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('plate_number', { ascending: true });

      if (fetchError) {
        console.error('Error fetching vehicles:', fetchError);
        throw fetchError;
      }

      console.log('Fetched vehicles:', data);
      setVehicles(data || []);
    } catch (err: any) {
      setError(`Failed to load vehicles: ${err.message}`);
      setVehicles([]); // Clear vehicles on error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch vehicles when the component mounts or user changes
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Handle adding a new vehicle
  const handleAddVehicle = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to add a vehicle.');
      return;
    }
    if (!plateNumber.trim()) {
      Alert.alert('Error', 'Please enter the vehicle\'s plate number.');
      return;
    }
    // Basic validation for year if entered
    const parsedYear = parseInt(year, 10);
    if (year.trim() && (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > new Date().getFullYear() + 1)) {
      Alert.alert('Error', 'Please enter a valid year.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('vehicles')
        .insert({
          plate_number: plateNumber.trim().toUpperCase(), // Store plate numbers consistently
          type: type.trim() || null,
          make: make.trim() || null,
          model: model.trim() || null,
          year: year.trim() ? parsedYear : null,
          user_id: user.id,
          is_active: true, // Default to active
        });

      if (insertError) {
        console.error('Error inserting vehicle:', insertError);
        if (insertError.code === '23505') { // Unique violation code
             Alert.alert('Error', 'A vehicle with this plate number already exists.');
        } else {
            throw insertError;
        }
      } else {
        // Clear form and refresh list
        setPlateNumber('');
        setType('');
        setMake('');
        setModel('');
        setYear('');
        Alert.alert('Success', 'Vehicle added successfully.');
        await fetchVehicles(); // Refresh the list
      }
    } catch (err: any) {
      setError(`Failed to add vehicle: ${err.message}`);
      Alert.alert('Error', `Failed to add vehicle: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render item for the FlatList
  const renderVehicleItem = ({ item }: { item: Vehicle }) => (
    <View style={styles.vehicleItem}>
      <Text style={styles.vehiclePlate}>{item.plate_number}</Text>
      <Text style={styles.vehicleDetail}>Type: {item.type || 'N/A'}</Text>
      <Text style={styles.vehicleDetail}>Make/Model: {item.make || 'N/A'} / {item.model || 'N/A'}</Text>
      <Text style={styles.vehicleDetail}>Year: {item.year || 'N/A'}</Text>
      {/* Add Edit/Deactivate buttons here later if needed */}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
         behavior={Platform.OS === "ios" ? "padding" : "height"}
         style={styles.flexContainer}
      >
        <Text style={styles.headerTitle}>Manage Vehicles</Text>

        {/* Add Vehicle Form - Wrap in ScrollView if it might exceed screen height */}
        <ScrollView style={styles.formScrollView}>
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Add New Vehicle</Text>
              <TextInput
                  style={styles.input}
                  placeholder="Plate Number *"
                  value={plateNumber}
                  onChangeText={setPlateNumber}
                  autoCapitalize="characters"
              />
              <TextInput
                  style={styles.input}
                  placeholder="Type (e.g., Truck, Tanker)"
                  value={type}
                  onChangeText={setType}
                  autoCapitalize="words"
              />
              <TextInput
                  style={styles.input}
                  placeholder="Make"
                  value={make}
                  onChangeText={setMake}
                  autoCapitalize="words"
              />
              <TextInput
                  style={styles.input}
                  placeholder="Model"
                  value={model}
                  onChangeText={setModel}
                  autoCapitalize="words"
              />
              <TextInput
                  style={styles.input}
                  placeholder="Year"
                  value={year}
                  onChangeText={setYear}
                  keyboardType="number-pad"
                  maxLength={4}
              />
              <TouchableOpacity
                  style={[styles.button, isSubmitting && styles.buttonDisabled]}
                  onPress={handleAddVehicle}
                  disabled={isSubmitting}
              >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Add Vehicle</Text>
                  )}
              </TouchableOpacity>
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
        </ScrollView>


        {/* Vehicle List */}
        <View style={styles.listContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          ) : vehicles.length === 0 && !error ? (
            <Text style={styles.noDataText}>No vehicles found. Add one above.</Text>
          ) : (
            <FlatList
              data={vehicles}
              renderItem={renderVehicleItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.list}
              ListHeaderComponent={<Text style={styles.listTitle}>Your Vehicles</Text>}
            />
          )}
        </View>
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
    paddingTop: 16, // Adjusted padding
    paddingBottom: 8, // Adjusted padding
    color: '#343a40',
  },
  formScrollView: {
      // Takes up space needed for the form
      flexGrow: 0, // Don't let it grow excessively
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20, // Add padding at the bottom of the form section
    // No border needed if it's just above the list section
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
  listContainer: {
      flex: 1, // Takes up remaining space
      borderTopWidth: 1, // Add separator line
      borderTopColor: '#dee2e6',
      paddingTop: 10, // Space above list title
  },
  loader: {
    marginTop: 30,
  },
  list: {
    paddingHorizontal: 16,
  },
  listTitle: {
     fontSize: 18,
     fontWeight: '600',
     marginBottom: 12,
     color: '#495057',
     paddingHorizontal: 16, // Match list padding
  },
  vehicleItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  vehiclePlate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  vehicleDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#6c757d',
    paddingHorizontal: 16, // Match list padding
  },
}); 