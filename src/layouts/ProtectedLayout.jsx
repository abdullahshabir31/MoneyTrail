import { Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

function ProtectedContent() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function ProtectedLayout() {
  return (
    <AuthProvider>
      <ProtectedContent />
    </AuthProvider>
  );
}
