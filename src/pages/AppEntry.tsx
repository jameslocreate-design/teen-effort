import { AuthProvider } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import NativeWidgetSync from "@/components/NativeWidgetSync";

export default function AppEntry() {
  return <AuthProvider><NativeWidgetSync /><AppShell /></AuthProvider>;
}