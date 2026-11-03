import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { registerPush } from "@/lib/push";
import { syncDateReminders, initReminderTaps, startPartnerActivityWatch, stopPartnerActivityWatch } from "@/lib/reminders";
import { initPurchases, logOutPurchases } from "@/lib/revenuecat";
import { isAppleUser, waitForAppleHandoff } from "@/lib/apple-profile";
import { hasPendingAppleProfile, persistAppleProfile } from "@/lib/apple-profile-persistence";


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
    let revision = 0;
    let disposed = false;
    const handleSession = (session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // If the user signed in mid-OAuth consent flow, return them to the consent URL.
      if (session?.user) {
        // Native-only side effects (no-ops on web)
        registerPush(session.user.id).catch(() => {});
        initPurchases(session.user.id).catch(() => {});
        initReminderTaps().catch(() => {});
        syncDateReminders().catch(() => {});
        startPartnerActivityWatch(session.user.id).catch(() => {});


        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        if (next && next.startsWith("/") && !next.startsWith("//")) {
          window.location.replace(next);
        }
      }
    };

    const prepareSession = (session: any) => {
      const current = ++revision;
      if (!session?.user) { handleSession(null); return; }
      // Schedule a new task outside the auth callback lock (signInWithIdToken must return).
      setLoading(true);
      setTimeout(async () => {
        try {
          await waitForAppleHandoff();
          if (disposed || current !== revision) return;
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (!data.user) { if (!disposed && current === revision) handleSession(null); return; }
          let verifiedUser = data.user;
          if (isAppleUser(verifiedUser)) verifiedUser = await persistAppleProfile(verifiedUser);
          if (!disposed && current === revision) handleSession({ ...session, user: verifiedUser });
        } catch (error) {
          console.error("Session preparation failed; preserving signed-in session", error);
          if (!disposed && current === revision) handleSession(session);
        }
      }, 0);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore our metadata update to avoid a loop; retry pending names on later auth changes.
      if (event !== "USER_UPDATED") prepareSession(session);
      else if (session?.user && hasPendingAppleProfile(session.user.id)) {
        setTimeout(() => { if (!disposed) prepareSession(session); }, 0);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => prepareSession(session));
    return () => {
      disposed = true;
      revision += 1;
      subscription.unsubscribe();
      stopPartnerActivityWatch();
    };
  }, []);

  const signOut = async () => {
    stopPartnerActivityWatch();
    await logOutPurchases().catch(() => {});
    await supabase.auth.signOut();
  };


  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
