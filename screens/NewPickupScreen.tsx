import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';

type MaterialType = 'SOIL' | 'AGGREGATE' | 'OTHER'; // Update this based on your enum

type PickupDetails = {
  // Generator Info
  generatorCompanyId: number | null;
  generatorContactId: number | null;
  
  // Pickup Info
  pickupSiteId: number | null;
  pickupDateTime: string;
  
  // Load Info
  loadProfileId: string;
  materialType: MaterialType;
  quantityLoaded: number;
  quantityUnit: string;
  loadAuthorizerName: string;
  loadAuthorizerTel: string;
  
  // Transport Info
  transportingCompanyId: number | null;
  driverId: number | null;
  vehicleId: number | null;
  
  // Receiver Info
  receivingCompanyId: number | null;
  receivingSiteId: number | null;
};

type Company = {
  CompanyID: number;
  CompanyName: string;
  IsGenerator: boolean;
  IsTransporter: boolean;
  IsReceiver: boolean;
};

type Site = {
  SiteID: number;
  CompanyID: number;
  SiteName: string;
  Address: string;
};

type Driver = {
  DriverID: number;
  TransportingCompanyID: number;
  DriverName: string;
};

type Vehicle = {
  VehicleID: number;
  TransportingCompanyID: number;
  LicensePlate: string;
};

export default function NewPickupScreen({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [pickupDetails, setPickupDetails] = useState<PickupDetails>({
    generatorCompanyId: null,
    generatorContactId: null,
    pickupSiteId: null,
    pickupDateTime: new Date().toISOString(),
    loadProfileId: '',
    materialType: 'SOIL',
    quantityLoaded: 0,
    quantityUnit: 'MT',
    loadAuthorizerName: '',
    loadAuthorizerTel: '',
    transportingCompanyId: null,
    driverId: null,
    vehicleId: null,
    receivingCompanyId: null,
    receivingSiteId: null,
  });

  const [companies, setCompanies] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [generators, setGenerators] = useState<Company[]>([]);
  const [transporters, setTransporters] = useState<Company[]>([]);
  const [receivers, setReceivers] = useState<Company[]>([]);
  const [pickupSites, setPickupSites] = useState<Site[]>([]);
  const [receivingSites, setReceivingSites] = useState<Site[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    fetchCompanies();
    fetchSites();
  }, []);

  useEffect(() => {
    if (pickupDetails.generatorCompanyId) {
      fetchSites(pickupDetails.generatorCompanyId, 'pickup');
    }
  }, [pickupDetails.generatorCompanyId]);

  useEffect(() => {
    if (pickupDetails.receivingCompanyId) {
      fetchSites(pickupDetails.receivingCompanyId, 'receiving');
    }
  }, [pickupDetails.receivingCompanyId]);

  useEffect(() => {
    if (pickupDetails.transportingCompanyId) {
      fetchDriversAndVehicles(pickupDetails.transportingCompanyId);
    }
  }, [pickupDetails.transportingCompanyId]);

  const fetchCompanies = async () => {
    const { data: companiesData, error } = await supabase
      .from('Companies')
      .select('*');

    if (error) {
      console.error('Error fetching companies:', error);
      return;
    }

    if (companiesData) {
      setGenerators(companiesData.filter(c => c.IsGenerator));
      setTransporters(companiesData.filter(c => c.IsTransporter));
      setReceivers(companiesData.filter(c => c.IsReceiver));
    }
  };

  const fetchSites = async (companyId: number, type: 'pickup' | 'receiving') => {
    const { data: sitesData, error } = await supabase
      .from('Sites')
      .select('*')
      .eq('CompanyID', companyId);

    if (error) {
      console.error('Error fetching sites:', error);
      return;
    }

    if (sitesData) {
      if (type === 'pickup') {
        setPickupSites(sitesData);
      } else {
        setReceivingSites(sitesData);
      }
    }
  };

  const fetchDriversAndVehicles = async (transporterId: number) => {
    const [driversResponse, vehiclesResponse] = await Promise.all([
      supabase
        .from('Drivers')
        .select('*')
        .eq('TransportingCompanyID', transporterId),
      supabase
        .from('Vehicles')
        .select('*')
        .eq('TransportingCompanyID', transporterId),
    ]);

    if (driversResponse.data) setDrivers(driversResponse.data);
    if (vehiclesResponse.data) setVehicles(vehiclesResponse.data);
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Generator Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Generator Company</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.generatorCompanyId}
            onValueChange={(value) => 
              setPickupDetails({ ...pickupDetails, generatorCompanyId: value })
            }
          >
            <Picker.Item label="Select Generator" value={null} />
            {generators.map((company) => (
              <Picker.Item 
                key={company.CompanyID} 
                label={company.CompanyName} 
                value={company.CompanyID} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pickup Site</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.pickupSiteId}
            onValueChange={(value) => 
              setPickupDetails({ ...pickupDetails, pickupSiteId: value })
            }
            enabled={!!pickupDetails.generatorCompanyId}
          >
            <Picker.Item label="Select Pickup Site" value={null} />
            {pickupSites.map((site) => (
              <Picker.Item 
                key={site.SiteID} 
                label={`${site.SiteName} - ${site.Address}`} 
                value={site.SiteID} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Load Profile ID</Text>
        <TextInput
          style={styles.input}
          value={pickupDetails.loadProfileId}
          onChangeText={(text) => 
            setPickupDetails({ ...pickupDetails, loadProfileId: text })
          }
          placeholder="Enter Load Profile ID"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Quantity Loaded</Text>
        <TextInput
          style={styles.input}
          value={pickupDetails.quantityLoaded.toString()}
          onChangeText={(text) => 
            setPickupDetails({ ...pickupDetails, quantityLoaded: parseFloat(text) || 0 })
          }
          keyboardType="numeric"
          placeholder="Enter quantity"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Transport Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Transport Company</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.transportingCompanyId}
            onValueChange={(value) => 
              setPickupDetails({ ...pickupDetails, transportingCompanyId: value })
            }
          >
            <Picker.Item label="Select Transporter" value={null} />
            {transporters.map((company) => (
              <Picker.Item 
                key={company.CompanyID} 
                label={company.CompanyName} 
                value={company.CompanyID} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Driver</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.driverId}
            onValueChange={(value) => 
              setPickupDetails({ ...pickupDetails, driverId: value })
            }
            enabled={!!pickupDetails.transportingCompanyId}
          >
            <Picker.Item label="Select Driver" value={null} />
            {drivers.map((driver) => (
              <Picker.Item 
                key={driver.DriverID} 
                label={driver.DriverName} 
                value={driver.DriverID} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Vehicle</Text>
        <View style={styles.pickerContainer}>
          <Picker
            style={styles.picker}
            selectedValue={pickupDetails.vehicleId}
            onValueChange={(value) => 
              setPickupDetails({ ...pickupDetails, vehicleId: value })
            }
            enabled={!!pickupDetails.transportingCompanyId}
          >
            <Picker.Item label="Select Vehicle" value={null} />
            {vehicles.map((vehicle) => (
              <Picker.Item 
                key={vehicle.VehicleID} 
                label={vehicle.LicensePlate} 
                value={vehicle.VehicleID} 
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Authorizer Name</Text>
        <TextInput
          style={styles.input}
          value={pickupDetails.loadAuthorizerName}
          onChangeText={(text) => 
            setPickupDetails({ ...pickupDetails, loadAuthorizerName: text })
          }
          placeholder="Enter authorizer name"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Authorizer Phone</Text>
        <TextInput
          style={styles.input}
          value={pickupDetails.loadAuthorizerTel}
          onChangeText={(text) => 
            setPickupDetails({ ...pickupDetails, loadAuthorizerTel: text })
          }
          placeholder="Enter authorizer phone"
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const handleSubmit = async () => {
    try {
      const { data, error } = await supabase
        .from('Manifests')
        .insert([{
          ...pickupDetails,
          manifestReferenceNumber: `MAN-${Date.now()}`, // Generate a unique reference
        }])
        .select();

      if (error) throw error;

      navigation.navigate('PickupConfirmation', { 
        details: data[0]
      });
    } catch (error) {
      console.error('Error creating manifest:', error);
      alert('Failed to create manifest. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {step === 1 ? renderStep1() : renderStep2()}
          
          <View style={styles.buttonContainer}>
            {step > 1 && (
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]} 
                onPress={() => setStep(step - 1)}
              >
                <Text style={styles.buttonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.button, step === 2 && styles.submitButton]} 
              onPress={() => step === 1 ? setStep(2) : handleSubmit()}
            >
              <Text style={styles.buttonText}>
                {step === 1 ? 'Next' : 'Submit Manifest'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  submitButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
}); 