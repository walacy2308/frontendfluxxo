import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff, Mail, Lock, Loader2, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import fluxxoIconGlow from "@/assets/fluxxo-icon-glow.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Fluxxo — Login" },
      { name: "description", content: "Entre na sua conta Fluxxo." },
    ],
  }),
});

function LoginPage() {
  const { signIn, signUp, loading, user, isReady } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "signup" && !name.trim()) {
      setError("Por favor, insira o seu nome.");
      return;
    }

    if (!email || !password) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (mode === "login") {
      const response = await signIn(email, password);
      console.log("LOGIN RESPONSE:", response);
      const { error: err } = response;
      if (err) {
        setError(err);
      } else {
        console.log("Login successful, navigating to /");
        navigate({ to: "/" });
      }
    } else {
      const { error: err } = await signUp(email, password, name.trim());
      if (err) {
        setError(err);
      } else {
        setSuccess("Conta criada! Verifique seu e-mail para confirmar.");
      }
    }
  };

  // Redirect if already logged in - moved to useEffect for robustness
  useEffect(() => {
    if (isReady && user && window.location.pathname !== "/") {
      console.log("User detected in LoginPage, redirecting to /...");
      navigate({ to: "/" });
    }
  }, [isReady, user, navigate]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground animate-pulse">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          <img src={fluxxoIconGlow} alt="Fluxxo" className="h-12 w-auto" />
          <div className="text-center">
            <h1 className="text-gradient font-display text-4xl font-bold tracking-tight">fluxxo</h1>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-center text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-center text-sm text-green-400">
                {success}
              </div>
            )}

            {mode === "signup" && (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="h-12 w-full rounded-xl border border-border bg-muted pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-12 w-full rounded-xl border border-border bg-muted pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-border bg-muted pl-11 pr-12 text-sm text-foreground placeholder-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient relative h-12 w-full rounded-xl text-sm font-bold text-foreground transition-all disabled:opacity-60"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" ? (loading ? "Entrando..." : "Entrar") : (loading ? "Cadastrando..." : "Criar conta")}
              </span>
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setSuccess(null); }}
            className="font-medium text-primary transition-colors hover:text-primary/80"
          >
            {mode === "login" ? "Criar agora" : "Fazer login"}
          </button>
        </p>
      </div>
    </div>
  );
}
