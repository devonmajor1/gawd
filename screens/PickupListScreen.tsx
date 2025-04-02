import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    SafeAreaView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl, // For pull-to-refresh
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types'; // Ensure this path is correct
import { RootStackParamList } from '../App'; // Ensure this path is correct

// Define the structure for data needed in the list item
// Note: Adjust based on the actual fields returned by your select query
type PickupListItem = {
    id: string;
    pickup_date_time: string | null;
    status: string | null;
    jobs: { title: string | null } | null; // Nested job object
    drivers: { name: string | null } | null; // Nested driver object
};

// Define the specific navigation prop type for this screen
type PickupListNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PickupList'>;

export default function PickupListScreen() {
    const navigation = useNavigation<PickupListNavigationProp>();
    const isFocused = useIsFocused(); // Re-fetch when screen comes into focus

    const [pickups, setPickups] = useState<PickupListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Function to fetch pickups
    const fetchPickups = useCallback(async () => {
        console.log("Fetching pickup list...");
        // Only show full loader on initial load, not refresh
        if (!refreshing) {
            setLoading(true);
        }
        setError(null);

        try {
            // Fetch pickups, joining job title and driver name
            // Adjust the select query based on actual needs and performance
            const { data, error: fetchError } = await supabase
                .from('pickups')
                .select(`
                    id,
                    pickup_date_time,
                    status,
                    jobs ( title ),
                    drivers ( name )
                `)
                .order('pickup_date_time', { ascending: false }) // Show most recent first
                .limit(50); // Limit results for performance; implement pagination later if needed

            if (fetchError) {
                console.error("Error fetching pickups:", fetchError);
                throw fetchError;
            }

            // Explicitly cast data to the expected type
            setPickups((data as PickupListItem[]) || []);
            console.log(`Fetched ${data?.length ?? 0} pickups.`);

        } catch (err: any) {
            setError("Failed to load pickups: " + err.message);
            setPickups([]); // Clear data on error
        } finally {
             setLoading(false);
             setRefreshing(false); // Stop pull-to-refresh indicator
        }

    }, [refreshing]); // Dependency array for useCallback

    // Fetch data when the screen is focused or refreshed
    useEffect(() => {
        if (isFocused) {
            fetchPickups();
        }
    }, [fetchPickups, isFocused]);

    // Handler for pull-to-refresh action
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // fetchPickups will be called by the useEffect dependency change
    }, []);

    // Handler to navigate to the detail view
    const handleViewDetails = (pickupId: string) => {
        console.log(`Navigating to HaulingRecordView with pickupId: ${pickupId}`);
        // Ensure 'HaulingRecordView' exists in RootStackParamList and accepts 'pickupId'
        navigation.navigate('HaulingRecordView', { pickupId });
    };

    // --- Render Functions ---

    // Renders a single item in the FlatList
    const renderItem = ({ item }: { item: PickupListItem }) => (
        <TouchableOpacity style={styles.itemContainer} onPress={() => handleViewDetails(item.id)}>
            {/* Display Job Title or fallback */}
            <Text style={styles.itemTitle}>{item.jobs?.title ?? 'Job Title Unavailable'}</Text>
            {/* Display Date/Time */}
            <Text style={styles.itemDetail}>
                Date: {item.pickup_date_time ? new Date(item.pickup_date_time).toLocaleString() : 'N/A'}
            </Text>
            {/* Display Driver Name or fallback */}
            <Text style={styles.itemDetail}>
                Driver: {item.drivers?.name ?? 'N/A'}
            </Text>
            {/* Display Status */}
            <Text style={styles.itemStatus}>
                Status: {item.status ?? 'Unknown'}
            </Text>
        </TouchableOpacity>
    );

    // Renders when the list is empty
    const renderEmptyListComponent = () => (
        <View style={styles.centeredMessage}>
            <Text style={styles.noDataText}>No pickups found.</Text>
            {/* Optionally add a button to create a new pickup */}
        </View>
    );

    // --- Main Return JSX ---
    return (
        <SafeAreaView style={styles.container}>
            {/* Screen Header */}
            <Text style={styles.headerTitle}>Pickup History</Text>

            {/* Loading Indicator */}
            {loading && !refreshing && (
                <ActivityIndicator style={styles.loader} size="large" color="#007AFF" />
            )}

            {/* Error Message Display */}
            {error && !loading && (
                <View style={styles.centeredMessage}>
                    <Text style={styles.errorText}>{error}</Text>
                    {/* Optionally add a retry button */}
                </View>
             )}

            {/* Pickup List */}
            {!loading && !error && (
                <FlatList
                    data={pickups}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyListComponent} // Show message when empty
                    refreshControl={ // Enable pull-to-refresh
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={["#007AFF"]} // Spinner color
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa', // Light background
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
    centeredMessage: {
        flex: 1, // Takes up space if list is empty
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        color: '#dc3545', // Red for errors
        textAlign: 'center',
        fontSize: 16,
    },
    noDataText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#6c757d', // Muted text color
    },
    list: {
        flex: 1, // Ensure list takes available space
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20, // Space at the bottom
    },
    itemContainer: {
        backgroundColor: '#ffffff', // White background for items
        padding: 15,
        marginBottom: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#dee2e6', // Light border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1, // Subtle shadow for Android
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#212529',
        marginBottom: 5,
    },
    itemDetail: {
        fontSize: 14,
        color: '#495057', // Darker grey for details
        marginBottom: 3,
    },
    itemStatus: {
        fontSize: 14,
        color: '#6c757d', // Lighter grey for status
        fontWeight: '500',
        textTransform: 'capitalize', // Nicely format status
        marginTop: 4,
    },
}); 