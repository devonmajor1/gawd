import React, { useState } from 'react';
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
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ navigation }: any) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); // Start loading
    console.log('handleSubmit triggered. Mode:', mode);
    try {
      if (mode === 'signin') {
        console.log('Attempting sign in for:', email);
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          console.error('Sign In Error:', error);
          Alert.alert('Sign In Error', error.message);
        } else {
          console.log('Sign In successful (AuthProvider will handle navigation)');
          // Successful sign-in automatically triggers onAuthStateChange
          // which handles navigation in App.tsx via AuthProvider
          // No explicit navigation needed here if using AuthProvider
        }
      } else { // Sign Up mode
        console.log('Attempting sign up for:', email);

        // 1. Create the user in Supabase Auth
        console.log('Calling supabase.auth.signUp...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          // Options are useful if you want Supabase to handle the redirect
          // after email confirmation, but not strictly necessary for this flow.
          // options: {
          //   emailRedirectTo: 'yourapp://auth-callback', 
          // }
        });

        if (authError) {
          console.error('Supabase auth.signUp Error:', authError);
          Alert.alert('Sign Up Error', authError.message);
        } else if (authData.user) {
          console.log('supabase.auth.signUp successful. User created with ID:', authData.user.id);
          // IMPORTANT: Change the success message!
          Alert.alert(
            'Account Created',
            'Please check your email and click the confirmation link to activate your account. You can then sign in.'
          );

          // Clear fields after successful sign-up initiation
          setEmail('');
          setPassword('');
          // DO NOT switch mode automatically - let user see the message and sign in later
          // setMode('signin');
        } else {
          // Handle cases where user might be null even without error (less common)
          console.warn('Sign Up Warning: authData.user is null after sign up, check Supabase settings/logs.');
          Alert.alert('Sign Up Pending', 'Account process initiated. Please check your email for next steps.');
           setEmail('');
           setPassword('');
        }
      }
    } catch (error: any) {
      console.error('Unexpected error in handleSubmit:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      console.log('handleSubmit finished.');
      setLoading(false); // Stop loading regardless of outcome
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          disabled={loading}
        >
          <Text style={styles.switchText}>
            {mode === 'signin' 
              ? "Don't have an account? Sign Up" 
              : "Already have an account? Sign In"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  form: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
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
  switchText: {
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
}); 