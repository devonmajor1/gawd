import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
// Assuming you have a way to check if the user is an admin, e.g., via useAuth
import { useAuth } from '../contexts/AuthProvider'; 

// Type for Job data (can reuse/adapt from NewPickupScreen if needed)
type Job = {
  id: string;
  title: string;
  status: string; // e.g., 'draft', 'active', 'completed'
  created_at: string;
  // Add other fields if needed for display
};

const JOB_STATUSES = ['draft', 'active', 'inactive', 'completed', 'cancelled']; // Define possible statuses

export default function AdminJobStatusScreen({ navigation }: any) {
  // TODO: Ensure useAuth provides an isAdmin flag or similar check
  const { user, isAdmin = false } = useAuth(); // Keep default for linting/dependency array
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);

  useEffect(() => {
    // Redirect non-admins
    // Note: Ideally, navigation access should also be controlled in App.tsx
    /* Temporarily disabled admin check for testing
    if (!isAdmin) {
      Alert.alert('Access Denied', 'You do not have permission to access this screen.');
      navigation.goBack();
      return;
    }
    */
    fetchJobsForAdmin();
    // Keep dependencies as they were, assuming isAdmin might be added back
  }, [isAdmin, navigation]);

  const fetchJobsForAdmin = async () => {
    setLoading(true);
    console.log("Fetching jobs for admin...");
    try {
      // Fetch all jobs, ordered by creation date
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`Fetched ${data?.length || 0} jobs.`);
      if (data) {
        setJobs(data);
      }
    } catch (error: any) {
      console.error('Error fetching jobs for admin:', error.message);
      Alert.alert('Error', 'Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    console.log(`Attempting to update job ${jobId} to status ${newStatus}`);
    setUpdatingJobId(jobId);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', jobId);

      if (error) throw error;

      console.log(`Successfully updated job ${jobId}`);
      // Update the status locally for immediate UI feedback
      setJobs(prevJobs =>
        prevJobs.map(job =>
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );
      Alert.alert('Success', `Job status updated to ${newStatus}`);

    } catch (error: any) {
      console.error(`Error updating job ${jobId}:`, error.message);
      Alert.alert('Error', `Failed to update job status: ${error.message}`);
    } finally {
      setUpdatingJobId(null);
    }
  };

  const renderJobItem = ({ item }: { item: Job }) => (
    <View style={styles.jobItemContainer}>
      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle}>{item.title}</Text>
        <Text style={styles.jobDate}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.statusContainer}>
        {updatingJobId === item.id ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={item.status}
              style={styles.picker}
              onValueChange={(itemValue) => {
                if (itemValue !== item.status) {
                  handleStatusChange(item.id, itemValue);
                }
              }}
              mode="dropdown" // Or "dialog"
            >
              {JOB_STATUSES.map(status => (
                <Picker.Item key={status} label={status} value={status} style={styles.pickerItem}/>
              ))}
            </Picker>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text>Loading Jobs...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Manage Job Status</Text>
      <FlatList
        data={jobs}
        renderItem={renderJobItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>No jobs found.</Text>
        )}
        refreshing={loading}
        onRefresh={fetchJobsForAdmin} // Add pull-to-refresh
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    padding: 16,
    textAlign: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  listContainer: {
    padding: 8,
  },
  jobItemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginHorizontal: 8,
  },
  jobInfo: {
    flex: 1,
    marginRight: 16,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  jobDate: {
    fontSize: 14,
    color: '#6c757d',
  },
  statusContainer: {
    minWidth: 130, // Ensure enough space for picker
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    overflow: 'hidden', // Helps contain the picker style on some platforms
  },
  picker: {
    height: 40,
    width: 130,
    backgroundColor: '#fff',
  },
  pickerItem: {
    fontSize: 14, // Adjust font size if needed
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#6c757d',
  },
}); 