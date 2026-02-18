
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { WordImporter } from '@/components/admin/WordImporter';
import { AuthModal } from '@/components/auth/AuthModal';
import { UserStats } from '@/components/user/UserStats';
import { useQuery } from '@tanstack/react-query';
import { GameInstructions } from '@/components/game/GameInstructions';

export const HomePage = () => {
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  
  const [roomName, setRoomName] = useState('');
  const [difficulty, setDifficulty] = useState<'let' | 'mellem' | 'svaer'>('mellem');
  const [bonusLetters, setBonusLetters] = useState(true);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWordImporter, setShowWordImporter] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeCard, setActiveCard] = useState<'create' | 'join' | null>(null);
  const [quickStarting, setQuickStarting] = useState(false);

  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      if (!user || isGuest) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      return !error && data?.role === 'admin';
    },
    enabled: !!user && !isGuest
  });

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const resetForm = () => {
    setActiveCard(null);
    setRoomName('');
    setDifficulty('mellem');
    setBonusLetters(true);
    setJoinRoomId('');
  };

  const createRoom = async () => {
    if (!user) { setShowAuthModal(true); return; }
    if (!roomName.trim()) {
      toast({ title: "Fejl", description: "Indtast et navn til rummet", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const roomId = generateRoomId();
      const { error } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          name: roomName.trim(),
          creator_id: user.id,
          difficulty,
          bonus_letters_enabled: bonusLetters,
        });

      if (error) {
        toast({ title: "Fejl", description: `Kunne ikke oprette rummet: ${error.message}`, variant: "destructive" });
        return;
      }

      toast({ title: "Rum oprettet!", description: `Rum ${roomId} er klar til spil` });
      navigate(`/room/${roomId}`);
    } catch (error: any) {
      toast({ title: "Fejl", description: error.message || "Kunne ikke oprette rummet", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (!user) { setShowAuthModal(true); return; }
    if (!joinRoomId.trim()) {
      toast({ title: "Fejl", description: "Indtast et rum ID", variant: "destructive" });
      return;
    }
    navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
  };

  const quickStartSolo = async () => {
    if (!user) { setShowAuthModal(true); return; }
    setQuickStarting(true);
    try {
      const roomId = generateRoomId();
      const { error } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          name: 'Solo træning',
          creator_id: user.id,
          difficulty: 'mellem',
          bonus_letters_enabled: true,
        });

      if (error) {
        toast({ title: "Fejl", description: "Kunne ikke starte solo spil", variant: "destructive" });
        return;
      }
      navigate(`/room/${roomId}`);
    } catch (error: any) {
      toast({ title: "Fejl", description: error.message || "Kunne ikke starte solo spil", variant: "destructive" });
    } finally {
      setQuickStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1220] p-4">
      <div className="max-w-5xl mx-auto pt-8 sm:pt-12">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            💣 Ordbomben 💣
          </h1>
          <p className="text-lg text-slate-400">
            Multiplayer ordspil på dansk
          </p>
          {!user && (
            <div className="mt-6 space-y-3">
              <Button onClick={() => setShowAuthModal(true)} size="lg" 
                className="text-lg px-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold shadow-xl shadow-orange-500/20">
                🎮 Start spillet
              </Button>
              <p className="text-sm text-slate-500">Spil som gæst eller opret en konto</p>
            </div>
          )}
          {user && isGuest && (
            <p className="text-sm text-orange-400 mt-4">Spiller som gæst: {user.user_metadata?.display_name}</p>
          )}
          {user && !isGuest && (
            <p className="text-sm text-slate-500 mt-4">Logget ind som: {user.email}</p>
          )}
        </div>

        {/* Admin section */}
        {isAdmin && (
          <div className="mb-8 animate-fade-in">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-white">
                  <span>🔧 Administrator Panel</span>
                  <Button onClick={() => setShowWordImporter(!showWordImporter)} variant="outline" size="sm"
                    className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
                    {showWordImporter ? "Skjul" : "Vis"} ordimporter
                  </Button>
                </CardTitle>
              </CardHeader>
              {showWordImporter && (
                <CardContent><WordImporter /></CardContent>
              )}
            </Card>
          </div>
        )}

        {user && (
          <>
            {/* User Stats */}
            {!isGuest && (
              <div className="mb-8 animate-fade-in">
                <UserStats />
              </div>
            )}

            {!activeCard && (
              <>
                {/* Quick Start Solo */}
                <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
                  <Button 
                    onClick={quickStartSolo}
                    disabled={quickStarting}
                    size="lg"
                    className="w-full h-16 sm:h-20 text-lg sm:text-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold shadow-2xl shadow-orange-500/20 transform hover:scale-[1.02] transition-all duration-300"
                  >
                    {quickStarting ? "Starter..." : "🚀 Hurtig Solo Træning"}
                  </Button>
                  <p className="text-center text-sm text-slate-500 mt-2">
                    Start øjeblikkelig træning uden setup
                  </p>
                </div>

                {/* Divider */}
                <div className="max-w-2xl mx-auto mb-8 flex items-center gap-4">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-sm text-slate-500">eller</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Cards */}
                <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto animate-scale-in">
                  <Card 
                    className="bg-white/5 border-white/5 hover:border-orange-500/30 transform hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                    onClick={() => setActiveCard('create')}
                  >
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-slate-200 text-center group-hover:text-orange-400 transition-colors">
                        Opret multiplayer rum
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🎮</div>
                      <p className="text-sm text-slate-500">Tilpas indstillinger og inviter venner</p>
                    </CardContent>
                  </Card>

                  <Card 
                    className="bg-white/5 border-white/5 hover:border-purple-500/30 transform hover:scale-[1.02] transition-all duration-300 cursor-pointer group"
                    onClick={() => setActiveCard('join')}
                  >
                    <CardHeader>
                      <CardTitle className="text-base font-bold text-slate-200 text-center group-hover:text-purple-400 transition-colors">
                        Tilslut eksisterende rum
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🚪</div>
                      <p className="text-sm text-slate-500">Brug rumkode for at deltage</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Create room form */}
            {activeCard === 'create' && (
              <div className="max-w-md mx-auto animate-scale-in">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center justify-between">
                      Opret nyt rum
                      <Button variant="outline" size="sm" onClick={resetForm}
                        className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
                        ← Tilbage
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="roomName" className="text-slate-300">Rum navn</Label>
                      <Input
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Mit fantastiske rum"
                        maxLength={50}
                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulty" className="text-slate-300">Vanskelighed</Label>
                      <Select value={difficulty} onValueChange={(value: 'let' | 'mellem' | 'svaer') => setDifficulty(value)}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2030] border-white/10">
                          <SelectItem value="let">Let (500+ ord)</SelectItem>
                          <SelectItem value="mellem">Mellem (300+ ord)</SelectItem>
                          <SelectItem value="svaer">Svær (100+ ord)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch id="bonusLetters" checked={bonusLetters} onCheckedChange={setBonusLetters} />
                      <Label htmlFor="bonusLetters" className="text-slate-300">Bonusbogstaver (Æ, Ø, Å)</Label>
                    </div>

                    <Button 
                      onClick={createRoom} 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold shadow-lg shadow-orange-500/15"
                    >
                      {loading ? "Opretter..." : "Opret rum"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Join room form */}
            {activeCard === 'join' && (
              <div className="max-w-md mx-auto animate-scale-in">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-white flex items-center justify-between">
                      Tilslut eksisterende rum
                      <Button variant="outline" size="sm" onClick={resetForm}
                        className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10">
                        ← Tilbage
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="joinRoomId" className="text-slate-300">Rum ID</Label>
                      <Input
                        id="joinRoomId"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        placeholder="ABCD"
                        maxLength={4}
                        className="uppercase bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                      />
                    </div>

                    <Button 
                      onClick={joinRoom}
                      className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-400 hover:to-violet-400 text-white font-bold shadow-lg shadow-purple-500/15"
                    >
                      Tilslut rum
                    </Button>

                    <div className="text-sm text-slate-500 space-y-2 bg-white/3 rounded-lg p-4 border border-white/5">
                      <p><strong className="text-slate-400">Sådan spiller du:</strong></p>
                      <ul className="list-disc list-inside space-y-1 text-slate-500">
                        <li>Skriv et dansk ord der indeholder den viste stavelse</li>
                        <li>Ord kan ikke genbruges i samme spil</li>
                        <li>Du har 10-25 sekunder per tur</li>
                        <li>Mister bomben? Du mister et liv!</li>
                        <li>Sidste spiller tilbage vinder</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};
