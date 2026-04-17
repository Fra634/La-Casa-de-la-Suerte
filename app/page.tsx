import { createAdminClient } from "@/lib/supabase"
import { HomeClient } from "@/components/home-client"

export const dynamic = "force-dynamic"

async function getPozos(): Promise<{ quini6: number; lotoplus: number }> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("pozos_acumulados")
      .select("tradicional, lotoplus")
      .eq("id", 1)
      .single()
    return { quini6: data?.tradicional ?? 0, lotoplus: data?.lotoplus ?? 0 }
  } catch {
    return { quini6: 0, lotoplus: 0 }
  }
}

export default async function HomePage() {
  const pozos = await getPozos()
  return <HomeClient pozo={pozos.quini6} pozoLotoPlus={pozos.lotoplus} />
}
