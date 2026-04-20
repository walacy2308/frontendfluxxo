import { useState, useEffect, useCallback } from "react";
import { Send, Copy, Check, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function TelegramConnect() {
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecking(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from("users")
        .select("telegram_chat_id, telegram_code")
        .eq("id", user.id)
        .maybeSingle();

      if (dbError) {
        console.error("Erro ao verificar status:", dbError);
      } else if (data) {
        if (data.telegram_chat_id) {
          setConnected(true);
          setCode(null);
        } else if (data.telegram_code) {
          setCode(data.telegram_code);
        }
      }
    } catch (err) {
      console.error("Erro ao verificar status do Telegram:", err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    // Poll a cada 5s para detectar quando o bot vincular o chat_id
    const interval = setInterval(() => {
      if (!connected) checkStatus();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkStatus, connected]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Faça login para conectar o Telegram.");
        setLoading(false);
        return;
      }

      const codigo = "FLUX" + Math.floor(1000 + Math.random() * 9000);

      const { error: dbError } = await supabase
        .from("users")
        .update({ telegram_code: codigo })
        .eq("id", user.id);

      if (dbError) {
        console.error("Erro Supabase:", dbError);
        throw dbError;
      }

      setCode(codigo);
    } catch (err) {
      console.error("Erro ao salvar código:", err);
      setError("Erro ao salvar código. Verifique se a tabela users existe.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Faça login para desconectar o Telegram.");
        setLoading(false);
        return;
      }

      const { error: dbError } = await supabase
        .from("users")
        .update({ telegram_chat_id: null, telegram_code: null })
        .eq("id", user.id);

      if (dbError) {
        console.error("Erro Supabase:", dbError);
        throw dbError;
      }

      setConnected(false);
      setCode(null);
    } catch (err) {
      console.error("Erro ao desconectar:", err);
      setError("Erro ao desconectar.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  };

  return (
    <div className="card-premium rounded-2xl bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Send className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Telegram</h3>
            <p className="text-[11px] text-muted-foreground">
              {connected ? "Bot vinculado à sua conta" : "Conecte ao bot para notificações"}
            </p>
          </div>
        </div>
        {connected && (
          <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Conectado
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3 text-center">{error}</p>
      )}

      {checking ? (
        <div className="flex h-10 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <p className="text-xs text-muted-foreground">
              Suas notificações de gastos serão enviadas automaticamente pelo bot.
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full text-center text-xs font-medium text-red-500/80 transition-colors hover:text-red-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Desconectando...
              </>
            ) : (
              "Desconectar bot"
            )}
          </button>
        </div>
      ) : !code ? (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-gradient h-10 w-full rounded-xl text-sm font-bold text-foreground transition-all disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando...
            </span>
          ) : (
            "Conectar Telegram"
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            Envie este código para o bot no Telegram:
          </p>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
            <span className="font-mono text-lg font-bold tracking-widest text-primary">{code}</span>
            <button
              onClick={handleCopy}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {loading ? "Gerando..." : "Gerar novo código"}
          </button>
        </div>
      )}
    </div>
  );
}
