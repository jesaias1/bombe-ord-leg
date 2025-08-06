
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

  // Check if user is admin
  const { data: isAdmin = false } = useQuery({
    queryKey: ['is-admin'],
    queryFn: async () => {
      if (!user || isGuest) return false;
      return user.email === 'lin4s@live.dk';
    },
    enabled: !!user && !isGuest
  });

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
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
          id: roomId,
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
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-50 to-purple-100 p-4">
      <div className="max-w-6xl mx-auto pt-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            💣 Ordbomben 💣
          </h1>
          <p className="text-xl text-gray-600">
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
            <p className="text-sm text-blue-600 mt-4">
              Spiller som gæst: {user.user_metadata?.display_name}
            </p>
          )}
          {user && !isGuest && (
            <p className="text-sm text-green-600 mt-4">
              Logget ind som: {user.email}
            </p>
          )}
        </div>

        {/* Admin section - visible when logged in as admin */}
        {isAdmin && (
          <div className="mb-8 animate-fade-in">
            <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200">
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

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-scale-in">
              {/* Create Room Card */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200 transform hover:scale-[1.02] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Opret nyt rum</CardTitle>
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
                    onClick={(e) => {
                      e.preventDefault();
                      createRoom();
                    }} 
                    disabled={loading}
                    type="button"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-lg transform hover:scale-105 transition-all duration-300"
                  >
                    {loading ? "Opretter..." : "Opret rum"}
                  </Button>
                </CardContent>
              </Card>

              {/* Join Room Card */}
              <Card className="bg-white/90 backdrop-blur-sm shadow-xl border border-gray-200 transform hover:scale-[1.02] transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-gray-800">Tilslut eksisterende rum</CardTitle>
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
                    onClick={(e) => {
                      e.preventDefault();
                      joinRoom();
                    }}
                    type="button"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold shadow-lg transform hover:scale-105 transition-all duration-300"
                    variant="outline"
                  >
                    Tilslut rum
                  </Button>

                  <div className="text-sm text-gray-600 space-y-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
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
          </>
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};
