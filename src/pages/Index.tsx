
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
    <div className="min-h-screen bg-[#0c1220] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-amber-500/8 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-8 max-w-2xl mx-auto">
        {/* Logo */}
        <div className="space-y-4">
          <div className="text-7xl sm:text-8xl">💣</div>
          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight">
            ORD
            <span className="block text-transparent bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text">BOMBEN</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 font-medium">
            Det mest eksplosive ordspil på dansk!
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          {[
            { icon: "⚡", text: "Real-time multiplayer" },
            { icon: "🎯", text: "1-16 spillere" },
            { icon: "🏆", text: "Træn dit ordforråd" },
          ].map((item) => (
            <div key={item.text} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-orange-500/20 transition-colors">
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-slate-300">{item.text}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Button 
            onClick={() => setShowAuthModal(true)} 
            size="lg" 
            className="text-xl sm:text-2xl px-12 py-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold shadow-2xl shadow-orange-500/25 transform hover:scale-105 transition-all duration-200"
          >
            🚀 SPIL NU!
          </Button>
          
          <div className="text-slate-500 text-sm">
            Ingen registrering påkrævet • Spil med det samme som gæst
          </div>
        </div>

        {/* How to play */}
        <div className="bg-white/4 backdrop-blur-sm rounded-xl p-6 text-left border border-white/5">
          <h3 className="text-lg font-bold text-white/90 mb-4 text-center">💡 Sådan spiller du</h3>
          <ul className="text-slate-400 space-y-2 text-sm">
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
