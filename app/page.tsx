import { createAdminClient } from "@/lib/supabase"
import { HomeClient } from "@/components/home-client"

export const dynamic = "force-dynamic"

async function getPozoAcumulado(): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("pozos_acumulados")
      .select("tradicional")
      .eq("id", 1)
      .single()
    return data?.tradicional ?? 0
  } catch {
    return 0
  }
}

export default async function HomePage() {
  const pozo = await getPozoAcumulado()
  return <HomeClient pozo={pozo} />
}
