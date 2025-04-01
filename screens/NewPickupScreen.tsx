import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider';

// Define material types for contaminated soil
type MaterialType = 'SOIL' | 'AGGREGATE' | 'SLUDGE' | 'OTHER';

// Pickup details that will be saved to the database
type PickupDetails = {
  // Job reference
  job_id: string | null;
  
  // Pickup information
  pickup_date_time: string;
  
  // Load information
  load_profile_id: string;
  material_type: MaterialType;
  quantity_loaded: number;
  quantity_unit: string;
  load_authorizer_name: string;
  load_authorizer_tel: string;
  
  // Transport information
  driver_id: number | null;
  vehicle_id: number | null;
  
  // Additional notes
  notes: string;
};

// Job type with related information
type Job = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
  
  // Related entities
  generator: {
    id: string;
    contact_name: string;
    telephone: string;
    email: string | null;
  } | null;
  
  pickup_location: {
    id: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
  } | null;
  
  receiver: {
    id: string;
    company_name: string;
    address: string;
    city: string;
    province: string;
    postal_code: string;
  } | null;
};

// Driver information
type Driver = {
  id: number;
  name: string;
  license_number: string;
};

// Vehicle information
type Vehicle = {
  id: number;
  plate_number: string;
  type: string;
};

export default function NewPickupScreen({ navigation }: any) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // State for jobs and selection
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  
  // State for drivers and vehicles
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  // State for pickup details
  const [pickupDetails, setPickupDetails] = useState<PickupDetails>({
    job_id: null,
    pickup_date_time: new Date().toISOString(),
    load_profile_id: '',
    material_type: 'SOIL',
    quantity_loaded: 0,
    quantity_unit: 'tonnes',
    load_authorizer_name: '',
    load_authorizer_tel: '',
    driver_id: null,
    vehicle_id: null,
    notes: '',
  });

  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs();
    fetchDriversAndVehicles();
  }, []);

  // Fetch jobs from Supabase with related information
  const fetchJobs = async () => {
    console.log('Starting fetchJobs...'); // Log start
    setJobsLoading(true);
    try {
      // Fetch jobs with related entities using Supabase's nested selects
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_generators (*),
          pickup_locations (*),
          job_receivers (*)
        `)
        .eq('status', 'active');
        
      console.log('Supabase response:', { data, error }); // Log Supabase response
        
      if (error) throw error;
      
      if (data) {
        // Transform data to match our Job type
        const formattedJobs: Job[] = data.map(job => {
          // Log each raw job object
          console.log('Processing raw job:', job);
          return {
            id: job.id,
            title: job.title,
            description: job.description,
            status: job.status,
            created_at: job.created_at,
            generator: job.job_generators?.[0] || null,
            pickup_location: job.pickup_locations?.[0] || null,
            receiver: job.job_receivers?.[0] || null
          };
        });
        
        console.log('Formatted jobs:', formattedJobs); // Log formatted jobs
        setJobs(formattedJobs);
      }
    } catch (error: any) {
      console.error('Error fetching jobs:', error.message);
      console.error('Detailed fetch error:', error); // Log detailed error
      Alert.alert('Error', 'Failed to load jobs. Please try again.');
    } finally {
      setJobsLoading(false);
      console.log('Finished fetchJobs. jobsLoading should be false now.'); // Log finish
    }
  };

  // Fetch drivers and vehicles
  const fetchDriversAndVehicles = async () => {
    try {
      // In a real app, you would fetch these from your database
      // This is placeholder data
      setDrivers([
        { id: 1, name: 'John Smith', license_number: 'D12345' },
        { id: 2, name: 'Jane Doe', license_number: 'D67890' },
      ]);
      
      setVehicles([
        { id: 1, plate_number: 'ABC123', type: 'Truck' },
        { id: 2, plate_number: 'XYZ789', type: 'Tanker' },
      ]);
    } catch (error: any) {
      console.error('Error fetching drivers/vehicles:', error.message);
    }
  };

  // Handle selecting a job
  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
    setPickupDetails({
      ...pickupDetails,
      job_id: job.id,
    });
  };

  // Handle form field changes
  const handleChange = (field: keyof PickupDetails, value: any) => {
    setPickupDetails({
      ...pickupDetails,
      [field]: value,
    });
  };

  // Validate each step before proceeding
  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1: // Job Selection
        if (!pickupDetails.job_id) {
          Alert.alert('Error', 'Please select a job to continue');
          return false;
        }
        return true;
        
      case 2: // Load Information
        if (!pickupDetails.load_profile_id) {
          Alert.alert('Error', 'Please enter a load profile ID');
          return false;
        }
        if (pickupDetails.quantity_loaded <= 0) {
          Alert.alert('Error', 'Please enter a valid quantity');
          return false;
        }
        if (!pickupDetails.load_authorizer_name) {
          Alert.alert('Error', 'Please enter the load authorizer name');
          return false;
        }
        if (!pickupDetails.load_authorizer_tel) {
          Alert.alert('Error', 'Please enter the load authorizer telephone');
          return false;
        }
        return true;
        
      case 3: // Transport Information
        if (!pickupDetails.driver_id) {
          Alert.alert('Error', 'Please select a driver');
          return false;
        }
        if (!pickupDetails.vehicle_id) {
          Alert.alert('Error', 'Please select a vehicle');
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  // Navigation functions
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit the pickup
  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }
    
    if (!user) {
      Alert.alert('Error', 'You must be logged in to submit a pickup');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create the pickup in the database
      const { data, error } = await supabase
        .from('pickups')
        .insert({
          job_id: pickupDetails.job_id,
          pickup_date_time: pickupDetails.pickup_date_time,
          load_profile_id: pickupDetails.load_profile_id,
          material_type: pickupDetails.material_type,
          quantity_loaded: pickupDetails.quantity_loaded,
          quantity_unit: pickupDetails.quantity_unit,
          load_authorizer_name: pickupDetails.load_authorizer_name,
          load_authorizer_tel: pickupDetails.load_authorizer_tel,
          driver_id: pickupDetails.driver_id,
          vehicle_id: pickupDetails.vehicle_id,
          status: 'submitted',
          // Add additional fields as needed
        })
        .select()
        .single();
      
      if (error) throw error;
      
      Alert.alert(
        'Success',
        'Pickup submitted successfully',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error: any) {
      console.error('Error submitting pickup:', error.message);
      Alert.alert('Error', `Failed to submit pickup: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the selected job information panel
  const renderSelectedJobInfo = () => {
    if (!selectedJob) return null;
    
    return (
      <View style={styles.selectedJobCard}>
        <Text style={styles.selectedJobTitle}>Selected Job:</Text>
        <Text style={styles.selectedJobName}>{selectedJob.title}</Text>
        
        {selectedJob.generator && (
          <Text style={styles.selectedJobDetail}>
            Generator: {selectedJob.generator.contact_name} ({selectedJob.generator.telephone})
          </Text>
        )}
        
        {selectedJob.pickup_location && (
          <Text style={styles.selectedJobDetail}>
            From: {selectedJob.pickup_location.address}, {selectedJob.pickup_location.city}, {selectedJob.pickup_location.province}
          </Text>
        )}
        
        {selectedJob.receiver && (
          <Text style={styles.selectedJobDetail}>
            To: {selectedJob.receiver.company_name}, {selectedJob.receiver.city}
          </Text>
        )}
        
        <TouchableOpacity
          style={styles.changeJobButton}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.changeJobButtonText}>Change Job</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Step 1: Job Selection
  const renderJobSelectionStep = () => {
    // Log the jobs state right before rendering
    console.log(`Rendering Job Selection: jobsLoading=${jobsLoading}, jobs count=${jobs.length}`);
    console.log('Jobs state in render:', jobs);
    
    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Select Job</Text>
        <Text style={styles.stepDescription}>
          Choose an existing job for this pickup of contaminated soil
        </Text>
        
        {jobsLoading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : jobs.length === 0 ? (
          <View style={styles.noJobsContainer}>
            <Text style={styles.noJobsText}>No active jobs found</Text>
            <TouchableOpacity
              style={styles.createJobButton}
              onPress={() => navigation.navigate('CreateJob')}
            >
              <Text style={styles.createJobButtonText}>Create New Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.jobList}>
            {jobs.map(job => {
              // Log each job being mapped
              console.log('Mapping job:', job.id, job.title);
              return (
                <TouchableOpacity
                  key={job.id}
                  style={[
                    styles.jobCard,
                    selectedJob?.id === job.id && styles.selectedJobCardHighlight
                  ]}
                  onPress={() => handleJobSelect(job)}
                >
                  <View style={styles.jobHeader}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.jobDate}>
                      {new Date(job.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  {job.description && (
                    <Text style={styles.jobDescription} numberOfLines={2}>
                      {job.description}
                    </Text>
                  )}
                  
                  <View style={styles.jobDetails}>
                    {job.pickup_location && (
                      <Text style={styles.jobLocation}>
                        From: {job.pickup_location.city}, {job.pickup_location.province}
                      </Text>
                    )}
                    
                    {job.receiver && (
                      <Text style={styles.jobLocation}>
                        To: {job.receiver.company_name}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        
        {!jobsLoading && jobs.length > 0 && (
          <TouchableOpacity
            style={styles.createJobButton}
            onPress={() => navigation.navigate('CreateJob')}
          >
            <Text style={styles.createJobButtonText}>+ Create New Job</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Step 2: Load Information
  const renderLoadInformationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Load Information</Text>
      
      {renderSelectedJobInfo()}
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Load Profile ID*</Text>
        <TextInput
          style={styles.input}
          value={pickupDetails.load_profile_id}
          onChangeText={(value) => handleChange('load_profile_id', value)}
          placeholder="Enter load profile ID"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Material Type*</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.material_type}
            onValueChange={(value) => handleChange('material_type', value)}
          >
            <Picker.Item label="Soil" value="SOIL" />
            <Picker.Item label="Aggregate" value="AGGREGATE" />
            <Picker.Item label="Sludge" value="SLUDGE" />
            <Picker.Item label="Other" value="OTHER" />
          </Picker>
        </View>
      </View>
      
      <View style={styles.rowContainer}>
        <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
          <Text style={styles.label}>Quantity Loaded*</Text>
          <TextInput
            style={styles.input}
            value={pickupDetails.quantity_loaded.toString()}
            onChangeText={(value) => handleChange('quantity_loaded', parseFloat(value) || 0)}
            keyboardType="numeric"
            placeholder="Enter quantity"
          />
        </View>
        
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.label}>Unit*</Text>
          <View style={styles.pickerContainer}>
            <Picker
              style={styles.picker}
              selectedValue={pickupDetails.quantity_unit}
              onValueChange={(value) => handleChange('quantity_unit', value)}
            >
              <Picker.Item label="tonnes" value="tonnes" />
              <Picker.Item label="kg" value="kg" />
              <Picker.Item label="m³" value="m³" />
            </Picker>
          </View>
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Load Authorizer Name*</Text>
        <TextInput
          style={styles.input}
          value={pickupDetails.load_authorizer_name}
          onChangeText={(value) => handleChange('load_authorizer_name', value)}
          placeholder="Enter name of person authorizing load"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Load Authorizer Telephone*</Text>
        <TextInput
          style={styles.input}
          value={pickupDetails.load_authorizer_tel}
          onChangeText={(value) => handleChange('load_authorizer_tel', value)}
          placeholder="Enter telephone number"
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  // Step 3: Transport Information
  const renderTransportInformationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Transport Information</Text>
      
      {renderSelectedJobInfo()}
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Driver*</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.driver_id}
            onValueChange={(value) => handleChange('driver_id', value)}
          >
            <Picker.Item label="Select Driver" value={null} />
            {drivers.map(driver => (
              <Picker.Item 
                key={driver.id} 
                label={`${driver.name} (License: ${driver.license_number})`} 
                value={driver.id} 
              />
            ))}
          </Picker>
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vehicle*</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.vehicle_id}
            onValueChange={(value) => handleChange('vehicle_id', value)}
          >
            <Picker.Item label="Select Vehicle" value={null} />
            {vehicles.map(vehicle => (
              <Picker.Item 
                key={vehicle.id} 
                label={`${vehicle.type} (${vehicle.plate_number})`} 
                value={vehicle.id} 
              />
            ))}
          </Picker>
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={pickupDetails.notes}
          onChangeText={(value) => handleChange('notes', value)}
          placeholder="Enter any additional notes"
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  // Navigation buttons
  const renderNavigationButtons = () => (
    <View style={styles.navigationContainer}>
      {currentStep > 1 && (
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={prevStep}
        >
          <Text style={styles.backButtonText}>Back</Text>
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
            <Text style={styles.submitButtonText}>Submit Pickup</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  // Progress indicator
  const renderProgressIndicator = () => (
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
  );

  // Step title
  const renderStepIndicator = () => (
    <Text style={styles.stepIndicator}>
      Step {currentStep} of {totalSteps}
    </Text>
  );

  // Render current step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderJobSelectionStep();
      case 2:
        return renderLoadInformationStep();
      case 3:
        return renderTransportInformationStep();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isSubmitting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>Submitting pickup...</Text>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {renderProgressIndicator()}
          {renderStepIndicator()}
          {renderCurrentStep()}
          {renderNavigationButtons()}
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
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
    marginBottom: 8,
    color: '#495057',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
  },
  loader: {
    marginVertical: 20,
  },
  noJobsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noJobsText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  jobList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  selectedJobCardHighlight: {
    borderColor: '#007bff',
    borderWidth: 2,
    backgroundColor: '#f0f7ff',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    flex: 1,
  },
  jobDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  jobDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  jobDetails: {
    marginTop: 8,
  },
  jobLocation: {
    fontSize: 14,
    color: '#6c757d',
  },
  selectedJobCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#007bff',
  },
  selectedJobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#495057',
  },
  selectedJobName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  selectedJobDetail: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 2,
  },
  changeJobButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  changeJobButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navigationContainer: {
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
  createJobButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createJobButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
