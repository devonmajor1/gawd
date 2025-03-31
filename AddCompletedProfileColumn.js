// Utility script to add 'completed_profile' column to profiles table
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
  },
});

async function addCompletedProfileColumn() {
  try {
    // Check if the column already exists (this requires admin privileges, may not work with anon key)
    console.log('Attempting to add completed_profile column to profiles table...');
    
    // Approach 1: Use RPC to execute SQL (requires custom function on Supabase)
    // const { error: rpcError } = await supabase.rpc('add_column_if_not_exists', { 
    //   table_name: 'profiles',
    //   column_name: 'completed_profile',
    //   column_type: 'boolean'
    // });
    
    // Approach 2: Update all existing records with the new column value
    // This will use the new column automatically even if it doesn't exist yet
    console.log('Setting completed_profile=true for all existing profiles with names...');
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        completed_profile: true,
        updated_at: new Date().toISOString()
      })
      .not('first_name', 'is', null)
      .not('last_name', 'is', null);
      
    if (updateError) {
      console.error('Error updating records:', updateError);
      return;
    }
    
    console.log('Successfully updated existing profiles. Check if the column was created automatically.');
    console.log('If not, you may need to manually add the column in the Supabase dashboard.');
    console.log('Go to Table Editor > profiles > Edit table > Add column:');
    console.log('Name: completed_profile, Type: boolean, Default Value: false');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
addCompletedProfileColumn().catch(console.error); 