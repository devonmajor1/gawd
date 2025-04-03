import React, { useState, useEffect } from 'react';
import { ScrollView, SafeAreaView, StyleSheet, Text, View, ActivityIndicator, Alert } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types'; // Ensure path is correct
import { RootStackParamList } from '../App'; // Ensure path is correct

// Define the structure for the fully detailed pickup record based on the *revised* schema
// Make sure this accurately reflects the data structure returned by the query below
type DetailedPickup = Pick<
  Database['public']['Tables']['pickups']['Row'],
  'id' | 'pickup_date_time' | 'quantity_loaded' | 'quantity_unit' | 'status' | 'notes' | 'unloaded_at' | 'material_type' | 'load_profile_id'
> & {
    jobs: ({
        id: string;
        title: string | null;
        transport_company: string | null; // Added to jobs table
        job_generators: ({ // Array, expect one?
            contact_name: string | null;
            telephone: string | null;
            email: string | null;
            company_name: string | null; // Added to job_generators
            address: string | null;      // Added to job_generators
            city: string | null;         // Added to job_generators
            province: string | null;     // Added to job_generators
            postal_code: string | null;  // Added to job_generators
            soil_quality_contact_name: string | null; // Added to job_generators
            soil_quality_contact_tel: string | null;  // Added to job_generators
            soil_quality_contact_email: string | null;// Added to job_generators
        } | null)[] | null;
        pickup_locations: ({ // Array, expect one?
            address: string | null;
            city: string | null;
            province: string | null;
            postal_code: string | null;
            latitude: number | null;  // Added to pickup_locations
            longitude: number | null; // Added to pickup_locations
        } | null)[] | null;
        job_receivers: ({ // Array, expect one?
            company_name: string | null;
            address: string | null;
            city: string | null;
            province: string | null;
            postal_code: string | null;
        } | null)[] | null;
    }) | null;
    drivers: Pick<Database['public']['Tables']['drivers']['Row'], 'name' | 'license_number'> | null; // Select specific driver fields
    vehicles: Pick<Database['public']['Tables']['vehicles']['Row'], 'plate_number' | 'type'> | null; // Select specific vehicle fields
};


// Define the route prop type for this screen
type HaulingRecordViewRouteProp = RouteProp<RootStackParamList, 'HaulingRecordView'>;

export default function HaulingRecordViewScreen() {
    const route = useRoute<HaulingRecordViewRouteProp>();
    const { pickupId } = route.params ?? {}; // Get pickupId, handle potential undefined params

    const [pickupData, setPickupData] = useState<DetailedPickup | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 3. Implement useEffect for Data Fetching
    useEffect(() => {
        const fetchDetailedPickup = async () => {
            if (!pickupId) {
                setError("No Pickup ID provided.");
                setLoading(false);
                Alert.alert("Error", "Could not load details: No Pickup ID found.");
                return;
            }
            console.log("Fetching details for pickup:", pickupId);
            setLoading(true);
            setError(null);
            setPickupData(null); // Clear previous data

            try {
                // Define the comprehensive Supabase query
                const { data, error: fetchError } = await supabase
                    .from('pickups')
                    .select(`
                        id,
                        pickup_date_time,
                        quantity_loaded,
                        quantity_unit,
                        status,
                        notes,
                        unloaded_at,
                        material_type,
                        load_profile_id,
                        jobs (
                            id,
                            title,
                            transport_company,
                            job_generators (
                                contact_name, telephone, email,
                                company_name, address, city, province, postal_code,
                                soil_quality_contact_name, soil_quality_contact_tel, soil_quality_contact_email
                            ),
                            pickup_locations (
                                address, city, province, postal_code,
                                latitude, longitude
                            ),
                            job_receivers (
                                company_name, address, city, province, postal_code
                            )
                        ),
                        drivers ( name, license_number ),
                        vehicles ( plate_number, type )
                    `)
                    .eq('id', pickupId)
                    .single(); // Expecting only one record

                if (fetchError) throw fetchError; // Throw error to be caught below
                if (!data) throw new Error("Pickup not found."); // Handle case where query succeeds but finds no data

                // Cast the fetched data to our detailed type
                setPickupData(data as DetailedPickup);
                console.log("Fetched Pickup Data:", data);

            } catch (err: any) {
                console.error("Error fetching pickup details:", err);
                setError("Failed to load pickup details: " + (err.message || "Unknown error"));
                Alert.alert("Error", "Could not load pickup details. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchDetailedPickup();
    }, [pickupId]); // Re-run effect if pickupId changes


    // --- Helper function to display data or a fallback ---
    const display = (value: string | number | null | undefined, fallback = 'N/A') => value ?? fallback;
    const displayDate = (value: string | null | undefined, fallback = 'N/A') => value ? new Date(value).toLocaleString() : fallback;
    // Specific formatter for Lat/Lon to handle precision
    const displayCoord = (value: number | null | undefined, fallback = 'N/A') => value ? value.toFixed(4) : fallback; // Adjust precision as needed

    // 4. Render Loading / Error / Data
    if (loading) {
        return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color="#007AFF" /></SafeAreaView>;
    }

    if (error || !pickupData) {
        return <SafeAreaView style={styles.centered}><Text style={styles.errorText}>{error || "Pickup data not available."}</Text></SafeAreaView>;
    }

    // --- Extract data for easier access (handle nulls carefully) ---
    // Use optional chaining and nullish coalescing extensively
    const job = pickupData.jobs;
    const generator = job?.job_generators?.[0]; // Assuming the first generator is relevant
    const pickupLocation = job?.pickup_locations?.[0]; // Assuming the first location
    const receiver = job?.job_receivers?.[0]; // Assuming the first receiver
    const driver = pickupData.drivers;
    const vehicle = pickupData.vehicles;

    // --- Render the document-like view ---
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                {/* Render only the main title initially */}
                <Text style={styles.mainTitle}>{display(job?.title, 'Hauling Record')}</Text>

                {/* --- Temporarily Comment Out All Sections --- */}

                {/*
                // Section: Generator (Project Area)
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Generator (Project Area)</Text>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Contact Name:</Text>
                        <Text style={styles.value}>{display(generator?.contact_name)}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Telephone:</Text>
                        <Text style={styles.value}>{display(generator?.telephone)}</Text>
                    </View>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>{display(generator?.email)}</Text>
                    </View>
                     <View style={styles.separator} />
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Generating Company:</Text>
                        <Text style={styles.value}>{display(generator?.company_name)}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Address:</Text>
                        <Text style={styles.value}>
                           {`${display(generator?.address)}, ${display(generator?.city)}, ${display(generator?.province)} ${display(generator?.postal_code)}`}
                        </Text>
                    </View>
                </View>
                */}

                {/*
                // Section: Generating Site (Project Area)
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Generating Site (Project Area)</Text>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Pick-up Location:</Text>
                        <Text style={styles.value}>
                            {`${display(pickupLocation?.address)}, ${display(pickupLocation?.city)}, ${display(pickupLocation?.province)} ${display(pickupLocation?.postal_code)}`}
                        </Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Date/Time Loaded:</Text>
                        <Text style={styles.value}>{displayDate(pickupData.pickup_date_time)}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Lat.:</Text>
                        <Text style={styles.value}>{displayCoord(pickupLocation?.latitude)}</Text>
                        <Text style={[styles.label, { marginLeft: 10 }]}>Lon.:</Text>
                        <Text style={styles.value}>{displayCoord(pickupLocation?.longitude)}</Text>
                    </View>
                </View>
                */}

                {/*
                // Section: Load Information
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Load Information</Text>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Quantity Loaded:</Text>
                        <Text style={styles.value}>{`${display(pickupData.quantity_loaded)} ${display(pickupData.quantity_unit)}`}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Material Type:</Text>
                        <Text style={styles.value}>{display(pickupData.material_type)}</Text>
                    </View>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Load Profile ID:</Text>
                        <Text style={styles.value}>{display(pickupData.load_profile_id)}</Text>
                    </View>
                    <View style={styles.separator} />
                    <Text style={styles.subHeader}>(For Soil Quality Info)</Text>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Contact Name:</Text>
                        <Text style={styles.value}>{display(generator?.soil_quality_contact_name)}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Tel:</Text>
                        <Text style={styles.value}>{display(generator?.soil_quality_contact_tel)}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.value}>{display(generator?.soil_quality_contact_email)}</Text>
                    </View>
                </View>
                */}

                {/*
                // Section: Transporter
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Transporter</Text>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Transport Company:</Text>
                        <Text style={styles.value}>{display(job?.transport_company)}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>Driver Name:</Text>
                        <Text style={styles.value}>{display(driver?.name)}</Text>
                    </View>
                    <View style={styles.fieldRow}>
                        <Text style={styles.label}>License Plate:</Text>
                        <Text style={styles.value}>{display(vehicle?.plate_number)}</Text>
                    </View>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Vehicle Type:</Text>
                        <Text style={styles.value}>{display(vehicle?.type)}</Text>
                    </View>
                </View>
                */}

                {/*
                // Section: Receiver
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Receiver</Text>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Receiving Company:</Text>
                        <Text style={styles.value}>{display(receiver?.company_name)}</Text>
                    </View>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Address:</Text>
                        <Text style={styles.value}>
                           {`${display(receiver?.address)}, ${display(receiver?.city)}, ${display(receiver?.province)} ${display(receiver?.postal_code)}`}
                        </Text>
                    </View>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Date/Time Unloaded:</Text>
                        <Text style={styles.value}>{displayDate(pickupData.unloaded_at)}</Text>
                    </View>
                </View>
                */}

                {/*
                 // Section: Authorization
                 <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Authorization</Text>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Authorizer Name:</Text>
                         <Text style={styles.value}>{display(generator?.soil_quality_contact_name)}</Text>
                    </View>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Tel:</Text>
                         <Text style={styles.value}>{display(generator?.soil_quality_contact_tel)}</Text>
                    </View>
                     <View style={styles.fieldRow}>
                        <Text style={styles.label}>Signature:</Text>
                         <Text style={styles.value}>____________________</Text>
                    </View>
                 </View>
                 */}

                 {/*
                  // Section: Notes
                  {pickupData.notes && (
                    <View style={[styles.section, styles.noBorder]}>
                        <Text style={styles.sectionTitle}>Notes</Text>
                        <Text style={styles.value}>{pickupData.notes}</Text>
                    </View>
                  )}
                 */}

            </ScrollView>
        </SafeAreaView>
    );
}

// 4. Add Styles (mimicking the form structure)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff', // White background like a document
    },
    content: {
        padding: 20, // Add padding around the content
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 25,
        color: '#333',
    },
    section: {
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0', // Lighter separator
    },
    noBorder: {
        borderBottomWidth: 0,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600', // Semi-bold
        marginBottom: 12,
        color: '#444',
    },
    subHeader: {
        fontSize: 14,
        fontStyle: 'italic',
        color: '#666',
        marginBottom: 8,
        marginTop: 5,
    },
    fieldRow: {
        flexDirection: 'row',
        marginBottom: 6,
        alignItems: 'flex-start', // Align items at the start
    },
    label: {
        fontSize: 14,
        fontWeight: '500', // Medium weight for labels
        color: '#555',
        marginRight: 8,
        minWidth: 120, // Ensure labels align somewhat
        flexShrink: 0, // Prevent labels from shrinking too much
    },
    value: {
        fontSize: 14,
        color: '#333',
        flex: 1, // Allow value to take remaining space and wrap
    },
    separator: {
        height: 1,
        backgroundColor: '#f0f0f0', // Very light separator
        marginVertical: 10,
    },
    errorText: {
        color: '#dc3545', // Red for errors
        textAlign: 'center',
        fontSize: 16,
    },
}); 