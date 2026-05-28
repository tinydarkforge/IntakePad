import { loadSettings } from "@/lib/settings"

export function getClientId(): string {
  const s = loadSettings()
  return s.clientId || "your_client_id_here"
}
