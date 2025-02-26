export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          age: number
          gender: string
          bio: string
          location_lat: number
          location_lng: number
          location_city: string
          profile_picture: string
          skills: string[]
          last_active: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          age: number
          gender: string
          bio: string
          location_lat: number
          location_lng: number
          location_city: string
          profile_picture: string
          skills?: string[]
          last_active?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          age?: number
          gender?: string
          bio?: string
          location_lat?: number
          location_lng?: number
          location_city?: string
          profile_picture?: string
          skills?: string[]
          last_active?: string
          created_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          user_id: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          max_distance: number
          min_age: number
          max_age: number
          gender_preference: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          max_distance: number
          min_age: number
          max_age: number
          gender_preference?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          max_distance?: number
          min_age?: number
          max_age?: number
          gender_preference?: string[]
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          created_at: string
        }
        Insert: {
          id?: string
          created_at?: string
        }
        Update: {
          id?: string
          created_at?: string
        }
      }
      conversation_participants: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          timestamp: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          timestamp?: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          timestamp?: string
          read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
