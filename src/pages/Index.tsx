
import { useAuth } from "@/components/auth/AuthProvider";
import { HomePage } from "@/components/home/HomePage";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(!user);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            💣 Bombe Ord 💣
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Multiplayer ordspil på dansk
          </p>
          <Button onClick={() => setShowAuthModal(true)} size="lg" className="text-lg px-8 py-3">
            Kom i gang
          </Button>
          
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        </div>
      </div>
    );
  }

  return <HomePage />;
};

export default Index;
