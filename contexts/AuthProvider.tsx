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
  role: string | null; // Added role property
  // Add other profile fields as needed
  updated_at?: string;
}

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: string | null;
  loading: boolean;
  refreshProfile: (() => Promise<void>) | null;
  signOut: () => Promise<void>;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [generatorName, setGeneratorName] = useState('');
  const [generatorPhone, setGeneratorPhone] = useState('');
  const [generatorEmail, setGeneratorEmail] = useState('');

  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupProvince, setPickupProvince] = useState('');
  const [pickupPostalCode, setPickupPostalCode] = useState('');

  const [receiverCompany, setReceiverCompany] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverCity, setReceiverCity] = useState('');
  const [receiverProvince, setReceiverProvince] = useState('');
  const [receiverPostalCode, setReceiverPostalCode] = useState('');

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      console.log('AuthProvider.fetchProfile: No user, clearing profile and role.');
      setProfile(null);
      setRole(null);
      return;
    }
    console.log(`AuthProvider.fetchProfile: Fetching profile for user ${currentUser.id}...`);
    setProfileLoading(true);
    setRole(null);
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 2000);
      });
      
      const queryPromise = supabase
        .from('profiles')
        .select(`id, first_name, last_name, completed_profile, role, updated_at`)
        .eq('id', currentUser.id)
        .single();
        
      console.log(`AuthProvider.fetchProfile: Running select query with timeout for user ${currentUser.id}...`);
      
      try {
        const { data, error, status } = await Promise.race([
          queryPromise,
          timeoutPromise.then(() => { 
            throw new Error('Profile fetch timeout');
          })
        ]) as any;
        
        console.log(`AuthProvider.fetchProfile: Query finished with status: ${status}, Error: ${error?.message || 'none'}`);
  
        if (error && status !== 406) {
          if (error.message?.includes('completed_profile')) {
            console.warn('AuthProvider.fetchProfile: completed_profile column may not exist, trying fallback');
            throw new Error('Column does not exist');
          } else if (error.message?.includes('role')) {
            console.warn('AuthProvider.fetchProfile: role column may not exist, trying fallback without role');
            throw new Error('Role column does not exist');
          } else {
            console.error('AuthProvider.fetchProfile: Error fetching profile', error);
            setProfile(null);
            setRole(null);
          }
        } else if (data) {
          console.log('AuthProvider.fetchProfile: Profile fetched successfully', data);
          setProfile(data as Profile);
          setRole(data.role);
        } else {
          console.log('AuthProvider.fetchProfile: No profile found (status 406 or null data).');
          setProfile(null);
          setRole(null);
        }
      } catch (e: any) {
        if (e.message === 'Column does not exist' || e.message === 'Role column does not exist') {
          console.log('AuthProvider.fetchProfile: Trying fallback without specific columns (role/completed_profile)');
          try {
            const fallbackQuery = supabase
              .from('profiles')
              .select(`id, first_name, last_name, updated_at`)
              .eq('id', currentUser.id)
              .single();
              
            const { data: fallbackData, error: fallbackError } = await fallbackQuery;
            
            if (fallbackError && fallbackError.code !== '406') {
              console.error('AuthProvider.fetchProfile: Error in fallback query', fallbackError);
              setProfile(null);
              setRole(null);
            } else if (fallbackData) {
              console.log('AuthProvider.fetchProfile: Fallback query successful', fallbackData);
              const profileWithDefaults = {
                ...fallbackData,
                completed_profile: !!(fallbackData.first_name && fallbackData.last_name),
                role: null
              };
              setProfile(profileWithDefaults as Profile);
              setRole(null);
            } else {
              console.log('AuthProvider.fetchProfile: No profile found in fallback query');
              setProfile(null);
              setRole(null);
            }
          } catch (fallbackError) {
            console.error('AuthProvider.fetchProfile: Exception in fallback query', fallbackError);
            setProfile(null);
            setRole(null);
          }
        } else {
          console.error("AuthProvider.fetchProfile: Exception during fetch:", e?.message || e);
          setProfile(null);
          setRole(null);
        }
      }
    } catch (e: any) {
      console.error("AuthProvider.fetchProfile: Top-level exception:", e?.message || e);
      setProfile(null);
      setRole(null);
    } finally {
      console.log(`AuthProvider.fetchProfile: Setting profileLoading to false in finally block.`);
      setProfileLoading(false);
    }
  }, []);

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
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;
    
    const failsafeTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('AuthProvider: FAILSAFE TRIGGERED - Setting loading to false after timeout');
        setLoading(false);
        setInitError('Initialization timed out. Please restart the app.');
      }
    }, 3000);

    if (Platform.OS === 'web') {
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
      
      let isRefreshing = false;
      if (Platform.OS === 'web') {
        try {
          isRefreshing = localStorage.getItem('page_refreshing') === 'true';
          if (isRefreshing) {
            console.log('AuthProvider: Detected this is a page refresh');
            localStorage.removeItem('page_refreshing');
          }
        } catch (e) {
          console.error('AuthProvider: Error checking refresh flag', e);
        }
      }
      
      try {
        const sessionTimeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('getSession timeout')), 2000);
        });
        
        console.log('AuthProvider.initializeAuth: Calling getSession()...');
        
        let initialSession: Session | null = null;
        try {
          const { data } = await Promise.race([
            supabase.auth.getSession(),
            sessionTimeoutPromise.then(() => { 
              throw new Error('getSession timeout');
            })
          ]) as any;
          
          initialSession = data.session;
          console.log('AuthProvider.initializeAuth: getSession() finished. Session:', initialSession ? initialSession.user.id : 'null');
          
          if (!initialSession && isRefreshing && Platform.OS === 'web') {
            console.log('AuthProvider: Page refresh lost session, attempting recovery...');
            
            try {
              const userId = localStorage.getItem('last_user_id');
              if (userId) {
                console.log(`AuthProvider: Found last user ID ${userId}, forcing refresh`);
                const { data: refreshData, error } = await supabase.auth.refreshSession();
                
                if (error) {
                  console.error('AuthProvider: Session recovery failed', error);
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
          initialSession = null;
        }
        
        if (!isMounted) {
          console.log('AuthProvider.initializeAuth: Component unmounted after getSession. Aborting.');
          return;
        }

        setSession(initialSession);
        const currentUser = initialSession?.user ?? null;
        setUser(currentUser);

        if (Platform.OS === 'web' && currentUser?.id) {
          try {
            localStorage.setItem('last_user_id', currentUser.id);
            console.log(`AuthProvider: Stored user ID ${currentUser.id} for refresh recovery`);
          } catch (e) {
            console.error('AuthProvider: Error storing user ID', e);
          }
        } else if (Platform.OS === 'web' && !currentUser) {
          try {
            localStorage.removeItem('last_user_id');
            console.log('AuthProvider: Cleared stored user ID (logout)');
          } catch (e) {
            console.error('AuthProvider: Error clearing user ID', e);
          }
        }

        let profileCompletedInLocalStorage = false;
        if (currentUser && Platform.OS === 'web') {
          try {
            const storedValue = await AsyncStorage.getItem(`profile_completed_${currentUser.id}`);
            profileCompletedInLocalStorage = storedValue === 'true';
            
            if (profileCompletedInLocalStorage) {
              console.log('AuthProvider.initializeAuth: Found completed profile flag in localStorage');
              setProfile({
                id: currentUser.id,
                first_name: 'User',
                last_name: 'Name',
                completed_profile: true,
                updated_at: new Date().toISOString()
              });
              
              setLoading(false);
              clearTimeout(failsafeTimeout);
              
              setTimeout(() => {
                fetchProfile(currentUser).catch(console.error);
              }, 100);
              
              return;
            }
          } catch (e) {
            console.error('AuthProvider.initializeAuth: Error checking localStorage:', e);
          }
        }

        if (currentUser) {
          console.log('AuthProvider.initializeAuth: Calling fetchProfile...');
          try {
            await fetchProfile(currentUser);
          } catch (e: any) {
            console.error('AuthProvider.initializeAuth: fetchProfile error:', e?.message || e);
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
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          console.log('AuthProvider.initializeAuth: Setting loading to false in finally block.');
          setLoading(false);
          clearTimeout(failsafeTimeout);
        } else {
          console.log('AuthProvider.initializeAuth: Component unmounted before finally block. Cannot set loading to false.');
        }
        console.log('AuthProvider.initializeAuth: Finished.');
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(failsafeTimeout);
      
      if (Platform.OS === 'web') {
        window.removeEventListener('beforeunload', () => {});
      }
      
      console.log('AuthProvider.initializeAuth: Effect cleanup.');
    };
  }, [fetchProfile]);

  useEffect(() => {
    let isMounted = true;
    let previousUserId: string | null = null;
    let refreshInProgress = false;

    const handleFocusChange = async () => {
      if (Platform.OS === 'web' && isMounted && user && !refreshInProgress) {
        if (Date.now() - lastFocusTime < 5000) {
          console.log('AuthProvider: Recent tab switch detected, skipping refresh');
          return;
        }
        
        console.log('AuthProvider: Window focus changed, refreshing profile');
        refreshInProgress = true;
        
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
    
    let lastFocusTime = Date.now();

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
      
      if (newUserId && newUserId === previousUserId && _event !== 'SIGNED_OUT') {
        console.log('AuthProvider.onAuthStateChange: Same user detected, may be a refresh or tab switch');
        
        if (Date.now() - lastFocusTime < 2000) {
          console.log('AuthProvider.onAuthStateChange: Recent tab/focus change detected, skipping refresh');
          refreshInProgress = false;
          return;
        }
        
        if (profile && (profile.completed_profile || (profile.first_name && profile.last_name))) {
          console.log('AuthProvider.onAuthStateChange: Profile already complete, skipping refresh');
          refreshInProgress = false;
          return;
        } else {
          console.log('AuthProvider.onAuthStateChange: Profile incomplete or missing, refreshing');
        }
      }
      
      setSession(newSession);
      const newUser = newSession?.user ?? null;
      previousUserId = newUser?.id || null;
      setUser(newUser);

      if (Platform.OS === 'web' && newUser?.id) {
        try {
          localStorage.setItem('last_user_id', newUser.id);
          console.log(`AuthProvider: Stored user ID ${newUser.id} for refresh recovery`);
        } catch (e) {
          console.error('AuthProvider: Error storing user ID', e);
        }
      } else if (Platform.OS === 'web' && !newUser) {
        try {
          localStorage.removeItem('last_user_id');
          console.log('AuthProvider: Cleared stored user ID (logout)');
        } catch (e) {
          console.error('AuthProvider: Error clearing user ID', e);
        }
      }

      if (newUser) {
        console.log('AuthProvider.onAuthStateChange: Calling fetchProfile for new user...');
        setProfileLoading(true);
        try {
          await fetchProfile(newUser);
        } catch (e: any) {
          console.error('AuthProvider.onAuthStateChange: fetchProfile error:', e?.message || e);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        console.log('AuthProvider.onAuthStateChange: No user, clearing profile and role.');
        setProfile(null);
        setRole(null);
        setProfileLoading(false);
      }
      
      refreshInProgress = false;
      console.log('AuthProvider.onAuthStateChange: Finished handling auth state change.');
    });

    return () => {
      isMounted = false;
      console.log('AuthProvider.onAuthStateChange: Unsubscribing listener.');
      subscription.unsubscribe();
      
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', handleFocusChange);
        window.removeEventListener('blur', () => {});
      }
    };
  }, [fetchProfile]);

  const combinedLoading = loading || (session !== null && profileLoading);

  console.log(`AuthProvider: Rendering context. session=${!!session}, user=${!!user}, profile=${!!profile}, loading=${loading}, profileLoading=${profileLoading}, combinedLoading=${combinedLoading}, initError=${!!initError}`);

  const handleSaveJob = async () => {
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: `Job for ${receiverCompany}`,
          description: `Transportation from ${pickupCity} to ${receiverCity}`,
          status: 'draft',
          created_by: session?.user.id
        })
        .select()
        .single();
        
      if (jobError) throw jobError;
      
      const { error: generatorError } = await supabase
        .from('job_generators')
        .insert({
          job_id: jobData.id,
          contact_name: generatorName,
          telephone: generatorPhone,
          email: generatorEmail
        });
        
      if (generatorError) throw generatorError;
      
      const { error: pickupError } = await supabase
        .from('pickup_locations')
        .insert({
          job_id: jobData.id,
          address: pickupAddress,
          city: pickupCity,
          province: pickupProvince,
          postal_code: pickupPostalCode
        });
        
      if (pickupError) throw pickupError;
      
      const { error: receiverError } = await supabase
        .from('job_receivers')
        .insert({
          job_id: jobData.id,
          company_name: receiverCompany,
          address: receiverAddress,
          city: receiverCity,
          province: receiverProvince,
          postal_code: receiverPostalCode
        });
        
      if (receiverError) throw receiverError;
      
      alert('Job created successfully!');
      
    } catch (error: any) {
      console.error('Error creating job:', error);
      alert(`Error creating job: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    return (
      generatorName && 
      generatorPhone && 
      pickupAddress && 
      pickupCity && 
      pickupProvince && 
      pickupPostalCode && 
      receiverCompany && 
      receiverAddress && 
      receiverCity && 
      receiverProvince && 
      receiverPostalCode
    );
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthProvider: Sign out error", error);
    }
  };

  const value: AuthContextType = {
    session,
    user,
    profile,
    role,
    loading,
    refreshProfile,
    signOut,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 