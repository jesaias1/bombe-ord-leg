
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { GameRoom } from "@/components/game/GameRoom";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, signOut, isGuest, loading } = useAuth();

  return (
    <>
      <ThemeToggle />
      {user && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {isGuest ? `Gæst: ${user.user_metadata?.display_name}` : user.email}
            </span>
            <Button onClick={signOut} variant="outline" size="sm">
              {isGuest ? "Forlad som gæst" : "Log ud"}
            </Button>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/" element={<Index />} />
        <Route 
          path="/room/:roomId" 
          element={
            loading ? (
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Indlæser...</p>
                </div>
              </div>
            ) : user ? (
              <GameRoom />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
