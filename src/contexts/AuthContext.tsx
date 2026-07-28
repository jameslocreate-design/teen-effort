import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { registerPush } from "@/lib/push";
import { initPurchases, logOutPurchases } from "@/lib/revenuecat";


interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleSession = (session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // If the user signed in mid-OAuth consent flow, return them to the consent URL.
      if (session?.user) {
        // Native-only side effects (no-ops on web)
        registerPush(session.user.id).catch(() => {});
        initPurchases(session.user.id).catch(() => {});

        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        if (next && next.startsWith("/") && !next.startsWith("//")) {
          window.location.replace(next);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => handleSession(session));
    supabase.auth.getSession().then(({ data: { session } }) => handleSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
