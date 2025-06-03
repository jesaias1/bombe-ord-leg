
import { useAuth } from "@/components/auth/AuthProvider";
import { HomePage } from "@/components/home/HomePage";
import { AuthModal } from "@/components/auth/AuthModal";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (user) {
    return <HomePage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-purple-600 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
        {/* Game title with bomb effect */}
        <div className="space-y-4">
          <div className="text-8xl animate-bounce">💣</div>
          <h1 className="text-6xl md:text-8xl font-black text-white drop-shadow-2xl">
            ORD
            <span className="block text-yellow-300">BOMBEN</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-semibold drop-shadow-lg">
            Det mest eksplosive ordspil på dansk!
          </p>
        </div>

        {/* Game features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80 text-sm">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl mb-2">⚡</div>
            <div>Real-time multiplayer</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl mb-2">🎯</div>
            <div>1-16 spillere</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="text-2xl mb-2">🏆</div>
            <div>Træn dit ordforråd</div>
          </div>
        </div>

        {/* Call to action */}
        <div className="space-y-4">
          <Button 
            onClick={() => setShowAuthModal(true)} 
            size="lg" 
            className="text-2xl px-12 py-6 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold shadow-2xl transform hover:scale-105 transition-all duration-200"
          >
            🚀 SPIL NU!
          </Button>
          
          <div className="text-white/70 text-sm">
            Ingen registrering påkrævet • Spil med det samme som gæst
          </div>
        </div>

        {/* How to play */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 text-left">
          <h3 className="text-xl font-bold text-white mb-4 text-center">💡 Sådan spiller du</h3>
          <ul className="text-white/90 space-y-2 text-sm">
            <li>🎯 Skriv et dansk ord der indeholder den viste stavelse</li>
            <li>⏰ Du har 10-25 sekunder per tur</li>
            <li>❌ Ord kan ikke genbruges i samme spil</li>
            <li>💥 Mister bomben? Du mister et liv!</li>
            <li>🏆 Sidste spiller tilbage vinder</li>
          </ul>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};

export default Index;
