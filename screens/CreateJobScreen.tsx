import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';

type Company = {
  CompanyID: number;
  CompanyName: string;
};

type Site = {
  SiteID: number;
  SiteName: string;
  Address: string;
};

type Driver = {
  DriverID: number;
  DriverName: string;
};

export default function CreateJobScreen({ navigation }: any) {
  const [generators, setGenerators] = useState<Company[]>([]);
  const [receivers, setReceivers] = useState<Company[]>([]);
  const [pickupSites, setPickupSites] = useState<Site[]>([]);
  const [receivingSites, setReceivingSites] = useState<Site[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const [jobDetails, setJobDetails] = useState({
    generatorCompanyId: null as number | null,
    pickupSiteId: null as number | null,
    loadProfileId: '',
    materialType: 'SOIL',
    quantityLoaded: '',
    quantityUnit: 'MT',
    receivingCompanyId: null as number | null,
    receivingSiteId: null as number | null,
    driverId: null as number | null,
    scheduledPickupDateTime: new Date().toISOString(),
  });

  useEffect(() => {
    fetchCompanies();
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (jobDetails.generatorCompanyId) {
      fetchSites(jobDetails.generatorCompanyId, 'pickup');
    }
  }, [jobDetails.generatorCompanyId]);

  useEffect(() => {
    if (jobDetails.receivingCompanyId) {
      fetchSites(jobDetails.receivingCompanyId, 'receiving');
    }
  }, [jobDetails.receivingCompanyId]);

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

  const fetchDrivers = async () => {
    const { data: driversData, error } = await supabase
      .from('Drivers')
      .select('*');

    if (error) {
      console.error('Error fetching drivers:', error);
      return;
    }

    if (driversData) {
      setDrivers(driversData);
    }
  };

  const handleCreateJob = async () => {
    try {
      // First create the manifest template
      const { data: templateData, error: templateError } = await supabase
        .from('ManifestTemplates')
        .insert([{
          GeneratorCompanyID: jobDetails.generatorCompanyId,
          PickupSiteID: jobDetails.pickupSiteId,
          LoadProfileID: jobDetails.loadProfileId,
          MaterialType: jobDetails.materialType,
          QuantityLoaded: parseFloat(jobDetails.quantityLoaded),
          QuantityUnit: jobDetails.quantityUnit,
          ReceivingCompanyID: jobDetails.receivingCompanyId,
          ReceivingSiteID: jobDetails.receivingSiteId,
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      // Then create the assignment
      const { error: assignmentError } = await supabase
        .from('AssignedManifests')
        .insert([{
          TemplateID: templateData.TemplateID,
          DriverID: jobDetails.driverId,
          ScheduledPickupDateTime: jobDetails.scheduledPickupDateTime,
          Status: 'PENDING'
        }]);

      if (assignmentError) throw assignmentError;

      navigation.navigate('Home');
    } catch (error) {
      console.error('Error creating job:', error);
      alert('Failed to create job. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Generator Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Generator Company</Text>
            <View style={styles.pickerContainer}>
              <Picker
                style={styles.picker}
                selectedValue={jobDetails.generatorCompanyId}
                onValueChange={(value) => 
                  setJobDetails({ ...jobDetails, generatorCompanyId: value })
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
                selectedValue={jobDetails.pickupSiteId}
                onValueChange={(value) => 
                  setJobDetails({ ...jobDetails, pickupSiteId: value })
                }
                enabled={!!jobDetails.generatorCompanyId}
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

          <Text style={styles.sectionTitle}>Load Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Load Profile ID</Text>
            <TextInput
              style={styles.input}
              value={jobDetails.loadProfileId}
              onChangeText={(text) => 
                setJobDetails({ ...jobDetails, loadProfileId: text })
              }
              placeholder="Enter Load Profile ID"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={jobDetails.quantityLoaded}
              onChangeText={(text) => 
                setJobDetails({ ...jobDetails, quantityLoaded: text })
              }
              placeholder="Enter quantity"
              keyboardType="numeric"
            />
          </View>

          <Text style={styles.sectionTitle}>Receiver Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Receiving Company</Text>
            <View style={styles.pickerContainer}>
              <Picker
                style={styles.picker}
                selectedValue={jobDetails.receivingCompanyId}
                onValueChange={(value) => 
                  setJobDetails({ ...jobDetails, receivingCompanyId: value })
                }
              >
                <Picker.Item label="Select Receiver" value={null} />
                {receivers.map((company) => (
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
            <Text style={styles.label}>Receiving Site</Text>
            <View style={styles.pickerContainer}>
              <Picker
                style={styles.picker}
                selectedValue={jobDetails.receivingSiteId}
                onValueChange={(value) => 
                  setJobDetails({ ...jobDetails, receivingSiteId: value })
                }
                enabled={!!jobDetails.receivingCompanyId}
              >
                <Picker.Item label="Select Receiving Site" value={null} />
                {receivingSites.map((site) => (
                  <Picker.Item 
                    key={site.SiteID} 
                    label={`${site.SiteName} - ${site.Address}`} 
                    value={site.SiteID} 
                  />
                ))}
              </Picker>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Assignment</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assign Driver</Text>
            <View style={styles.pickerContainer}>
              <Picker
                style={styles.picker}
                selectedValue={jobDetails.driverId}
                onValueChange={(value) => 
                  setJobDetails({ ...jobDetails, driverId: value })
                }
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

          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleCreateJob}
          >
            <Text style={styles.submitButtonText}>Create Job</Text>
          </TouchableOpacity>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 16,
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
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginTop: 32,
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 