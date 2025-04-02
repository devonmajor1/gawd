import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl, // Added for pull-to-refresh
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthProvider'; // Optional: If filtering by user needed
import { Database } from '../types/database.types';
import { useNavigation, useIsFocused } from '@react-navigation/native'; // Hooks for navigation
import { NativeStackNavigationProp } from '@react-navigation/native-stack'; // Type for navigation prop
import { RootStackParamList } from '../App'; // Import navigation types

// Type for a Job including related data from the fetch query
type FetchedJob = Database['public']['Tables']['jobs']['Row'] & {
    job_generators: Database['public']['Tables']['job_generators']['Row'][] | null;
    pickup_locations: Database['public']['Tables']['pickup_locations']['Row'][] | null;
    job_receivers: Database['public']['Tables']['job_receivers']['Row'][] | null;
    // Can add created_by profile info if needed: created_by_profile: { name: string } | null;
};

// Define navigation prop type for this screen
type ActiveJobsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ActiveJobs' // Screen name in the stack
>;


export default function ActiveJobsScreen() {
  const navigation = useNavigation<ActiveJobsScreenNavigationProp>();
  const isFocused = useIsFocused(); // Hook to detect screen focus
  const { user } = useAuth(); // Get user if needed for filtering or RLS

  const [jobs, setJobs] = useState<FetchedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh

  // Fetch active jobs
  const fetchActiveJobs = useCallback(async () => {
    console.log('Fetching active jobs...');
    setError(null);
    // Don't set isLoading to true if just refreshing
    if (!refreshing) {
       setIsLoading(true);
    }

    try {
      // Modify query based on RLS and desired filters
      // Example: Fetch active jobs created by the user or all if admin?
      // For now, fetching jobs with status 'active' (adapt as needed)
      const query = supabase
        .from('jobs')
        .select(`
          *,
          job_generators ( contact_name ),
          pickup_locations ( city, province ),
          job_receivers ( company_name )
          -- Example if you join created_by user profile:
          -- , created_by_profile:profiles ( name )
        `)
        // Define what "active" means. Could be multiple statuses.
        // Example: .in('status', ['active', 'in_progress', 'submitted'])
        .eq('status', 'active') // Adjust status filter as needed
        // Example: Add user filter if RLS doesn't handle it
        // .eq('created_by', user.id)
        .order('created_at', { ascending: false }); // Show newest first

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching active jobs:', fetchError);
        throw fetchError;
      }

      console.log('Fetched active jobs:', data?.length);
      setJobs(data || []);
    } catch (err: any) {
      setError(`Failed to load active jobs: ${err.message}`);
      setJobs([]); // Clear jobs on error
    } finally {
      setIsLoading(false);
      setRefreshing(false); // Ensure refreshing stops
    }
  }, [user, refreshing]); // Include dependencies

  // Fetch jobs when the component mounts or is focused
  useEffect(() => {
    if (isFocused) {
      fetchActiveJobs();
    }
  }, [fetchActiveJobs, isFocused]); // Re-fetch when screen comes into focus

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // fetchActiveJobs will be called by useEffect because 'refreshing' state changes its dependency list
  }, []);

  // Handle pressing a job item
  const handleJobPress = (jobId: string) => {
    console.log('Navigating to JobDetails with ID:', jobId);
    // Navigate to JobDetailsScreen, passing jobId
    // Make sure JobDetailsScreen exists and accepts 'jobId' param
    navigation.navigate('JobDetails', { jobId: jobId });
  };

  // Render item for the FlatList
  const renderJobItem = ({ item }: { item: FetchedJob }) => (
    <TouchableOpacity style={styles.jobItem} onPress={() => handleJobPress(item.id)}>
      <View style={styles.jobItemHeader}>
         <Text style={styles.jobTitle}>{item.title}</Text>
         <Text style={styles.jobDate}>
           {new Date(item.created_at).toLocaleDateString()}
         </Text>
      </View>
      <Text style={styles.jobDetail}>Status: <Text style={styles.jobStatus}>{item.status}</Text></Text>
      {item.pickup_locations?.[0] && (
          <Text style={styles.jobDetail}>
              From: {item.pickup_locations[0].city}, {item.pickup_locations[0].province}
          </Text>
      )}
       {item.job_receivers?.[0] && (
          <Text style={styles.jobDetail}>
              To: {item.job_receivers[0].company_name}
          </Text>
      )}
       {item.job_generators?.[0] && (
          <Text style={styles.jobDetail}>
              Generator Contact: {item.job_generators[0].contact_name}
          </Text>
       )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>Active Jobs</Text>

      {isLoading && !refreshing ? ( // Show initial loader only
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : jobs.length === 0 ? (
        <Text style={styles.noDataText}>No active jobs found.</Text>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={ // Add pull-to-refresh
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#343a40',
  },
  loader: {
    marginTop: 50,
  },
  errorText: {
    color: '#dc3545',
    marginTop: 50,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#6c757d',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  jobItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  jobItemHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     marginBottom: 8,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    flexShrink: 1, // Allow title to shrink if needed
    paddingRight: 8,
  },
  jobDate: {
     fontSize: 12,
     color: '#6c757d',
     flexShrink: 0, // Don't allow date to shrink
  },
  jobDetail: {
    fontSize: 14,
    color: '#495057',
    marginTop: 3,
  },
  jobStatus: {
     fontWeight: '500',
     textTransform: 'capitalize',
  },
}); 