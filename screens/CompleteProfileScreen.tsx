import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider'; // Import useAuth
import { SUPABASE_URL } from '@env';  // Import SUPABASE_URL from environment

export default function CompleteProfileScreen() {
  const { session, profile, refreshProfile } = useAuth(); // Get session and refreshProfile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill if profile data already exists (e.g., user navigated back)
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }
  }, [profile]);

  const handleCompleteProfile = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to complete your profile.');
      return;
    }
    if (!firstName || !lastName) {
      Alert.alert('Error', 'Please enter both first and last name.');
      return;
    }

    setLoading(true);
    try {
      const updates = {
        id: session.user.id, // Ensure the user ID is included for upsert
        first_name: firstName,
        last_name: lastName,
        completed_profile: true, // Set flag to indicate profile was completed
        updated_at: new Date().toISOString(), // Keep track of updates
      };

      console.log('Attempting to upsert profile:', updates);
      
      // Debug: Log Supabase URL and auth status (without revealing keys)
      console.log(`Using Supabase URL: ${SUPABASE_URL?.substring(0, 20)}...`);
      console.log(`Auth status: User ID ${session.user.id}, Session expires: ${session.expires_at}`);

      // Try a simpler approach first - direct insert with onConflict parameter
      console.log('Trying direct insert with onConflict...');
      const { data: insertData, error: insertError } = await supabase
        .from('profiles')
        .insert(updates)
        .select();

      if (insertError) {
        console.error('Error inserting profile:', insertError);
        
        // If insert fails, fall back to upsert
        console.log('Insert failed, falling back to upsert...');
        const { error: upsertError } = await supabase.from('profiles').upsert(updates, {
          onConflict: 'id'
        });

        if (upsertError) {
          console.error('Error upserting profile:', upsertError);
          
          // If upsert fails too, try a simple update as last resort
          console.log('Upsert failed, trying simple update...');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              first_name: firstName,
              last_name: lastName,
              completed_profile: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.user.id);
            
          if (updateError) {
            console.error('All methods failed. Final error:', updateError);
            Alert.alert('Error', `Failed to save profile after multiple attempts: ${updateError.message}`);
            return;
          } else {
            console.log('Update succeeded as fallback!');
          }
        } else {
          console.log('Upsert succeeded as fallback!');
        }
      } else {
        console.log('Insert with onConflict succeeded!', insertData);
      }
      
      // If we got here, one of the methods worked
      console.log('Profile saved successfully via one of the methods');
      
      // Immediately mark as completed in localStorage (don't wait for AsyncStorage)
      try {
        await AsyncStorage.setItem(`profile_completed_${session.user.id}`, 'true');
        console.log('Set localStorage flag for completed profile');
      } catch (storageErr) {
        console.error('Failed to set localStorage flag:', storageErr);
        // Continue anyway, as the database update was successful
      }
      
      Alert.alert('Success', 'Profile saved successfully!');
      // Refresh the profile state in AuthProvider
      if (refreshProfile) {
         await refreshProfile();
      }
      // Navigation will happen automatically in App.tsx based on the updated profile state
    } catch (error: any) {
      console.error('Unexpected error completing profile:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Debug function to bypass this screen (useful if the database column is missing)
  const forceBypass = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to use this function.');
      return;
    }

    setLoading(true);
    try {
      // Only set the minimum required fields
      const updates = {
        id: session.user.id,
        first_name: firstName || 'Debug',
        last_name: lastName || 'User',
        completed_profile: true, // This is the key to bypass
        updated_at: new Date().toISOString(),
      };

      console.log('DEBUG: Forcing bypass with profile:', updates);

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        console.error('Error in force bypass:', error);
        Alert.alert('Error', `Debug bypass failed: ${error.message}`);
      } else {
        console.log('DEBUG: Bypass successful');
        
        // Set localStorage flag immediately
        try {
          await AsyncStorage.setItem(`profile_completed_${session.user.id}`, 'true');
          console.log('DEBUG: Set localStorage flag for completed profile');
        } catch (storageErr) {
          console.error('DEBUG: Failed to set localStorage flag:', storageErr);
          // Continue anyway since the DB update worked
        }
        
        Alert.alert('Success', 'Profile bypass successful. You should proceed to main app.');
        // Refresh the profile state
        if (refreshProfile) {
          await refreshProfile();
        }
      }
    } catch (error: any) {
      console.error('Unexpected error in force bypass:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Diagnostic function to test Supabase connection and table structure
  const runDiagnostics = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to run diagnostics.');
      return;
    }

    setLoading(true);
    try {
      console.log('DIAGNOSTICS: Starting Supabase connection test...');
      
      // Test 1: Check if we can reach Supabase at all
      try {
        console.log('DIAGNOSTICS: Testing connection to Supabase...');
        const { data: versionData, error: versionError } = await supabase.from('profiles').select('count').limit(1);
        
        if (versionError) {
          console.error('DIAGNOSTICS: Connection test failed:', versionError);
          Alert.alert('Diagnostics', `Connection test failed: ${versionError.message}`);
        } else {
          console.log('DIAGNOSTICS: Connection test successful:', versionData);
          Alert.alert('Diagnostics', 'Connection to Supabase successful! ✅');
        }
      } catch (e: any) {
        console.error('DIAGNOSTICS: Unexpected error in connection test:', e);
        Alert.alert('Diagnostics', `Connection test failed with exception: ${e.message}`);
      }
      
      // Test 2: Check if we can access the profiles table
      try {
        console.log('DIAGNOSTICS: Testing profiles table access...');
        // Try to get the user's profile specifically
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError && profileError.code !== 'PGRST116') { // Not found is ok
          console.error('DIAGNOSTICS: Profiles table test failed:', profileError);
          Alert.alert('Diagnostics', `Profiles table test failed: ${profileError.message}`);
          
          // Check if it's a permission issue
          if (profileError.message.includes('permission') || profileError.code === '42501') {
            Alert.alert('Permission Issue', 'Your Supabase permissions may not be configured correctly for the profiles table.');
          }
          
          // Check if it's a table missing issue
          if (profileError.message.includes('does not exist') || profileError.code === '42P01') {
            Alert.alert('Missing Table', 'The "profiles" table does not exist in your Supabase database.');
          }
        } else {
          console.log('DIAGNOSTICS: Profiles table test result:', profileData || 'No profile found (expected for new users)');
          Alert.alert('Diagnostics', profileData 
            ? 'Profile found in database! ✅' 
            : 'No profile found, but can access the table (normal for new users) ✅');
        }
      } catch (e: any) {
        console.error('DIAGNOSTICS: Unexpected error in profiles table test:', e);
        Alert.alert('Diagnostics', `Profiles table test failed with exception: ${e.message}`);
      }
      
      // Test 3: Try a direct insert (for debugging only)
      try {
        console.log('DIAGNOSTICS: Testing direct insert to profiles table...');
        const testData = {
          id: session.user.id,
          first_name: 'Test',
          last_name: 'User',
          test_field: 'Diagnostic run at ' + new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Try to insert with .insert() to see if it's an issue with .upsert()
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert(testData)
          .select();
          
        if (insertError) {
          // If duplicate key, that's expected - the user might already have a profile
          if (insertError.code === '23505') { // Duplicate key error
            console.log('DIAGNOSTICS: Insert failed with duplicate key (expected if profile exists):', insertError);
            Alert.alert('Diagnostics', 'Insert test failed with duplicate key (this is normal if your profile already exists). Try update test instead.');
            
            // Try an update instead
            console.log('DIAGNOSTICS: Testing direct update to profiles table...');
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ test_field: 'Update test at ' + new Date().toISOString() })
              .eq('id', session.user.id);
              
            if (updateError) {
              console.error('DIAGNOSTICS: Update test failed:', updateError);
              Alert.alert('Diagnostics', `Update test failed: ${updateError.message}`);
            } else {
              console.log('DIAGNOSTICS: Update test successful');
              Alert.alert('Diagnostics', 'Update test successful! ✅');
            }
          } else {
            console.error('DIAGNOSTICS: Insert test failed:', insertError);
            Alert.alert('Diagnostics', `Insert test failed: ${insertError.message}`);
          }
        } else {
          console.log('DIAGNOSTICS: Insert test successful:', insertData);
          Alert.alert('Diagnostics', 'Insert test successful! ✅');
        }
      } catch (e: any) {
        console.error('DIAGNOSTICS: Unexpected error in insert test:', e);
        Alert.alert('Diagnostics', `Insert test failed with exception: ${e.message}`);
      }
      
    } catch (error: any) {
      console.error('DIAGNOSTICS: Overall test error:', error);
      Alert.alert('Diagnostics Error', error.message || 'An unexpected error occurred in diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.form}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>Please enter your name to continue.</Text>

            <TextInput
                style={styles.input}
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete='name-given' // Use appropriate autocomplete hints
            />
            <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete='name-family' // Use appropriate autocomplete hints
            />

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCompleteProfile}
                disabled={loading}
            >
                {loading ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text style={styles.buttonText}>Save Profile</Text>
                )}
            </TouchableOpacity>
            
            {/* Debug button to bypass the profile screen */}
            <TouchableOpacity
                style={[styles.debugButton, loading && styles.buttonDisabled]}
                onPress={forceBypass}
                disabled={loading}
            >
                <Text style={styles.debugButtonText}>Debug: Force Bypass</Text>
            </TouchableOpacity>
            
            {/* Diagnostics button */}
            <TouchableOpacity
                style={[styles.diagnosticsButton, loading && styles.buttonDisabled]}
                onPress={runDiagnostics}
                disabled={loading}
            >
                <Text style={styles.debugButtonText}>Run Diagnostics</Text>
            </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Add styles similar to AuthScreen or create new ones
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'center', // Center form vertically
  },
  form: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10, // Reduced margin
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#f9f9f9', // Slightly different background for inputs
  },
  button: {
    height: 48,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  debugButton: {
    height: 48,
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  diagnosticsButton: {
    height: 48,
    backgroundColor: '#5856d6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 