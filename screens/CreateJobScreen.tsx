import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';

// Types based on the database schema
type JobDetails = {
  title: string;
  description: string;
  // Generator information - Updated
  generator_company_name: string; // Added
  generator_contact_name: string;
  generator_telephone: string;
  generator_email: string;
  generator_address: string;      // Added
  generator_city: string;         // Added
  generator_province: string;     // Added
  generator_postal_code: string;  // Added
  // Soil Quality Contact Info - Added
  generator_soil_quality_contact_name: string;
  generator_soil_quality_contact_tel: string;
  generator_soil_quality_contact_email: string;
  // Pickup location
  pickup_address: string;
  pickup_city: string;
  pickup_province: string;
  pickup_postal_code: string;
  pickup_latitude: string;
  pickup_longitude: string;
  // Receiver information
  receiver_company_name: string;
  receiver_address: string;
  receiver_city: string;
  receiver_province: string;
  receiver_postal_code: string;
};

export default function CreateJobScreen({ navigation }: any) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Test database connection when component mounts
  useEffect(() => {
    const testDatabaseConnection = async () => {
      try {
        console.log('Testing database connection...');
        const { data, error } = await supabase.from('jobs').select('id').limit(1);
        
        if (error) {
          console.error('Database connection test failed:', error);
          setConnectionError(error.message);
        } else {
          console.log('Database connection successful');
          setConnectionError(null);
        }
      } catch (err: any) {
        console.error('Exception during database connection test:', err);
        setConnectionError(err.message || 'Unknown database connection error');
      }
    };
    
    testDatabaseConnection();
  }, []);
  
  const [jobDetails, setJobDetails] = useState<JobDetails>({
    title: '',
    description: '',
    // Generator information - Updated
    generator_company_name: '', // Added
    generator_contact_name: '',
    generator_telephone: '',
    generator_email: '',
    generator_address: '',      // Added
    generator_city: '',         // Added
    generator_province: '',     // Added
    generator_postal_code: '',  // Added
    // Soil Quality Contact Info - Added
    generator_soil_quality_contact_name: '',
    generator_soil_quality_contact_tel: '',
    generator_soil_quality_contact_email: '',
    // Pickup location
    pickup_address: '',
    pickup_city: '',
    pickup_province: '',
    pickup_postal_code: '',
    pickup_latitude: '',
    pickup_longitude: '',
    // Receiver information
    receiver_company_name: '',
    receiver_address: '',
    receiver_city: '',
    receiver_province: '',
    receiver_postal_code: '',
  });

  const handleChange = (field: keyof JobDetails, value: string) => {
    setJobDetails({ ...jobDetails, [field]: value });
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    console.log('Validating step:', currentStep);
    
    switch (currentStep) {
      case 1: // Job Information
        if (!jobDetails.title.trim()) {
          Alert.alert('Error', 'Please enter a job title');
          console.log('Step 1 validation failed: missing title');
          return false;
        }
        console.log('Step 1 validation passed');
        return true;
        
      case 2: // Generator Information - Updated Validation
        if (!jobDetails.generator_company_name.trim()) {
          Alert.alert('Error', 'Please enter the generator company name');
          console.log('Step 2 validation failed: missing company name');
          return false;
        }
        if (!jobDetails.generator_contact_name.trim()) {
          Alert.alert('Error', 'Please enter generator contact name');
          console.log('Step 2 validation failed: missing contact name');
          return false;
        }
        if (!jobDetails.generator_telephone.trim()) {
          Alert.alert('Error', 'Please enter generator telephone number');
          console.log('Step 2 validation failed: missing telephone');
          return false;
        }
         if (!jobDetails.generator_address.trim() || !jobDetails.generator_city.trim() ||
             !jobDetails.generator_province.trim() || !jobDetails.generator_postal_code.trim()) {
            Alert.alert('Error', 'Please fill in all required generator address fields (*)');
            console.log('Step 2 validation failed: missing address fields');
            return false;
         }
         // Soil quality contacts are optional, no validation needed unless specific format required

        console.log('Step 2 validation passed');
        return true;
        
      case 3: // Pickup and Receiver Information
        console.log('Validating pickup fields:', 
          jobDetails.pickup_address,
          jobDetails.pickup_city,
          jobDetails.pickup_province,
          jobDetails.pickup_postal_code
        );
        console.log('Validating receiver fields:', 
          jobDetails.receiver_company_name,
          jobDetails.receiver_address,
          jobDetails.receiver_city,
          jobDetails.receiver_province,
          jobDetails.receiver_postal_code
        );
        
        if (!jobDetails.pickup_address.trim() || !jobDetails.pickup_city.trim() || 
            !jobDetails.pickup_province.trim() || !jobDetails.pickup_postal_code.trim()) {
          Alert.alert('Error', 'Please fill in all required pickup location fields (*)');
          return false;
        }
        if (!jobDetails.receiver_company_name.trim()) {
          Alert.alert('Error', 'Please enter receiver company name');
          console.log('Step 3 validation failed: missing receiver company name');
          return false;
        }
        if (!jobDetails.receiver_address.trim() || !jobDetails.receiver_city.trim() || 
            !jobDetails.receiver_province.trim() || !jobDetails.receiver_postal_code.trim()) {
          Alert.alert('Error', 'Please fill in all required receiver fields (*)');
          return false;
        }

        // Optional validation for Lat/Lon format (simple check for now)
        const lat = parseFloat(jobDetails.pickup_latitude);
        const lon = parseFloat(jobDetails.pickup_longitude);
        if (jobDetails.pickup_latitude.trim() && (isNaN(lat) || lat < -90 || lat > 90)) {
            Alert.alert('Error', 'Invalid Latitude. Must be a number between -90 and 90.');
            return false;
        }
        if (jobDetails.pickup_longitude.trim() && (isNaN(lon) || lon < -180 || lon > 180)) {
            Alert.alert('Error', 'Invalid Longitude. Must be a number between -180 and 180.');
            return false;
        }

        console.log('Step 3 validation passed');
        return true;
      
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked');
    
    if (!validateCurrentStep()) {
      console.log('Validation failed, aborting submission');
      return;
    }

    // Check if user is authenticated
    if (!user || !user.id) {
      console.error('User is not authenticated or user ID is missing');
      Alert.alert('Authentication Error', 'You need to be logged in to create a job. Please log in and try again.');
      return;
    }

    try {
      console.log('Starting job creation process');
      setIsSubmitting(true);
      
      // Disable hardware back button while submitting
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
      
      // 1. Create new job in the jobs table
      console.log('Creating job with user ID:', user?.id);
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: jobDetails.title,
          description: jobDetails.description,
          status: 'draft',
          created_by: user.id
        })
        .select()
        .single();
      
      if (jobError) {
        console.error('Job creation error:', jobError);
        throw jobError;
      }
      if (!jobData) {
        console.error('No job data returned');
        throw new Error('No job data returned');
      }
      
      const jobId = jobData.id;
      console.log('Job created with ID:', jobId);
      
      // 2. Add generator information - Updated Insert
      console.log('Adding generator information with address and soil contacts');
      const { error: generatorError } = await supabase
        .from('job_generators')
        .insert({
          job_id: jobId,
          // Map state fields to the expected database column names
          company_name: jobDetails.generator_company_name, // Use company_name column
          contact_name: jobDetails.generator_contact_name,
          telephone: jobDetails.generator_telephone,
          email: jobDetails.generator_email || null,
          address: jobDetails.generator_address,             // Added
          city: jobDetails.generator_city,                 // Added
          province: jobDetails.generator_province,           // Added
          postal_code: jobDetails.generator_postal_code,     // Added
          soil_quality_contact_name: jobDetails.generator_soil_quality_contact_name || null, // Added
          soil_quality_contact_tel: jobDetails.generator_soil_quality_contact_tel || null,   // Added
          soil_quality_contact_email: jobDetails.generator_soil_quality_contact_email || null, // Added
        });
      
      if (generatorError) {
        console.error('Generator error:', generatorError);
        throw generatorError;
      }
      
      // 3. Add pickup location
      console.log('Adding pickup location with Lat/Lon');
      // Convert lat/lon strings to numbers, or null if empty/invalid
      const latitudeValue = jobDetails.pickup_latitude.trim() ? parseFloat(jobDetails.pickup_latitude) : null;
      const longitudeValue = jobDetails.pickup_longitude.trim() ? parseFloat(jobDetails.pickup_longitude) : null;

      const { error: pickupError } = await supabase
        .from('pickup_locations')
        .insert({
          job_id: jobId,
          address: jobDetails.pickup_address,
          city: jobDetails.pickup_city,
          province: jobDetails.pickup_province,
          postal_code: jobDetails.pickup_postal_code,
          latitude: latitudeValue,
          longitude: longitudeValue,
        });
      
      if (pickupError) {
        console.error('Pickup location error:', pickupError);
        throw pickupError;
      }
      
      // 4. Add receiver information
      console.log('Adding receiver information');
      const { error: receiverError } = await supabase
        .from('job_receivers')
        .insert({
          job_id: jobId,
          company_name: jobDetails.receiver_company_name,
          address: jobDetails.receiver_address,
          city: jobDetails.receiver_city,
          province: jobDetails.receiver_province,
          postal_code: jobDetails.receiver_postal_code
        });
      
      if (receiverError) {
        console.error('Receiver error:', receiverError);
        throw receiverError;
      }
      
      // Success, navigate back to home
      console.log('Job created successfully, navigating to Home');
      
      // Simply show an alert and navigate
      Alert.alert('Success', 'Job created successfully');
      navigation.navigate('Home');
    } catch (error: any) {
      console.error('Error creating job:', error);
      Alert.alert('Error', `Failed to create job: ${error.message || 'Unknown error'}`);
    } finally {
      // Clean up back handler
      BackHandler.removeEventListener('hardwareBackPress', () => true);
      setIsSubmitting(false);
    }
  };

  // Render Job Information Step
  const renderJobInformationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Job Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Job Title*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.title}
          onChangeText={(text) => handleChange('title', text)}
          placeholder="Enter job title"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={jobDetails.description}
          onChangeText={(text) => handleChange('description', text)}
          placeholder="Enter job description"
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  // Render Generator Information Step - Cleaned JSX
  const renderGeneratorInformationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Generator Information</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Company Name*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_company_name}
          onChangeText={(text) => handleChange('generator_company_name', text)}
          placeholder="Enter generating company name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_address}
          onChangeText={(text) => handleChange('generator_address', text)}
          placeholder="Enter street address"
        />
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>City*</Text>
          <TextInput
            style={styles.input}
            value={jobDetails.generator_city}
            onChangeText={(text) => handleChange('generator_city', text)}
            placeholder="City"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Province*</Text>
          <TextInput
            style={styles.input}
            value={jobDetails.generator_province}
            onChangeText={(text) => handleChange('generator_province', text)}
            placeholder="Province"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Postal Code*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_postal_code}
          onChangeText={(text) => handleChange('generator_postal_code', text)}
          placeholder="Enter postal code"
        />
      </View>

      <View style={styles.separator} />

      <Text style={styles.subHeader}>Primary Contact</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Name*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_contact_name}
          onChangeText={(text) => handleChange('generator_contact_name', text)}
          placeholder="Enter contact name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Phone Number*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_telephone}
          onChangeText={(text) => handleChange('generator_telephone', text)}
          placeholder="Enter phone number"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_email}
          onChangeText={(text) => handleChange('generator_email', text)}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.separator} />

      <Text style={styles.subHeader}>Soil Quality Contact (Optional)</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Contact Name</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_soil_quality_contact_name}
          onChangeText={(text) => handleChange('generator_soil_quality_contact_name', text)}
          placeholder="Enter soil quality contact name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Telephone</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_soil_quality_contact_tel}
          onChangeText={(text) => handleChange('generator_soil_quality_contact_tel', text)}
          placeholder="Enter soil quality contact phone"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.generator_soil_quality_contact_email}
          onChangeText={(text) => handleChange('generator_soil_quality_contact_email', text)}
          placeholder="Enter soil quality contact email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  // Render Pickup and Receiver Information Step
  const renderLocationInformationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Pickup Location</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.pickup_address}
          onChangeText={(text) => handleChange('pickup_address', text)}
          placeholder="Enter street address"
        />
      </View>
      
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>City*</Text>
          <TextInput
            style={styles.input}
            value={jobDetails.pickup_city}
            onChangeText={(text) => handleChange('pickup_city', text)}
            placeholder="City"
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Province*</Text>
          <TextInput
            style={styles.input}
            value={jobDetails.pickup_province}
            onChangeText={(text) => handleChange('pickup_province', text)}
            placeholder="Province"
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Postal Code*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.pickup_postal_code}
          onChangeText={(text) => handleChange('pickup_postal_code', text)}
          placeholder="Enter postal code"
        />
      </View>
      
      <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                  style={styles.input}
                  value={jobDetails.pickup_latitude}
                  onChangeText={(text) => handleChange('pickup_latitude', text)}
                  placeholder="e.g., 43.6532"
                  keyboardType="numeric"
              />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                  style={styles.input}
                  value={jobDetails.pickup_longitude}
                  onChangeText={(text) => handleChange('pickup_longitude', text)}
                  placeholder="e.g., -79.3832"
                  keyboardType="numeric"
              />
          </View>
      </View>
      
      <Text style={[styles.stepTitle, { marginTop: 24 }]}>Receiver Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Company Name*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.receiver_company_name}
          onChangeText={(text) => handleChange('receiver_company_name', text)}
          placeholder="Enter receiver company name"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Address*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.receiver_address}
          onChangeText={(text) => handleChange('receiver_address', text)}
          placeholder="Enter street address"
        />
      </View>
      
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.label}>City*</Text>
          <TextInput
            style={styles.input}
            value={jobDetails.receiver_city}
            onChangeText={(text) => handleChange('receiver_city', text)}
            placeholder="City"
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.label}>Province*</Text>
          <TextInput
            style={styles.input}
            value={jobDetails.receiver_province}
            onChangeText={(text) => handleChange('receiver_province', text)}
            placeholder="Province"
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Postal Code*</Text>
        <TextInput
          style={styles.input}
          value={jobDetails.receiver_postal_code}
          onChangeText={(text) => handleChange('receiver_postal_code', text)}
          placeholder="Enter postal code"
        />
      </View>
    </View>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderJobInformationStep();
      case 2:
        return renderGeneratorInformationStep();
      case 3:
        return renderLocationInformationStep();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#28a745" />
          <Text style={styles.loadingText}>Creating job...</Text>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Connection Error */}
          {connectionError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Connection Error: {connectionError}. Please check your network or try again later.
              </Text>
            </View>
          )}
          
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {Array.from({ length: totalSteps }).map((_, index) => (
              <View 
                key={index}
                style={[
                  styles.progressStep,
                  index + 1 === currentStep && styles.currentStep,
                  index + 1 < currentStep && styles.completedStep
                ]}
              />
            ))}
          </View>
          
          {/* Step Title */}
          <Text style={styles.stepIndicator}>
            Step {currentStep} of {totalSteps}
          </Text>
          
          {/* Current Step Form */}
          {renderStepContent()}
          
          {/* Navigation Buttons */}
          <View style={styles.buttonsContainer}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={[styles.button, styles.backButton]} 
                onPress={prevStep}
              >
                <Text style={styles.backButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < totalSteps ? (
              <TouchableOpacity 
                style={[styles.button, styles.nextButton, currentStep > 1 && { flex: 1 }]} 
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.button, styles.submitButton, { flex: 1 }]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Job</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  progressStep: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  currentStep: {
    backgroundColor: '#007bff',
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: -2,
  },
  completedStep: {
    backgroundColor: '#28a745',
  },
  stepIndicator: {
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 16,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#495057',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#495057',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  nextButton: {
    backgroundColor: '#007bff',
    flex: 2,
  },
  submitButton: {
    backgroundColor: '#28a745',
  },
  backButtonText: {
    color: '#6c757d',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleText: {
    color: '#007bff',
    fontSize: 14,
  },
  noDataText: {
    color: '#6c757d',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    backgroundColor: '#ffd6d6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
    marginTop: 8,
  },
}); 