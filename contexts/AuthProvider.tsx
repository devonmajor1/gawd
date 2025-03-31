import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define a type for your profile data
interface Profile {
  id: string; // Usually matches auth.users.id
  first_name: string | null;
  last_name: string | null;
  completed_profile: boolean | null; // Flag to track if profile was ever completed
  // Add other profile fields as needed
  updated_at?: string;
}

const AuthContext = createContext<{
  session: Session | null;
  user: User | null; // Expose the user object
  profile: Profile | null; // Add profile state
  loading: boolean;
  refreshProfile: (() => Promise<void>) | null; // Function to refresh profile
}>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  refreshProfile: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null); // Store user separately
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Overall loading including initial profile fetch
  const [profileLoading, setProfileLoading] = useState(false); // Specific loading for profile fetch
  const [initError, setInitError] = useState<string | null>(null); // Track initialization errors

  // Function to fetch profile
  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      console.log('AuthProvider.fetchProfile: No user, clearing profile.');
      setProfile(null);
      return;
    }
    console.log(`AuthProvider.fetchProfile: Fetching profile for user ${currentUser.id}...`);
    setProfileLoading(true);
    
    try {
      // Create a timeout promise that rejects after 3 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 2000); // Reduced from 3000ms to 2000ms
      });
      
      // Create the actual query promise - First try with all fields including completed_profile
      // If that fails, we'll fall back to just the basic fields
      const queryPromise = supabase
        .from('profiles')
        .select(`id, first_name, last_name, completed_profile, updated_at`)
        .eq('id', currentUser.id)
        .single();
        
      // Race the two promises
      console.log(`AuthProvider.fetchProfile: Running select query with timeout for user ${currentUser.id}...`);
      
      try {
        // First try with all columns
        const { data, error, status } = await Promise.race([
          queryPromise,
          timeoutPromise.then(() => { 
            throw new Error('Profile fetch timeout');
          })
        ]) as any; // Type assertion needed due to race
        
        console.log(`AuthProvider.fetchProfile: Query finished with status: ${status}, Error: ${error?.message || 'none'}`);
  
        if (error && status !== 406) { // 406 means no rows found, which is ok
          if (error.message?.includes('completed_profile')) {
            // Column doesn't exist, fall back to basic query
            console.warn('AuthProvider.fetchProfile: completed_profile column may not exist, trying fallback');
            throw new Error('Column does not exist');
          } else {
            console.error('AuthProvider.fetchProfile: Error fetching profile', error);
            setProfile(null);
          }
        } else if (data) {
          console.log('AuthProvider.fetchProfile: Profile fetched successfully', data);
          setProfile(data as Profile);
        } else {
          console.log('AuthProvider.fetchProfile: No profile found (status 406 or null data).');
          setProfile(null); // Explicitly set to null if no profile found
        }
      } catch (e: any) {
        // If we get here with a "Column does not exist" error, try the fallback
        if (e.message === 'Column does not exist') {
          console.log('AuthProvider.fetchProfile: Trying fallback without completed_profile column');
          
          try {
            // Fallback query without completed_profile column
            const fallbackQuery = supabase
              .from('profiles')
              .select(`id, first_name, last_name, updated_at`)
              .eq('id', currentUser.id)
              .single();
              
            const { data: fallbackData, error: fallbackError } = await fallbackQuery;
            
            if (fallbackError && fallbackError.code !== '406') {
              console.error('AuthProvider.fetchProfile: Error in fallback query', fallbackError);
              setProfile(null);
            } else if (fallbackData) {
              console.log('AuthProvider.fetchProfile: Fallback query successful', fallbackData);
              // Convert the data to include completed_profile property
              const profileWithCompletedFlag = {
                ...fallbackData,
                // Set completed_profile based on whether first_name and last_name exist
                completed_profile: !!(fallbackData.first_name && fallbackData.last_name)
              };
              setProfile(profileWithCompletedFlag as Profile);
            } else {
              console.log('AuthProvider.fetchProfile: No profile found in fallback query');
              setProfile(null);
            }
          } catch (fallbackError) {
            console.error('AuthProvider.fetchProfile: Exception in fallback query', fallbackError);
            setProfile(null);
          }
        } else {
          // Not a column error, just pass through
          console.error("AuthProvider.fetchProfile: Exception during fetch:", e?.message || e);
          setProfile(null);
        }
      }
    } catch (e: any) {
      console.error("AuthProvider.fetchProfile: Top-level exception:", e?.message || e);
      // Still set profile to null on error (avoid undefined state)
      setProfile(null);
    } finally {
      console.log(`AuthProvider.fetchProfile: Setting profileLoading to false in finally block.`);
      setProfileLoading(false);
    }
  }, []); // Empty dependency array, relies on currentUser passed in

  // Function exposed to consumers to manually refresh profile
  const refreshProfile = useCallback(async () => {
    console.log('AuthProvider.refreshProfile: Manual refresh requested.');
    if (user) {
      try {
        await fetchProfile(user);
      } catch (e) {
        console.error('AuthProvider.refreshProfile: Error refreshing profile:', e);
      }
    } else {
      console.log('AuthProvider.refreshProfile: No user to refresh profile for.');
    }
  }, [user, fetchProfile]); // Re-create if user or fetchProfile changes

  // Effect for initial session fetch
  useEffect(() => {
    let isMounted = true;
    
    // FAILSAFE: Set loading to false after timeout
    const failsafeTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('AuthProvider: FAILSAFE TRIGGERED - Setting loading to false after timeout');
        setLoading(false);
        setInitError('Initialization timed out. Please restart the app.');
      }
    }, 3000);

    // Prevent logout during page refreshes for web
    if (Platform.OS === 'web') {
      // Listen for beforeunload to save a flag indicating we're refreshing
      window.addEventListener('beforeunload', () => {
        try {
          localStorage.setItem('page_refreshing', 'true');
          console.log('AuthProvider: Page refresh detected, setting refresh flag');
        } catch (e) {
          console.error('AuthProvider: Error setting refresh flag', e);
        }
      });
    }

    const initializeAuth = async () => {
      setLoading(true);
      console.log('AuthProvider.initializeAuth: Starting...');
      
      // Check for refresh flag (web only)
      let isRefreshing = false;
      if (Platform.OS === 'web') {
        try {
          isRefreshing = localStorage.getItem('page_refreshing') === 'true';
          if (isRefreshing) {
            console.log('AuthProvider: Detected this is a page refresh');
            // Clear the flag
            localStorage.removeItem('page_refreshing');
          }
        } catch (e) {
          console.error('AuthProvider: Error checking refresh flag', e);
        }
      }
      
      try {
        // Create a timeout promise for getSession
        const sessionTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getSession timeout')), 2000);
        });
        
        // 1. Get session from storage with timeout
        console.log('AuthProvider.initializeAuth: Calling getSession()...');
        
        let initialSession: Session | null = null;
        try {
          // Race getSession with a timeout
          const { data } = await Promise.race([
            supabase.auth.getSession(),
            sessionTimeoutPromise.then(() => { 
              throw new Error('getSession timeout');
            })
          ]) as any;
          
          initialSession = data.session;
          console.log('AuthProvider.initializeAuth: getSession() finished. Session:', initialSession ? initialSession.user.id : 'null');
          
          // If no session but we were refreshing, try to recover the session
          if (!initialSession && isRefreshing && Platform.OS === 'web') {
            console.log('AuthProvider: Page refresh lost session, attempting recovery...');
            
            try {
              // Try to get user ID from local storage
              const userId = localStorage.getItem('last_user_id');
              if (userId) {
                console.log(`AuthProvider: Found last user ID ${userId}, forcing refresh`);
                // Force a refresh
                const { data: refreshData, error } = await supabase.auth.refreshSession();
                
                if (error) {
                  console.error('AuthProvider: Session recovery failed', error);
                  // Try to retrieve the token directly from storage as last resort
                  const storedToken = await AsyncStorage.getItem('supabase.auth.token');
                  if (storedToken) {
                    console.log('AuthProvider: Found stored token, attempting to set auth');
                    try {
                      const parsedToken = JSON.parse(storedToken);
                      const { data: sessionData, error: setSessionError } = 
                        await supabase.auth.setSession(parsedToken);
                      
                      if (setSessionError) {
                        console.error('AuthProvider: Error setting session from storage', setSessionError);
                      } else if (sessionData.session) {
                        console.log('AuthProvider: Successfully recovered session from storage');
                        initialSession = sessionData.session;
                      }
                    } catch (e) {
                      console.error('AuthProvider: Error parsing stored token', e);
                    }
                  }
                } else if (refreshData.session) {
                  console.log('AuthProvider: Successfully refreshed session');
                  initialSession = refreshData.session;
                }
              }
            } catch (e) {
              console.error('AuthProvider: Session recovery attempt failed', e);
            }
          }
        } catch (e: any) {
          console.error('AuthProvider.initializeAuth: getSession error or timeout:', e?.message || e);
          // Continue without a session (treat as logged out)
          initialSession = null;
        }
        
        if (!isMounted) {
          console.log('AuthProvider.initializeAuth: Component unmounted after getSession. Aborting.');
          return;
        }

        // 2. Update session and user state
        setSession(initialSession);
        const currentUser = initialSession?.user ?? null;
        setUser(currentUser);

        // Store the user ID for session recovery on refresh (web only)
        if (Platform.OS === 'web' && currentUser?.id) {
          try {
            localStorage.setItem('last_user_id', currentUser.id);
            console.log(`AuthProvider: Stored user ID ${currentUser.id} for refresh recovery`);
          } catch (e) {
            console.error('AuthProvider: Error storing user ID', e);
          }
        } else if (Platform.OS === 'web' && !currentUser) {
          // Clear the stored user ID if logging out
          try {
            localStorage.removeItem('last_user_id');
            console.log('AuthProvider: Cleared stored user ID (logout)');
          } catch (e) {
            console.error('AuthProvider: Error clearing user ID', e);
          }
        }

        // 3. Check localStorage first to see if profile was already completed
        let profileCompletedInLocalStorage = false;
        if (currentUser && Platform.OS === 'web') {
          try {
            const storedValue = await AsyncStorage.getItem(`profile_completed_${currentUser.id}`);
            profileCompletedInLocalStorage = storedValue === 'true';
            
            if (profileCompletedInLocalStorage) {
              console.log('AuthProvider.initializeAuth: Found completed profile flag in localStorage');
              // If we know the profile is complete, we can set a minimal profile to speed up loading
              setProfile({
                id: currentUser.id,
                first_name: 'User', // Placeholder value
                last_name: 'Name',  // Placeholder value
                completed_profile: true,
                updated_at: new Date().toISOString()
              });
              
              // Set loading to false early to show the main UI faster
              setLoading(false);
              clearTimeout(failsafeTimeout);
              
              // Fetch the real profile in the background
              setTimeout(() => {
                fetchProfile(currentUser).catch(console.error);
              }, 100);
              
              return; // Exit initialization early
            }
          } catch (e) {
            console.error('AuthProvider.initializeAuth: Error checking localStorage:', e);
            // Continue with normal flow if localStorage check fails
          }
        }

        // 4. If no localStorage flag, fetch profile as usual
        if (currentUser) {
          console.log('AuthProvider.initializeAuth: Calling fetchProfile...');
          try {
            await fetchProfile(currentUser);
          } catch (e: any) {
            console.error('AuthProvider.initializeAuth: fetchProfile error:', e?.message || e);
            // Continue with null profile if fetch fails
            setProfile(null);
          }
        } else {
          console.log('AuthProvider.initializeAuth: No user, skipping profile fetch.');
        }
        
        if (!isMounted) {
          console.log('AuthProvider.initializeAuth: Component unmounted after fetchProfile. Aborting.');
          return;
        }

      } catch (e: any) {
        console.error("AuthProvider.initializeAuth: Unhandled error during initialization:", e?.message || e);
        setInitError(e?.message || 'Unknown initialization error');
        // Ensure default states in case of error
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          console.log('AuthProvider.initializeAuth: Setting loading to false in finally block.');
          setLoading(false);
          clearTimeout(failsafeTimeout); // Clear the failsafe since we're done
        } else {
          console.log('AuthProvider.initializeAuth: Component unmounted before finally block. Cannot set loading to false.');
        }
        console.log('AuthProvider.initializeAuth: Finished.');
      }
    };

    // Start initialization
    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimeout); // Clean up failsafe timeout
      
      // Remove beforeunload event listener
      if (Platform.OS === 'web') {
        window.removeEventListener('beforeunload', () => {});
      }
      
      console.log('AuthProvider.initializeAuth: Effect cleanup.');
    };
  }, [fetchProfile]); // Depend on fetchProfile

  // Effect for listening to auth state changes 
  useEffect(() => {
    let isMounted = true;
    let previousUserId: string | null = null;
    let refreshInProgress = false;

    // Handle window focus changes (for web)
    const handleFocusChange = async () => {
      if (Platform.OS === 'web' && isMounted && user && !refreshInProgress) {
        // Don't refresh if we've been away less than 5 seconds (tab switch)
        if (Date.now() - lastFocusTime < 5000) {
          console.log('AuthProvider: Recent tab switch detected, skipping refresh');
          return;
        }
        
        console.log('AuthProvider: Window focus changed, refreshing profile');
        refreshInProgress = true;
        
        // Check localStorage first
        let skipProfileFetch = false;
        try {
          const storedValue = await AsyncStorage.getItem(`profile_completed_${user.id}`);
          if (storedValue === 'true' && profile && (profile.completed_profile || (profile.first_name && profile.last_name))) {
            console.log('AuthProvider: Profile already complete according to localStorage, skipping fetch');
            skipProfileFetch = true;
          }
        } catch (e) {
          console.error('AuthProvider: Error checking localStorage on focus:', e);
        }
        
        // Only fetch profile if needed
        if (!skipProfileFetch) {
          try {
            await fetchProfile(user);
          } catch (e) {
            console.error('AuthProvider: Error refreshing profile on focus change:', e);
          }
        }
        
        refreshInProgress = false;
      }
      
      lastFocusTime = Date.now();
    };
    
    // Track when focus events happen
    let lastFocusTime = Date.now();

    // Add focus/blur listeners for web
    if (Platform.OS === 'web') {
      window.addEventListener('focus', handleFocusChange);
      window.addEventListener('blur', () => {
        console.log('AuthProvider: Window lost focus');
      });
    }

    console.log('AuthProvider.onAuthStateChange: Setting up listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) {
        console.log('AuthProvider.onAuthStateChange: Component unmounted during callback. Aborting.');
        return;
      }
      
      if (refreshInProgress) {
        console.log('AuthProvider.onAuthStateChange: Refresh already in progress, deferring');
        return;
      }
      
      refreshInProgress = true;
      
      const newUserId = newSession?.user?.id || null;
      console.log('AuthProvider.onAuthStateChange: Triggered. Event:', _event, 'New Session:', newUserId ? newUserId : 'null', 'Previous User:', previousUserId ? previousUserId : 'null');
      
      // Special handling for same user - could be a refresh or tab switch
      if (newUserId && newUserId === previousUserId && _event !== 'SIGNED_OUT') {
        console.log('AuthProvider.onAuthStateChange: Same user detected, may be a refresh or tab switch');
        
        // If we detected a recent focus/tab change, don't refresh
        if (Date.now() - lastFocusTime < 2000) {
          console.log('AuthProvider.onAuthStateChange: Recent tab/focus change detected, skipping refresh');
          refreshInProgress = false;
          return;
        }
        
        // Check if we already have a profile loaded
        if (profile && (profile.completed_profile || (profile.first_name && profile.last_name))) {
          console.log('AuthProvider.onAuthStateChange: Profile already complete, skipping refresh');
          // Profile already exists and is complete, no need to refresh
          refreshInProgress = false;
          return;
        } else {
          console.log('AuthProvider.onAuthStateChange: Profile incomplete or missing, refreshing');
        }
      }
      
      // Update session/user state
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      previousUserId = newUser?.id || null; // Update previous user ID
      setUser(newUser);

      // Store the user ID for session recovery on refresh (web only)
      if (Platform.OS === 'web' && newUser?.id) {
        try {
          localStorage.setItem('last_user_id', newUser.id);
          console.log(`AuthProvider: Stored user ID ${newUser.id} for refresh recovery`);
        } catch (e) {
          console.error('AuthProvider: Error storing user ID', e);
        }
      } else if (Platform.OS === 'web' && !newUser) {
        // Clear the stored user ID if logging out
        try {
          localStorage.removeItem('last_user_id');
          console.log('AuthProvider: Cleared stored user ID (logout)');
        } catch (e) {
          console.error('AuthProvider: Error clearing user ID', e);
        }
      }

      // Fetch profile for the new user (or clear it if logged out)
      if (newUser) {
        console.log('AuthProvider.onAuthStateChange: Calling fetchProfile for new user...');
        setProfileLoading(true); // Indicate profile might be changing
        try {
          await fetchProfile(newUser);
        } catch (e: any) {
          console.error('AuthProvider.onAuthStateChange: fetchProfile error:', e?.message || e);
          // On error, ensure profile is null
          setProfile(null);
        } finally {
          // Ensure profileLoading is false even if fetchProfile threw an error
          setProfileLoading(false);
        }
      } else {
        // No user (logout), clear profile
        console.log('AuthProvider.onAuthStateChange: No user, clearing profile.');
        setProfile(null);
        setProfileLoading(false);
      }
      
      refreshInProgress = false;
      console.log('AuthProvider.onAuthStateChange: Finished handling auth state change.');
    });

    return () => {
      isMounted = false;
      console.log('AuthProvider.onAuthStateChange: Unsubscribing listener.');
      subscription.unsubscribe();
      
      // Remove web event listeners
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', handleFocusChange);
        window.removeEventListener('blur', () => {});
      }
    };
  }, [fetchProfile]); // Depend on fetchProfile

  // Determine the final loading state (initial load OR subsequent profile load)
  const combinedLoading = loading || (session !== null && profileLoading);

  // Log the state being provided
  console.log(`AuthProvider: Rendering context. session=${!!session}, user=${!!user}, profile=${!!profile}, loading=${loading}, profileLoading=${profileLoading}, combinedLoading=${combinedLoading}, initError=${!!initError}`);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading: combinedLoading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// Update useAuth hook type
export const useAuth = (): {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: (() => Promise<void>) | null;
} => useContext(AuthContext); 