import { createClient } from "@supabase/supabase-js"
import type { Jugada, ResultadoQuiniela, ResultadoQuini6, ResultadoLotoPlus } from "./types"

// ─── Tipos de la base de datos ────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      jugadas: {
        Row: Jugada
        Insert: Omit<Jugada, "id" | "created_at">
        Update: Partial<Omit<Jugada, "id" | "created_at">>
      }
      resultados_quiniela: {
        Row: ResultadoQuiniela
        Insert: Omit<ResultadoQuiniela, "id" | "created_at">
        Update: Partial<Omit<ResultadoQuiniela, "id" | "created_at">>
      }
      resultados_quini6: {
        Row: ResultadoQuini6
        Insert: Omit<ResultadoQuini6, "id" | "created_at">
        Update: Partial<Omit<ResultadoQuini6, "id" | "created_at">>
      }
      resultados_lotoplus: {
        Row: ResultadoLotoPlus
        Insert: Omit<ResultadoLotoPlus, "id" | "created_at">
        Update: Partial<Omit<ResultadoLotoPlus, "id" | "created_at">>
      }
    }
  }
}

// ─── Cliente público (browser / server components) ───────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// ─── Cliente admin (solo API routes server-side) ──────────────────────────────

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada")
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
