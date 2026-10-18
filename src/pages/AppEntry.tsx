import { AuthProvider } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";

export default function AppEntry() {
  return <AuthProvider><AppShell /></AuthProvider>;
}