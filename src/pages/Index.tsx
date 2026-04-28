import { useState } from "react";
import { Bomb, Play, Users } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { HomePage } from "@/components/home/HomePage";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (user) {
    return <HomePage />;
  }

  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="space-y-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-orange-500 shadow-xl shadow-orange-500/20">
            <Bomb className="h-9 w-9" />
          </div>

          <div className="max-w-3xl space-y-5">
            <h1 className="text-6xl font-black leading-none tracking-normal sm:text-8xl">
              ORD
              <span className="block text-orange-300">BOMBEN</span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              Dansk Bomb Party med gæstespil, hurtige rumkoder og realtime runder.
            </p>
          </div>

          <Button
            onClick={() => setShowAuthModal(true)}
            size="lg"
            className="h-14 gap-3 bg-orange-500 px-7 text-base font-bold text-white shadow-xl shadow-orange-500/20 hover:bg-orange-400"
          >
            <Play className="h-5 w-5" />
            Start spil
          </Button>
        </section>

        <aside className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-200">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold">Spil som gæst</div>
              <div className="text-sm text-slate-400">Ingen konto nødvendig.</div>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-slate-300">
            <div className="rounded-md bg-white/5 px-3 py-2">Skriv ord med den viste stavelse</div>
            <div className="rounded-md bg-white/5 px-3 py-2">Bomben skifter tur efter hvert gyldigt ord</div>
            <div className="rounded-md bg-white/5 px-3 py-2">Sidste spiller med liv vinder</div>
          </div>
        </aside>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
};

export default Index;
