import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const ensureUserRecord = useCallback(async (u: User) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();

      if (error || data) return;

      await supabase.from("users").insert({ id: u.id, email: u.email });
    } catch (e) {}
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        if (s?.user) {
          setUser(s.user);
          ensureUserRecord(s.user);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setIsReady(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) ensureUserRecord(s.user);
    });

    return () => subscription.unsubscribe();
  }, [ensureUserRecord]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        return { error: error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message };
      }
      if (data?.user) {
        setSession(data.session);
        setUser(data.user);
        await ensureUserRecord(data.user);
      }
      setLoading(false);
      return { error: null };
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || "Erro inesperado ao entrar." };
    }
  }, [ensureUserRecord]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: window.location.origin,
          data: { first_name: name }
        },
      });
      setLoading(false);
      if (error) return { error: error.message };
      return { error: null };
    } catch (e: any) {
      setLoading(false);
      return { error: e.message || "Erro inesperado ao cadastrar." };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    isReady,
    loading,
    signIn,
    signUp,
    signOut
  }), [user, session, isReady, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
