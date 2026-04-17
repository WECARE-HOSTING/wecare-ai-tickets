import { useSignIn } from "@clerk/clerk-react";

export default function LoginPage() {
  const { signIn, isLoaded } = useSignIn();
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function handleGoogle() {
    if (!signIn) return;
    await signIn.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: `${origin}/sso-callback`,
      redirectUrlComplete: `${origin}/`,
    });
  }

  return (
    <div className="login-page flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center px-4 py-12">
      <div className="login-card w-full max-w-md rounded-2xl p-8 sm:p-10">
        <img
          src="/logo.png"
          alt="WeCare Hosting"
          className="mx-auto mb-6 h-14 w-auto object-contain"
        />
        <p className="mb-1 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#E55A4F]">
          WeCare Hosting
        </p>
        <h1 className="mb-2 text-center font-sans text-2xl font-bold tracking-tight text-[var(--text-main)]">
          Área interna
        </h1>
        <p className="mb-8 text-center text-sm text-[var(--text-muted)]">
          Acesso exclusivo com Google Workspace (@wecarehosting.com.br).
        </p>
        <button
          type="button"
          disabled={!isLoaded}
          onClick={() => void handleGoogle()}
          className="google-signin-btn flex w-full items-center justify-center gap-3 rounded-xl px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-lg" aria-hidden="true">
            G
          </span>
          {isLoaded ? "Entrar com Google" : "Carregando…"}
        </button>
        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Não há cadastro por e-mail: use apenas a conta corporativa autorizada.
        </p>
      </div>
    </div>
  );
}
