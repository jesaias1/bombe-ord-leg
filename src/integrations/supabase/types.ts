export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          created_at: string
          current_player_id: string | null
          current_syllable: string | null
          id: string
          room_id: string | null
          round_number: number | null
          status: Database["public"]["Enums"]["game_status"]
          timer_duration: number | null
          timer_end_time: string | null
          updated_at: string
          used_words: string[] | null
        }
        Insert: {
          created_at?: string
          current_player_id?: string | null
          current_syllable?: string | null
          id?: string
          room_id?: string | null
          round_number?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          timer_duration?: number | null
          timer_end_time?: string | null
          updated_at?: string
          used_words?: string[] | null
        }
        Update: {
          created_at?: string
          current_player_id?: string | null
          current_syllable?: string | null
          id?: string
          room_id?: string | null
          round_number?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          timer_duration?: number | null
          timer_end_time?: string | null
          updated_at?: string
          used_words?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "games_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      difficulty_level: "let" | "mellem" | "svaer"
      game_status: "waiting" | "playing" | "finished"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      difficulty_level: ["let", "mellem", "svaer"],
      game_status: ["waiting", "playing", "finished"],
    },
  },
} as const
