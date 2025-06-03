
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { AuthModal } from "@/components/auth/AuthModal";
import { HomePage } from "@/components/home/HomePage";
import { GameRoom } from "@/components/game/GameRoom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <div className="fixed top-4 right-4 z-50">
        {user ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {user.user_metadata?.display_name || user.email}
            </span>
            <Button onClick={signOut} variant="outline" size="sm">
              Log ud
            </Button>
          </div>
        ) : (
          <Button onClick={() => setShowAuthModal(true)} size="sm">
            Log ind / Tilmeld
          </Button>
        )}
      </div>

      <Routes>
        <Route 
          path="/" 
          element={user ? <HomePage /> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/room/:roomId" 
          element={user ? <GameRoom /> : <Navigate to="/" replace />} 
        />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <AuthModal 
        isOpen={showAuthModal && !user} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
