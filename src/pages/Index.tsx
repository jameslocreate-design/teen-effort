import { AuthProvider } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";

const Index = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default Index;
