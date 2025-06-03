
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

export const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [roomName, setRoomName] = useState('');
  const [difficulty, setDifficulty] = useState<'let' | 'mellem' | 'svaer'>('mellem');
  const [bonusLetters, setBonusLetters] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loading, setLoading] = useState(false);

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const createRoom = async () => {
    if (!user) return;
    
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
      
      const { error } = await supabase
        .from('rooms')
        .insert({
          id: roomId,
          name: roomName.trim(),
          creator_id: user.id,
          difficulty,
          bonus_letters_enabled: bonusLetters,
        });

      if (error) throw error;

      toast({
        title: "Rum oprettet!",
        description: `Rum ${roomId} er klar til spil`,
      });

      navigate(`/room/${roomId}`);
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke oprette rummet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast et rum ID",
        variant: "destructive",
      });
      return;
    }

    navigate(`/room/${joinRoomId.trim().toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            💣 Ordbomben 💣
          </h1>
          <p className="text-xl text-gray-600">
            Multiplayer ordspil på dansk
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Opret nyt rum</CardTitle>
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
                <Select value={difficulty} onValueChange={(value: 'let' | 'mellem' | 'svaer') => setDifficulty(value)}>
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
                disabled={loading || !user}
                className="w-full"
              >
                {loading ? "Opretter..." : "Opret rum"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tilslut eksisterende rum</CardTitle>
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
                disabled={!user}
                className="w-full"
                variant="outline"
              >
                Tilslut rum
              </Button>

              <div className="text-sm text-gray-600 space-y-2">
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
      </div>
    </div>
  );
};
