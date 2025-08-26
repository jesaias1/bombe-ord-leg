
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
  const [bonusLetters, setBonusLetters] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWordImporter, setShowWordImporter] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeCard, setActiveCard] = useState<'create' | 'join' | null>(null);

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      if (!user || isGuest) return false;
      
      // Check if user has admin role in user_roles table
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
    setBonusLetters(false);
    setJoinRoomId('');
  };

  const createRoom = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    if (!roomName.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast et navn til rummet",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const roomId = generateRoomId();
      
      console.log('Creating room with user:', { 
        id: user.id, 
        displayName: user.user_metadata?.display_name,
        isGuest 
      });
      
      const { error } = await supabase
        .from('rooms')
        .insert({
          id: roomId,  // This is the room code, not UUID - rooms table uses text for id
          name: roomName.trim(),
          creator_id: user.id,
          difficulty,
          bonus_letters_enabled: bonusLetters,
        });

      if (error) {
        console.error('Supabase error creating room:', error);
        toast({
          title: "Fejl",
          description: `Kunne ikke oprette rummet: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Rum oprettet!",
        description: `Rum ${roomId} er klar til spil`,
      });

      navigate(`/room/${roomId}`);
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Fejl",
        description: error.message || "Kunne ikke oprette rummet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (!joinRoomId.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast et rum ID",
        variant: "destructive",
      });
      return;
    }

    console.log('Joining room with user:', {
      id: user.id,
      displayName: user.user_metadata?.display_name,
      isGuest
    });

    navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-accent/10 p-4">
      <div className="max-w-6xl mx-auto pt-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            💣 Ordbomben 💣
          </h1>
          <p className="text-xl text-muted-foreground">
            Multiplayer ordspil på dansk
          </p>
          {!user && (
            <div className="mt-6">
              <Button onClick={() => setShowAuthModal(true)} size="lg">
                🎮 Start spillet
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                Spil som gæst eller opret en konto
              </p>
            </div>
          )}
          {user && isGuest && (
            <p className="text-sm text-primary mt-4">
              Spiller som gæst: {user.user_metadata?.display_name}
            </p>
          )}
          {user && !isGuest && (
            <p className="text-sm text-secondary mt-4">
              Logget ind som: {user.email}
            </p>
          )}
        </div>

        {/* Admin section - visible when logged in as admin */}
        {isAdmin && (
          <div className="mb-8 animate-fade-in">
            <Card className="bg-card/90 backdrop-blur-sm shadow-xl border border-border">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🔧 Administrator Panel</span>
                  <Button 
                    onClick={() => setShowWordImporter(!showWordImporter)}
                    variant="outline"
                    size="sm"
                  >
                    {showWordImporter ? "Skjul" : "Vis"} ordimporter
                  </Button>
                </CardTitle>
              </CardHeader>
              {showWordImporter && (
                <CardContent>
                  <WordImporter />
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {user && (
          <>
            {/* User Stats Section - Only show for registered users */}
            {!isGuest && (
              <div className="mb-8 animate-fade-in">
                <UserStats />
              </div>
            )}

            {!activeCard && (
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-scale-in">
                {/* Create Room Button */}
                <Card 
                  className="bg-card/90 backdrop-blur-sm shadow-xl border border-border transform hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveCard('create')}
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground text-center">Opret nyt rum</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-6xl mb-4">🎮</div>
                    <p className="text-muted-foreground">Start et nyt spil med dine indstillinger</p>
                  </CardContent>
                </Card>

                {/* Join Room Button */}
                <Card 
                  className="bg-card/90 backdrop-blur-sm shadow-xl border border-border transform hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                  onClick={() => setActiveCard('join')}
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground text-center">Tilslut eksisterende rum</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-6xl mb-4">🚪</div>
                    <p className="text-muted-foreground">Deltag i et eksisterende spil</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeCard === 'create' && (
              <div className="max-w-md mx-auto animate-scale-in">
                <Card className="bg-card/90 backdrop-blur-sm shadow-xl border border-border">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground flex items-center justify-between">
                      Opret nyt rum
                      <Button variant="outline" size="sm" onClick={resetForm}>
                        ← Tilbage
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="roomName">Rum navn</Label>
                      <Input
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Mit fantastiske rum"
                        maxLength={50}
                      />
                    </div>

                    <div>
                      <Label htmlFor="difficulty">Vanskelighed</Label>
                      <Select 
                        value={difficulty} 
                        onValueChange={(value: 'let' | 'mellem' | 'svaer') => setDifficulty(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="let">Let (500+ ord)</SelectItem>
                          <SelectItem value="mellem">Mellem (300+ ord)</SelectItem>
                          <SelectItem value="svaer">Svær (100+ ord)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="bonusLetters"
                        checked={bonusLetters}
                        onCheckedChange={setBonusLetters}
                      />
                      <Label htmlFor="bonusLetters">Bonusbogstaver (Æ, Ø, Å)</Label>
                    </div>

                    <Button 
                      onClick={createRoom} 
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground font-bold shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      {loading ? "Opretter..." : "Opret rum"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeCard === 'join' && (
              <div className="max-w-md mx-auto animate-scale-in">
                <Card className="bg-card/90 backdrop-blur-sm shadow-xl border border-border">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-foreground flex items-center justify-between">
                      Tilslut eksisterende rum
                      <Button variant="outline" size="sm" onClick={resetForm}>
                        ← Tilbage
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="joinRoomId">Rum ID</Label>
                      <Input
                        id="joinRoomId"
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        placeholder="ABCD"
                        maxLength={4}
                        className="uppercase"
                      />
                    </div>

                    <Button 
                      onClick={joinRoom}
                      className="w-full bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-secondary-foreground font-bold shadow-lg transform hover:scale-105 transition-all duration-300"
                    >
                      Tilslut rum
                    </Button>

                    <div className="text-sm text-muted-foreground space-y-2 bg-gradient-to-r from-secondary/5 to-accent/5 rounded-lg p-4 border border-border">
                      <p><strong>Sådan spiller du:</strong></p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Skriv et dansk ord der indeholder den viste stavelse</li>
                        <li>Ord kan ikke genbruges i samme spil</li>
                        <li>Du har 10-25 sekunder per tur</li>
                        <li>Mister bomben? Du mister et liv!</li>
                        <li>Sidste spiller tilbage vinder (eller træn solo!)</li>
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
