import { Outlet, createRootRoute } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
});

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-center" theme="dark" />
    </AuthProvider>
  );
}