import { User, Gender } from '../types';
import { supabase } from '../lib/supabase';
import { mockUsers, calculateDistance } from './mockData'; // Keep mock data for fallback

// Simulate current user's location (New York City)
const currentLocation = {
  latitude: 40.7128,
  longitude: -74.006,
};

// Get all users except current user
export const getUsers = async (currentUserId: string): Promise<User[]> => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        photos (url),
        user_preferences (max_distance, min_age, max_age, gender_preference)
      `)
      .neq('id', currentUserId);
    
    if (error) throw error;
    
    // Transform data to match our User type
    return users.map(user => ({
      id: user.id,
      name: user.name,
      age: user.age,
      gender: user.gender as Gender,
      bio: user.bio,
      location: {
        latitude: user.location_lat,
        longitude: user.location_lng,
        city: user.location_city,
      },
      profilePicture: user.profile_picture,
      photos: user.photos.map((photo: any) => photo.url),
      skills: user.skills,
      preferences: {
        distance: user.user_preferences[0]?.max_distance || 50,
        ageRange: [
          user.user_preferences[0]?.min_age || 18, 
          user.user_preferences[0]?.max_age || 99
        ],
        genderPreference: user.user_preferences[0]?.gender_preference || [],
      },
      lastActive: user.last_active,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    // Fallback to mock data if Supabase fails
    return mockUsers.filter(user => user.id !== currentUserId);
  }
};

// Get a specific user by ID
export const getUserById = async (userId: string): Promise<User | undefined> => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        photos (url),
        user_preferences (max_distance, min_age, max_age, gender_preference)
      `)
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    if (!user) return undefined;
    
    // Transform data to match our User type
    return {
      id: user.id,
      name: user.name,
      age: user.age,
      gender: user.gender as Gender,
      bio: user.bio,
      location: {
        latitude: user.location_lat,
        longitude: user.location_lng,
        city: user.location_city,
      },
      profilePicture: user.profile_picture,
      photos: user.photos.map((photo: any) => photo.url),
      skills: user.skills,
      preferences: {
        distance: user.user_preferences[0]?.max_distance || 50,
        ageRange: [
          user.user_preferences[0]?.min_age || 18, 
          user.user_preferences[0]?.max_age || 99
        ],
        genderPreference: user.user_preferences[0]?.gender_preference || [],
      },
      lastActive: user.last_active,
    };
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    // Fallback to mock data if Supabase fails
    return mockUsers.find(user => user.id === userId);
  }
};

// Filter users based on criteria
export const filterUsers = async (
  currentUserId: string,
  maxDistance?: number,
  ageRange?: [number, number],
  genders?: Gender[],
  skills?: string[]
): Promise<User[]> => {
  try {
    // Get all users first, then filter client-side
    // For a production app, you'd want to do most filtering in the database
    const users = await getUsers(currentUserId);
    
    return users.filter(user => {
      // Filter by distance
      if (maxDistance) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          user.location.latitude,
          user.location.longitude
        );
        if (distance > maxDistance) {
          return false;
        }
      }
      
      // Filter by age range
      if (ageRange && (user.age < ageRange[0] || user.age > ageRange[1])) {
        return false;
      }
      
      // Filter by gender
      if (genders && genders.length > 0 && !genders.includes(user.gender)) {
        return false;
      }
      
      // Filter by skills
      if (skills && skills.length > 0) {
        const hasMatchingSkill = user.skills.some(skill => 
          skills.includes(skill)
        );
        if (!hasMatchingSkill) {
          return false;
        }
      }
      
      return true;
    });
  } catch (error) {
    console.error('Error filtering users:', error);
    // Fallback to mock data
    return filterUsers(currentUserId, maxDistance, ageRange, genders, skills);
  }
};

// Sort users by distance
export const sortUsersByDistance = (users: User[]): User[] => {
  return [...users].sort((a, b) => {
    const distanceA = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      a.location.latitude,
      a.location.longitude
    );
    const distanceB = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      b.location.latitude,
      b.location.longitude
    );
    return distanceA - distanceB;
  });
};

// Update user profile
export const updateUserProfile = async (
  userId: string, 
  profileData: Partial<User>
): Promise<User | undefined> => {
  try {
    // Transform data for Supabase
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
    
    // Update the user record
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
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
        .eq('user_id', userId);
      
      if (prefError) throw prefError;
    }
    
    // Get the full updated user with all relations
    return getUserById(userId);
  } catch (error) {
    console.error('Error updating user profile:', error);
    // Fallback for mock data
    const userIndex = mockUsers.findIndex(user => user.id === userId);
    if (userIndex === -1) return undefined;
    
    const updatedUser = {
      ...mockUsers[userIndex],
      ...profileData,
    };
    
    return updatedUser;
  }
};
