import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
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
      // Check if user already exists in public.users
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", u.id)
        .maybeSingle();

      if (error) {
        console.error("AuthProvider: Error checking public.users:", error);
        return;
      }

      // If not, create the record
      if (!data) {
        console.log("AuthProvider: Creating public.users record for:", u.id);
        const { error: insertError } = await supabase
          .from("users")
          .insert({ 
            id: u.id, 
            email: u.email,
            telegram_code: null,
            telegram_chat_id: null
          });
        
        if (insertError) {
          console.error("AuthProvider: Error creating public.users record:", insertError);
        }
      }
    } catch (e) {
      console.error("AuthProvider: Exception in ensureUserRecord:", e);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      console.log("Initializing Auth...");
      const timeout = setTimeout(() => {
        if (!isReady) {
          console.warn("Auth initialization timed out.");
          setIsReady(true);
        }
      }, 5000);

      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        
        if (s?.user) {
          setUser(s.user);
          // Gently ensure the public record exists
          ensureUserRecord(s.user);
        }
        console.log("Auth initialized. User:", s?.user?.id);
      } catch (e) {
        console.error("Error during auth init:", e);
      } finally {
        clearTimeout(timeout);
        setIsReady(true);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("Auth State Change:", event, s?.user?.id);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        ensureUserRecord(s.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [ensureUserRecord]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    console.log("AuthProvider: Starting signIn for:", email);
    
    // Safety timeout to prevent infinite loading state
    const authTimeout = setTimeout(() => {
      console.warn("AuthProvider: signIn operation is taking too long...");
    }, 10000);

    try {
      console.log("AuthProvider: Calling supabase.auth.signInWithPassword...");
      const response = await supabase.auth.signInWithPassword({ email, password });
      console.log("LOGIN RESPONSE:", response);
      const { error, data } = response;
      
      clearTimeout(authTimeout);
      
      if (error) {
        console.error("AuthProvider: Sign in error details:", error);
        setLoading(false);
        const msg = error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message;
        return { error: msg };
      }

      if (data && data.user) {
        console.log("AuthProvider: Sign in success! Setting local state for:", data.user.id);
        setSession(data.session);
        setUser(data.user);
        await ensureUserRecord(data.user);
      }
      
      setLoading(false);
      return { error: null };
    } catch (e: any) {
      clearTimeout(authTimeout);
      console.error("AuthProvider: Unexpected sign in exception:", e);
      setLoading(false);
      return { error: e.message || "Erro inesperado ao entrar." };
    }
  }, [ensureUserRecord]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    setLoading(true);
    console.log("Signing up with:", email);
    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          emailRedirectTo: window.location.origin,
          data: {
            first_name: name,
          }
        },
      });
      setLoading(false);
      if (error) {
        console.error("Sign up error:", error);
        const msg = error.message.includes("already registered")
          ? "Este e-mail já está cadastrado."
          : error.message;
        return { error: msg };
      }
      console.log("Sign up success:", data.user?.id);
      return { error: null };
    } catch (e: any) {
      console.error("Unexpected sign up error:", e);
      setLoading(false);
      return { error: e.message || "Erro inesperado ao cadastrar." };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isReady, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
