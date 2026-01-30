export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_request_at: string | null
          name: string | null
          rate_limit_daily: number
          rate_limit_reset_at: string
          requests_today: number
          revoked_at: string | null
          status: Database["public"]["Enums"]["api_key_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_request_at?: string | null
          name?: string | null
          rate_limit_daily?: number
          rate_limit_reset_at?: string
          requests_today?: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["api_key_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_request_at?: string | null
          name?: string | null
          rate_limit_daily?: number
          rate_limit_reset_at?: string
          requests_today?: number
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["api_key_status"]
          user_id?: string
        }
        Relationships: []
      }
      clicks: {
        Row: {
          browser: string | null
          city: string | null
          clicked_at: string
          country: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_unique: boolean | null
          link_id: string
          os: string | null
          redirected_at: string | null
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_unique?: boolean | null
          link_id: string
          os?: string | null
          redirected_at?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_unique?: boolean | null
          link_id?: string
          os?: string | null
          redirected_at?: string | null
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          admin_notes: string | null
          browser: string | null
          created_at: string
          description: string
          device: string | null
          id: string
          is_important: boolean
          is_read: boolean
          os: string | null
          page_url: string | null
          priority: string | null
          product: string
          request_type: string
          screenshot_url: string | null
          status: string
          title: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          browser?: string | null
          created_at?: string
          description: string
          device?: string | null
          id?: string
          is_important?: boolean
          is_read?: boolean
          os?: string | null
          page_url?: string | null
          priority?: string | null
          product: string
          request_type: string
          screenshot_url?: string | null
          status?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          browser?: string | null
          created_at?: string
          description?: string
          device?: string | null
          id?: string
          is_important?: boolean
          is_read?: boolean
          os?: string | null
          page_url?: string | null
          priority?: string | null
          product?: string
          request_type?: string
          screenshot_url?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      global_counters: {
        Row: {
          id: string
          total_clicks: number
          total_links_created: number
          total_signups: number
          updated_at: string
        }
        Insert: {
          id?: string
          total_clicks?: number
          total_links_created?: number
          total_signups?: number
          updated_at?: string
        }
        Update: {
          id?: string
          total_clicks?: number
          total_links_created?: number
          total_signups?: number
          updated_at?: string
        }
        Relationships: []
      }
      links: {
        Row: {
          api_key_id: string | null
          api_source: boolean | null
          batch_id: string | null
          click_count: number | null
          created_at: string
          creepy_extension: string | null
          creepy_style: string | null
          custom_favicon: string | null
          custom_og_description: string | null
          custom_og_image: string | null
          custom_og_title: string | null
          custom_slug: string | null
          expires_at: string | null
          facebook_pixel: string | null
          final_utm_url: string | null
          folder_id: string | null
          google_pixel: string | null
          health_status:
            | Database["public"]["Enums"]["link_health_status"]
            | null
          id: string
          is_broken: boolean | null
          is_creepy: boolean | null
          is_favorite: boolean | null
          is_password_protected: boolean | null
          is_pinned: boolean | null
          is_private: boolean | null
          last_clicked_at: string | null
          last_health_check: string | null
          last_scanned_at: string | null
          max_clicks: number | null
          notify_on_broken: boolean | null
          order_index: number | null
          original_url: string
          password_hash: string | null
          safety_status: string | null
          short_code: string
          slice_duration_ms: number | null
          title: string | null
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_enabled: boolean | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          api_key_id?: string | null
          api_source?: boolean | null
          batch_id?: string | null
          click_count?: number | null
          created_at?: string
          creepy_extension?: string | null
          creepy_style?: string | null
          custom_favicon?: string | null
          custom_og_description?: string | null
          custom_og_image?: string | null
          custom_og_title?: string | null
          custom_slug?: string | null
          expires_at?: string | null
          facebook_pixel?: string | null
          final_utm_url?: string | null
          folder_id?: string | null
          google_pixel?: string | null
          health_status?:
            | Database["public"]["Enums"]["link_health_status"]
            | null
          id?: string
          is_broken?: boolean | null
          is_creepy?: boolean | null
          is_favorite?: boolean | null
          is_password_protected?: boolean | null
          is_pinned?: boolean | null
          is_private?: boolean | null
          last_clicked_at?: string | null
          last_health_check?: string | null
          last_scanned_at?: string | null
          max_clicks?: number | null
          notify_on_broken?: boolean | null
          order_index?: number | null
          original_url: string
          password_hash?: string | null
          safety_status?: string | null
          short_code: string
          slice_duration_ms?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_enabled?: boolean | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          api_key_id?: string | null
          api_source?: boolean | null
          batch_id?: string | null
          click_count?: number | null
          created_at?: string
          creepy_extension?: string | null
          creepy_style?: string | null
          custom_favicon?: string | null
          custom_og_description?: string | null
          custom_og_image?: string | null
          custom_og_title?: string | null
          custom_slug?: string | null
          expires_at?: string | null
          facebook_pixel?: string | null
          final_utm_url?: string | null
          folder_id?: string | null
          google_pixel?: string | null
          health_status?:
            | Database["public"]["Enums"]["link_health_status"]
            | null
          id?: string
          is_broken?: boolean | null
          is_creepy?: boolean | null
          is_favorite?: boolean | null
          is_password_protected?: boolean | null
          is_pinned?: boolean | null
          is_private?: boolean | null
          last_clicked_at?: string | null
          last_health_check?: string | null
          last_scanned_at?: string | null
          max_clicks?: number | null
          notify_on_broken?: boolean | null
          order_index?: number | null
          original_url?: string
          password_hash?: string | null
          safety_status?: string | null
          short_code?: string
          slice_duration_ms?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_enabled?: boolean | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_copy_enabled: boolean | null
          auto_dashboard_refresh: boolean | null
          auto_redirect_enabled: boolean | null
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email_alerts_enabled: boolean | null
          google_email: string | null
          google_linked: boolean | null
          has_password: boolean | null
          id: string
          language: string | null
          link_preview_enabled: boolean | null
          scheduled_deletion_at: string | null
          security_mode: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_copy_enabled?: boolean | null
          auto_dashboard_refresh?: boolean | null
          auto_redirect_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_alerts_enabled?: boolean | null
          google_email?: string | null
          google_linked?: boolean | null
          has_password?: boolean | null
          id?: string
          language?: string | null
          link_preview_enabled?: boolean | null
          scheduled_deletion_at?: string | null
          security_mode?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_copy_enabled?: boolean | null
          auto_dashboard_refresh?: boolean | null
          auto_redirect_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email_alerts_enabled?: boolean | null
          google_email?: string | null
          google_linked?: boolean | null
          has_password?: boolean | null
          id?: string
          language?: string | null
          link_preview_enabled?: boolean | null
          scheduled_deletion_at?: string | null
          security_mode?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_designs: {
        Row: {
          bg_color: string
          corner_radius: number
          created_at: string
          fg_color: string
          frame_text: string | null
          frame_type: string | null
          gradient_enabled: boolean
          gradient_end: string | null
          gradient_start: string | null
          gradient_type: string
          id: string
          link_id: string
          logo_size: number
          logo_url: string | null
          padding: number
          shape: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bg_color?: string
          corner_radius?: number
          created_at?: string
          fg_color?: string
          frame_text?: string | null
          frame_type?: string | null
          gradient_enabled?: boolean
          gradient_end?: string | null
          gradient_start?: string | null
          gradient_type?: string
          id?: string
          link_id: string
          logo_size?: number
          logo_url?: string | null
          padding?: number
          shape?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bg_color?: string
          corner_radius?: number
          created_at?: string
          fg_color?: string
          frame_text?: string | null
          frame_type?: string | null
          gradient_enabled?: boolean
          gradient_end?: string | null
          gradient_start?: string | null
          gradient_type?: string
          id?: string
          link_id?: string
          logo_size?: number
          logo_url?: string | null
          padding?: number
          shape?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_designs_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_designs_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "links_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_analytics: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          link_id: string
          password_hash: string | null
          share_token: string
          updated_at: string
          user_id: string
          views_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_id: string
          password_hash?: string | null
          share_token: string
          updated_at?: string
          user_id: string
          views_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_id?: string
          password_hash?: string | null
          share_token?: string
          updated_at?: string
          user_id?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_analytics_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_analytics_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      slicebox_files: {
        Row: {
          created_at: string
          delete_token: string
          download_count: number | null
          encryption_iv: string | null
          expires_at: string | null
          file_id: string
          file_size: number
          id: string
          is_deleted: boolean | null
          is_encrypted: boolean | null
          mime_type: string
          original_name: string
          password_hash: string | null
          service_type: string | null
          short_code: string | null
          storage_path: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delete_token: string
          download_count?: number | null
          encryption_iv?: string | null
          expires_at?: string | null
          file_id: string
          file_size: number
          id?: string
          is_deleted?: boolean | null
          is_encrypted?: boolean | null
          mime_type: string
          original_name: string
          password_hash?: string | null
          service_type?: string | null
          short_code?: string | null
          storage_path: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delete_token?: string
          download_count?: number | null
          encryption_iv?: string | null
          expires_at?: string | null
          file_id?: string
          file_size?: number
          id?: string
          is_deleted?: boolean | null
          is_encrypted?: boolean | null
          mime_type?: string
          original_name?: string
          password_hash?: string | null
          service_type?: string | null
          short_code?: string | null
          storage_path?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_personas: {
        Row: {
          created_at: string
          folder_count: number
          id: string
          last_calculated_at: string
          links_this_week: number
          persona: Database["public"]["Enums"]["user_persona"]
          total_clicks: number
          total_links: number
          updated_at: string
          user_id: string
          utm_usage_count: number
        }
        Insert: {
          created_at?: string
          folder_count?: number
          id?: string
          last_calculated_at?: string
          links_this_week?: number
          persona?: Database["public"]["Enums"]["user_persona"]
          total_clicks?: number
          total_links?: number
          updated_at?: string
          user_id: string
          utm_usage_count?: number
        }
        Update: {
          created_at?: string
          folder_count?: number
          id?: string
          last_calculated_at?: string
          links_this_week?: number
          persona?: Database["public"]["Enums"]["user_persona"]
          total_clicks?: number
          total_links?: number
          updated_at?: string
          user_id?: string
          utm_usage_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      utm_data: {
        Row: {
          created_at: string
          final_url: string
          id: string
          link_id: string
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          final_url: string
          id?: string
          link_id: string
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          final_url?: string
          id?: string
          link_id?: string
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utm_data_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utm_data_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: true
            referencedRelation: "links_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      links_safe: {
        Row: {
          api_key_id: string | null
          api_source: boolean | null
          batch_id: string | null
          click_count: number | null
          created_at: string | null
          creepy_extension: string | null
          creepy_style: string | null
          custom_favicon: string | null
          custom_og_description: string | null
          custom_og_image: string | null
          custom_og_title: string | null
          custom_slug: string | null
          expires_at: string | null
          facebook_pixel: string | null
          final_utm_url: string | null
          folder_id: string | null
          google_pixel: string | null
          health_status:
            | Database["public"]["Enums"]["link_health_status"]
            | null
          id: string | null
          is_broken: boolean | null
          is_creepy: boolean | null
          is_favorite: boolean | null
          is_password_protected: boolean | null
          is_pinned: boolean | null
          is_private: boolean | null
          last_clicked_at: string | null
          last_health_check: string | null
          last_scanned_at: string | null
          max_clicks: number | null
          notify_on_broken: boolean | null
          order_index: number | null
          original_url: string | null
          safety_status: string | null
          short_code: string | null
          slice_duration_ms: number | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_enabled: boolean | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          api_key_id?: string | null
          api_source?: boolean | null
          batch_id?: string | null
          click_count?: number | null
          created_at?: string | null
          creepy_extension?: string | null
          creepy_style?: string | null
          custom_favicon?: string | null
          custom_og_description?: string | null
          custom_og_image?: string | null
          custom_og_title?: string | null
          custom_slug?: string | null
          expires_at?: string | null
          facebook_pixel?: string | null
          final_utm_url?: string | null
          folder_id?: string | null
          google_pixel?: string | null
          health_status?:
            | Database["public"]["Enums"]["link_health_status"]
            | null
          id?: string | null
          is_broken?: boolean | null
          is_creepy?: boolean | null
          is_favorite?: boolean | null
          is_password_protected?: boolean | null
          is_pinned?: boolean | null
          is_private?: boolean | null
          last_clicked_at?: string | null
          last_health_check?: string | null
          last_scanned_at?: string | null
          max_clicks?: number | null
          notify_on_broken?: boolean | null
          order_index?: number | null
          original_url?: string | null
          safety_status?: string | null
          short_code?: string | null
          slice_duration_ms?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_enabled?: boolean | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          api_key_id?: string | null
          api_source?: boolean | null
          batch_id?: string | null
          click_count?: number | null
          created_at?: string | null
          creepy_extension?: string | null
          creepy_style?: string | null
          custom_favicon?: string | null
          custom_og_description?: string | null
          custom_og_image?: string | null
          custom_og_title?: string | null
          custom_slug?: string | null
          expires_at?: string | null
          facebook_pixel?: string | null
          final_utm_url?: string | null
          folder_id?: string | null
          google_pixel?: string | null
          health_status?:
            | Database["public"]["Enums"]["link_health_status"]
            | null
          id?: string | null
          is_broken?: boolean | null
          is_creepy?: boolean | null
          is_favorite?: boolean | null
          is_password_protected?: boolean | null
          is_pinned?: boolean | null
          is_private?: boolean | null
          last_clicked_at?: string | null
          last_health_check?: string | null
          last_scanned_at?: string | null
          max_clicks?: number | null
          notify_on_broken?: boolean | null
          order_index?: number | null
          original_url?: string | null
          safety_status?: string | null
          short_code?: string | null
          slice_duration_ms?: number | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_enabled?: boolean | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "links_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_analytics_safe: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          is_password_protected: boolean | null
          link_id: string | null
          share_token: string | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_password_protected?: never
          link_id?: string | null
          share_token?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          is_password_protected?: never
          link_id?: string | null
          share_token?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_analytics_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_analytics_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links_safe"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      generate_slicebox_shortcode: {
        Args: { target_length?: number }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_global_counter: {
        Args: { counter_name: string; increment_by?: number }
        Returns: undefined
      }
    }
    Enums: {
      api_key_status: "active" | "revoked"
      app_role: "admin" | "moderator" | "user"
      link_health_status: "active" | "low_activity" | "inactive" | "broken"
      user_persona: "influencer" | "marketer" | "agency" | "casual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      api_key_status: ["active", "revoked"],
      app_role: ["admin", "moderator", "user"],
      link_health_status: ["active", "low_activity", "inactive", "broken"],
      user_persona: ["influencer", "marketer", "agency", "casual"],
    },
  },
} as const
