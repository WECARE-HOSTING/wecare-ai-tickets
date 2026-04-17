import { ClerkProvider } from "@clerk/clerk-react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkEnv() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center font-sans text-sm text-neutral-600">
      <p className="max-w-md">
        Defina <code className="rounded bg-neutral-100 px-1 py-0.5">VITE_CLERK_PUBLISHABLE_KEY</code> no
        arquivo <code className="rounded bg-neutral-100 px-1 py-0.5">.env</code> do frontend e reinicie o
        Vite.
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
