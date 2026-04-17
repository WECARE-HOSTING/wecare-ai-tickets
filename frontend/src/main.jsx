import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const fromVite = String(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "").trim();
const fromRuntime =
  typeof window !== "undefined" && window.__CLERK_PUBLISHABLE_KEY__
    ? String(window.__CLERK_PUBLISHABLE_KEY__).trim()
    : "";
const clerkKey = fromVite || fromRuntime;

function MissingClerkEnv() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center font-sans text-sm text-neutral-600">
      <p className="max-w-md">
        Configure a chave publicável do Clerk: no desenvolvimento use{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5">VITE_CLERK_PUBLISHABLE_KEY</code> no{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5">.env</code> (build Vite), ou no Railway /
        produção defina{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5">CLERK_PUBLISHABLE_KEY</code> no mesmo
        serviço do backend (carregada via <code className="rounded bg-neutral-100 px-1 py-0.5">/clerk-frontend-config.js</code>
        ). Reinicie o servidor.
      </p>
    </div>
  );
}

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    {clerkKey ? (
      <ClerkProvider
        publishableKey={clerkKey}
        signInUrl="/entrar"
        signUpUrl="/entrar"
        afterSignInUrl="/meus-chamados"
        afterSignUpUrl="/meus-chamados"
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    ) : (
      <MissingClerkEnv />
    )}
  </StrictMode>
);
