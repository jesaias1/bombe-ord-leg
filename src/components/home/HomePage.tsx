import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bomb, DoorOpen, LogOut, Play, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';
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

type RoomMode = 'create' | 'join' | null;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const HomePage = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut } = useAuth();
  const { toast } = useToast();

  const [roomName, setRoomName] = useState('');
  const [difficulty, setDifficulty] = useState<'let' | 'mellem' | 'svaer'>('mellem');
  const [bonusLetters, setBonusLetters] = useState(true);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWordImporter, setShowWordImporter] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeCard, setActiveCard] = useState<RoomMode>(null);
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

  const generateRoomId = () => Math.random().toString(36).substring(2, 6).toUpperCase();

  const requireUser = () => {
    if (user) return true;
    setShowAuthModal(true);
    return false;
  };

  const resetForm = () => {
    setActiveCard(null);
    setRoomName('');
    setDifficulty('mellem');
    setBonusLetters(true);
    setJoinRoomId('');
  };

  const createRoom = async () => {
    if (!requireUser()) return;
    if (!roomName.trim()) {
      toast({ title: 'Rum mangler navn', description: 'Giv rummet et kort navn.', variant: 'destructive' });
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
          creator_id: user!.id,
          difficulty,
          bonus_letters_enabled: bonusLetters,
        });

      if (error) {
        toast({ title: 'Kunne ikke oprette rum', description: error.message, variant: 'destructive' });
        return;
      }

      navigate(`/room/${roomId}`);
    } catch (error: unknown) {
      toast({ title: 'Kunne ikke oprette rum', description: getErrorMessage(error, 'Prøv igen om lidt.'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (!requireUser()) return;
    const roomId = joinRoomId.trim().toUpperCase();
    if (roomId.length < 4) {
      toast({ title: 'Rumkode mangler', description: 'Indtast den firecifrede rumkode.', variant: 'destructive' });
      return;
    }
    navigate(`/room/${roomId}`);
  };

  const quickStartSolo = async () => {
    if (!requireUser()) return;
    setQuickStarting(true);
    try {
      const roomId = generateRoomId();
      const { error } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          name: 'Solo træning',
          creator_id: user!.id,
          difficulty: 'mellem',
          bonus_letters_enabled: true,
        });

      if (error) {
        toast({ title: 'Kunne ikke starte solo', description: error.message, variant: 'destructive' });
        return;
      }
      navigate(`/room/${roomId}`);
    } catch (error: unknown) {
      toast({ title: 'Kunne ikke starte solo', description: getErrorMessage(error, 'Prøv igen om lidt.'), variant: 'destructive' });
    } finally {
      setQuickStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1020] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <button onClick={resetForm} className="flex items-center gap-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Bomb className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-black leading-tight">Ordbomben</span>
              <span className="block text-xs text-slate-400">Dansk ordduel</span>
            </span>
          </button>

          {user && (
            <div className="flex items-center gap-2">
              <div className="hidden text-right text-xs text-slate-400 sm:block">
                {isGuest ? user.user_metadata?.display_name || 'Gæst' : user.email}
              </div>
              <Button variant="outline" size="icon" onClick={signOut} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_420px]">
          <div className="space-y-8">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-xs font-medium text-orange-200">
                <Sparkles className="h-3.5 w-3.5" />
                Realtime multiplayer på dansk
              </div>
              <h1 className="text-5xl font-black leading-none tracking-normal text-white sm:text-7xl">
                ORD
                <span className="block text-orange-300">BOMBEN</span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                Hurtige runder, korte rumkoder og et dansk ordgrundlag bygget til spil.
              </p>
            </div>

            {user && !isGuest && (
              <div className="max-w-2xl">
                <UserStats />
              </div>
            )}

            {isAdmin && (
              <Card className="max-w-2xl border-white/10 bg-white/[0.04] text-white">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Admin
                  </CardTitle>
                  <Button onClick={() => setShowWordImporter(!showWordImporter)} variant="outline" size="sm" className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
                    {showWordImporter ? 'Skjul' : 'Importer ord'}
                  </Button>
                </CardHeader>
                {showWordImporter && <CardContent><WordImporter /></CardContent>}
              </Card>
            )}
          </div>

          <Card className="border-white/10 bg-white/[0.06] text-white shadow-2xl shadow-black/30 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">Start spil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeCard && (
                <>
                  <Button
                    onClick={quickStartSolo}
                    disabled={quickStarting}
                    size="lg"
                    className="h-14 w-full justify-start gap-3 bg-orange-500 text-base font-bold text-white hover:bg-orange-400"
                  >
                    <Play className="h-5 w-5" />
                    {quickStarting ? 'Starter...' : 'Solo træning'}
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => setActiveCard('create')} variant="outline" className="h-24 flex-col gap-2 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                      <Plus className="h-5 w-5 text-orange-300" />
                      Opret rum
                    </Button>
                    <Button onClick={() => setActiveCard('join')} variant="outline" className="h-24 flex-col gap-2 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                      <DoorOpen className="h-5 w-5 text-cyan-300" />
                      Deltag
                    </Button>
                  </div>
                </>
              )}

              {activeCard === 'create' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomName" className="text-slate-300">Rumnavn</Label>
                    <Input
                      id="roomName"
                      value={roomName}
                      onChange={(event) => setRoomName(event.target.value)}
                      placeholder="Fredagsfinalen"
                      maxLength={50}
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty" className="text-slate-300">Sværhedsgrad</Label>
                    <Select value={difficulty} onValueChange={(value: 'let' | 'mellem' | 'svaer') => setDifficulty(value)}>
                      <SelectTrigger className="border-white/10 bg-white/5 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#151b2c] text-white">
                        <SelectItem value="let">Let</SelectItem>
                        <SelectItem value="mellem">Mellem</SelectItem>
                        <SelectItem value="svaer">Svær</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
                    <Label htmlFor="bonusLetters" className="text-sm text-slate-300">Æ, Ø og Å bonus</Label>
                    <Switch id="bonusLetters" checked={bonusLetters} onCheckedChange={setBonusLetters} />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={resetForm} variant="outline" className="flex-1 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
                      Tilbage
                    </Button>
                    <Button onClick={createRoom} disabled={loading} className="flex-1 bg-orange-500 font-bold text-white hover:bg-orange-400">
                      {loading ? 'Opretter...' : 'Opret'}
                    </Button>
                  </div>
                </div>
              )}

              {activeCard === 'join' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinRoomId" className="text-slate-300">Rumkode</Label>
                    <Input
                      id="joinRoomId"
                      value={joinRoomId}
                      onChange={(event) => setJoinRoomId(event.target.value.toUpperCase())}
                      placeholder="ABCD"
                      maxLength={4}
                      className="h-14 border-white/10 bg-white/5 text-center font-mono text-2xl uppercase tracking-[0.35em] text-white placeholder:text-slate-700"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={resetForm} variant="outline" className="flex-1 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10">
                      Tilbage
                    </Button>
                    <Button onClick={joinRoom} className="flex-1 gap-2 bg-cyan-500 font-bold text-white hover:bg-cyan-400">
                      <Users className="h-4 w-4" />
                      Deltag
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  );
};
