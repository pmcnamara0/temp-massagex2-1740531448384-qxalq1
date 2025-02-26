import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Gender } from '../types';
import { supabase } from '../lib/supabase';
import { mockUsers } from '../services/mockData';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true);
        
        // Check if we have an active session
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          // Get the user profile
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select(`
              *,
              photos(url),
              user_preferences(max_distance, min_age, max_age, gender_preference)
            `)
            .eq('id', sessionData.session.user.id)
            .single();
          
          if (userError) throw userError;
          
          if (userData) {
            setCurrentUser({
              id: userData.id,
              name: userData.name,
              age: userData.age,
              gender: userData.gender as Gender,
              bio: userData.bio,
              location: {
                latitude: userData.location_lat,
                longitude: userData.location_lng,
                city: userData.location_city,
              },
              profilePicture: userData.profile_picture,
              photos: userData.photos.map((photo: any) => photo.url),
              skills: userData.skills,
              preferences: {
                distance: userData.user_preferences[0]?.max_distance || 50,
                ageRange: [
                  userData.user_preferences[0]?.min_age || 18, 
                  userData.user_preferences[0]?.max_age || 99
                ],
                genderPreference: userData.user_preferences[0]?.gender_preference || [],
              },
              lastActive: userData.last_active,
            });
            setIsAuthenticated(true);
          }
        } else {
          // For demo purposes, auto-login as the first user
          // Remove this in production!
          setCurrentUser(mockUsers[0]);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Session check error:', error);
        setError('Failed to retrieve user session');
        
        // For demo purposes
        setCurrentUser(mockUsers[0]);
        setIsAuthenticated(true);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Get the user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            *,
            photos(            photos(url),
            user_preferences(max_distance, min_age, max_age, gender_preference)
          `)
          .eq('id', data.user.id)
          .single();
        
        if (userError) throw userError;
        
        if (userData) {
          setCurrentUser({
            id: userData.id,
            name: userData.name,
            age: userData.age,
            gender: userData.gender as Gender,
            bio: userData.bio,
            location: {
              latitude: userData.location_lat,
              longitude: userData.location_lng,
              city: userData.location_city,
            },
            profilePicture: userData.profile_picture,
            photos: userData.photos.map((photo: any) => photo.url),
            skills: userData.skills,
            preferences: {
              distance: userData.user_preferences[0]?.max_distance || 50,
              ageRange: [
                userData.user_preferences[0]?.min_age || 18, 
                userData.user_preferences[0]?.max_age || 99
              ],
              genderPreference: userData.user_preferences[0]?.gender_preference || [],
            },
            lastActive: userData.last_active,
          });
          setIsAuthenticated(true);
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
      
      // For demo purposes only - remove in production!
      const mockUser = mockUsers.find(u => u.id === '1');
      if (mockUser) {
        setCurrentUser(mockUser);
        setIsAuthenticated(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Register the user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        // Create user profile
        const userProfile = {
          id: data.user.id,
          name: userData.name || 'New User',
          age: userData.age || 30,
          gender: userData.gender || 'prefer-not-to-say',
          bio: userData.bio || '',
          location_lat: userData.location?.latitude || 0,
          location_lng: userData.location?.longitude || 0,
          location_city: userData.location?.city || 'Unknown',
          profile_picture: userData.profilePicture || '',
          skills: userData.skills || [],
          last_active: new Date().toISOString(),
        };
        
        const { error: profileError } = await supabase
          .from('users')
          .insert(userProfile);
        
        if (profileError) throw profileError;
        
        // Create user preferences
        if (userData.preferences) {
          const userPreferences = {
            user_id: data.user.id,
            max_distance: userData.preferences.distance || 50,
            min_age: userData.preferences.ageRange?.[0] || 18,
            max_age: userData.preferences.ageRange?.[1] || 99,
            gender_preference: userData.preferences.genderPreference || [],
          };
          
          const { error: prefError } = await supabase
            .from('user_preferences')
            .insert(userPreferences);
          
          if (prefError) throw prefError;
        }
        
        // Set the current user
        setCurrentUser({
          id: data.user.id,
          name: userProfile.name,
          age: userProfile.age,
          gender: userProfile.gender as Gender,
          bio: userProfile.bio,
          location: {
            latitude: userProfile.location_lat,
            longitude: userProfile.location_lng,
            city: userProfile.location_city,
          },
          profilePicture: userProfile.profile_picture,
          photos: [],
          skills: userProfile.skills,
          preferences: {
            distance: userData.preferences?.distance || 50,
            ageRange: [
              userData.preferences?.ageRange?.[0] || 18,
              userData.preferences?.ageRange?.[1] || 99
            ],
            genderPreference: userData.preferences?.genderPreference || [],
          },
          lastActive: userProfile.last_active,
        });
        setIsAuthenticated(true);
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setCurrentUser(null);
      setIsAuthenticated(false);
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message || 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Update in Supabase
      const updateData: any = {};
      
      if (profileData.name) updateData.name = profileData.name;
      if (profileData.age) updateData.age = profileData.age;
      if (profileData.gender) updateData.gender = profileData.gender;
      if (profileData.bio) updateData.bio = profileData.bio;
      if (profileData.profilePicture) updateData.profile_picture = profileData.profilePicture;
      if (profileData.skills) updateData.skills = profileData.skills;
      
      if (profileData.location) {
        updateData.location_lat = profileData.location.latitude;
        updateData.location_lng = profileData.location.longitude;
        updateData.location_city = profileData.location.city;
      }
      
      // Update the user profile
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', currentUser.id);
      
      if (error) throw error;
      
      // If preferences were updated, update them separately
      if (profileData.preferences) {
        const prefData = {
          max_distance: profileData.preferences.distance,
          min_age: profileData.preferences.ageRange[0],
          max_age: profileData.preferences.ageRange[1],
          gender_preference: profileData.preferences.genderPreference,
        };
        
        const { error: prefError } = await supabase
          .from('user_preferences')
          .update(prefData)
          .eq('user_id', currentUser.id);
        
        if (prefError) throw prefError;
      }
      
      // Update local state
      setCurrentUser({
        ...currentUser,
        ...profileData,
      });
    } catch (error: any) {
      console.error('Profile update error:', error);
      setError(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      isAuthenticated,
      login,
      signUp,
      logout,
      updateProfile,
      loading,
      error,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
