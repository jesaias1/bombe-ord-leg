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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      danish_words: {
        Row: {
          created_at: string
          frequency_rank: number | null
          id: string
          syllables: string[] | null
          word: string
        }
        Insert: {
          created_at?: string
          frequency_rank?: number | null
          id?: string
          syllables?: string[] | null
          word: string
        }
        Update: {
          created_at?: string
          frequency_rank?: number | null
          id?: string
          syllables?: string[] | null
          word?: string
        }
        Relationships: []
      }
      games: {
        Row: {
          correct_words: string[] | null
          created_at: string
          current_player_id: string | null
          current_syllable: string | null
          game_syllables: string[] | null
          id: string
          incorrect_words: string[] | null
          room_id: string | null
          round_number: number | null
          status: Database["public"]["Enums"]["game_status"]
          syllable_index: number | null
          timer_duration: number | null
          timer_end_time: string | null
          turn_seq: number | null
          updated_at: string
          used_words: string[] | null
          winner_player_id: string | null
        }
        Insert: {
          correct_words?: string[] | null
          created_at?: string
          current_player_id?: string | null
          current_syllable?: string | null
          game_syllables?: string[] | null
          id?: string
          incorrect_words?: string[] | null
          room_id?: string | null
          round_number?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          syllable_index?: number | null
          timer_duration?: number | null
          timer_end_time?: string | null
          turn_seq?: number | null
          updated_at?: string
          used_words?: string[] | null
          winner_player_id?: string | null
        }
        Update: {
          correct_words?: string[] | null
          created_at?: string
          current_player_id?: string | null
          current_syllable?: string | null
          game_syllables?: string[] | null
          id?: string
          incorrect_words?: string[] | null
          room_id?: string | null
          round_number?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          syllable_index?: number | null
          timer_duration?: number | null
          timer_end_time?: string | null
          turn_seq?: number | null
          updated_at?: string
          used_words?: string[] | null
          winner_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_winner_player_id_fkey"
            columns: ["winner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          id: string
          is_alive: boolean
          joined_at: string
          lives: number
          name: string
          ready: boolean
          ready_at: string | null
          room_id: string | null
          turn_order: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          is_alive?: boolean
          joined_at?: string
          lives?: number
          name: string
          ready?: boolean
          ready_at?: string | null
          room_id?: string | null
          turn_order?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          is_alive?: boolean
          joined_at?: string
          lives?: number
          name?: string
          ready?: boolean
          ready_at?: string | null
          room_id?: string | null
          turn_order?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          bonus_letters_enabled: boolean
          created_at: string
          creator_id: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          max_players: number
          name: string
          updated_at: string
        }
        Insert: {
          bonus_letters_enabled?: boolean
          created_at?: string
          creator_id?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id: string
          max_players?: number
          name: string
          updated_at?: string
        }
        Update: {
          bonus_letters_enabled?: boolean
          created_at?: string
          creator_id?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          max_players?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      syllables: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          syllable: string
          word_count: number
        }
        Insert: {
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          syllable: string
          word_count?: number
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty_level"]
          id?: string
          syllable?: string
          word_count?: number
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
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          fastest_word_time: number | null
          favorite_syllable: string | null
          id: string
          longest_streak: number
          total_games_played: number
          total_games_won: number
          total_playtime_seconds: number
          total_words_guessed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          fastest_word_time?: number | null
          favorite_syllable?: string | null
          id?: string
          longest_streak?: number
          total_games_played?: number
          total_games_won?: number
          total_playtime_seconds?: number
          total_words_guessed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          fastest_word_time?: number | null
          favorite_syllable?: string | null
          id?: string
          longest_streak?: number
          total_games_played?: number
          total_games_won?: number
          total_playtime_seconds?: number
          total_words_guessed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_start_game: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_players_public: {
        Args: { p_guest_id?: string; p_room_id: string }
        Returns: {
          id: string
          is_alive: boolean
          joined_at: string
          lives: number
          name: string
          room_id: string
          turn_order: number
          user_id: string
        }[]
      }
      get_room_safe: {
        Args: { p_room_locator: string }
        Returns: {
          bonus_letters_enabled: boolean
          created_at: string
          creator_id: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"]
          id: string
          max_players: number
          name: string
          updated_at: string
        }[]
      }
      get_server_epoch_ms: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_server_time: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      handle_timeout: {
        Args: { p_player_id: string; p_room_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_room_creator: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      is_room_member: {
        Args: { p_room_id: string; p_user_id?: string }
        Returns: boolean
      }
      join_room_with_lives: {
        Args: { p_name: string; p_room_id: string; p_user_id: string }
        Returns: string
      }
      reset_players_ready: {
        Args: { p_room_id: string }
        Returns: undefined
      }
      set_player_ready: {
        Args: { p_ready: boolean; p_room_id: string; p_user_id: string }
        Returns: Json
      }
      start_game_reset_lives: {
        Args: { p_room_id: string }
        Returns: undefined
      }
      start_new_game: {
        Args: { p_room_id: string } | { p_room_id: string; p_user_id: string }
        Returns: Json
      }
      submit_word: {
        Args: {
          p_player_id: string
          p_room_id: string
          p_turn_seq: number
          p_word: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      difficulty_level: "let" | "mellem" | "svaer"
      game_status: "waiting" | "playing" | "finished"
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
      app_role: ["admin", "moderator", "user"],
      difficulty_level: ["let", "mellem", "svaer"],
      game_status: ["waiting", "playing", "finished"],
    },
  },
} as const
