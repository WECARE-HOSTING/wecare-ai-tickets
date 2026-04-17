import {
  AuthenticateWithRedirectCallback,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/clerk-react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import MeusChamadosPage from "./pages/MeusChamadosPage.jsx";
import NewTicketPage from "./pages/NewTicketPage.jsx";

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-muted)]">
      Carregando…
    </div>
  );
}

function EntrarRoute() {
  const { isLoaded } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return (
    <>
      <SignedOut>
        <LoginPage />
      </SignedOut>
      <SignedIn>
        <Navigate to="/meus-chamados" replace />
      </SignedIn>
    </>
  );
}

function RequireAuth() {
  const { isLoaded } = useAuth();
  if (!isLoaded) return <AuthLoading />;
  return (
    <>
      <SignedIn>
        <Outlet />
      </SignedIn>
      <SignedOut>
        <Navigate to="/entrar" replace />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<EntrarRoute />} />
      <Route path="/sso-callback" element={<AuthenticateWithRedirectCallback />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<NewTicketPage />} />
          <Route path="meus-chamados" element={<MeusChamadosPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
