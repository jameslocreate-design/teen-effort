import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEMO_USER_ID, getDemoProfile, type DemoProfile } from "@/lib/demo";

/**
 * DEMO BUILD — there is no sign-up or login.
 *
 * The "user" is a local, device-only identity backed by the profile the tester
 * filled in on first launch. Nothing is sent to any backend or auth service.
 */
interface DemoUser {
  id: string;
  name: string;
}

interface AuthContextType {
  user: DemoUser | null;
  profile: DemoProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refresh: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<DemoProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setProfile(getDemoProfile());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("demo-profile-updated", handler);
    return () => window.removeEventListener("demo-profile-updated", handler);
  }, []);

  const user = profile ? { id: DEMO_USER_ID, name: profile.name } : null;

  const signOut = async () => {
    /* No accounts in the demo build — use "Reset profile" in Settings. */
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};
