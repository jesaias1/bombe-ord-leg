
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInAsGuest } = useAuth();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: displayName.trim() || email.split('@')[0]
          }
        }
      });

      if (error) throw error;

      // Send welcome email
      if (data.user) {
        try {
          await supabase.functions.invoke('send-welcome-email', {
            body: { 
              email: data.user.email,
              name: data.user.email?.split('@')[0] // Use part before @ as name
            }
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't show error to user - just log it
        }
      }

      toast({
        title: "Konto oprettet!",
        description: "Tjek din email for at bekræfte din konto. Du vil også modtage en velkomstmail.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Velkommen tilbage!",
        description: "Du er nu logget ind",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: "Fejl",
        description: "Indtast din email først",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast({
        title: "Email sendt!",
        description: "Tjek din email for at nulstille din adgangskode",
      });
    } catch (error: any) {
      toast({
        title: "Fejl",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast et navn for at spille som gæst",
        variant: "destructive",
      });
      return;
    }

    signInAsGuest(guestName.trim());
    toast({
      title: "Velkommen!",
      description: `Du spiller nu som gæst: ${guestName}`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kom i gang med Ordbomben</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="guest" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="guest">Gæst</TabsTrigger>
            <TabsTrigger value="signin">Log ind</TabsTrigger>
            <TabsTrigger value="signup">Opret konto</TabsTrigger>
          </TabsList>

          <TabsContent value="guest" className="space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">Spil som gæst</h3>
              <p className="text-sm text-gray-600">
                Start med det samme - ingen konto påkrævet
              </p>
            </div>
            <form onSubmit={handleGuestSignIn} className="space-y-4">
              <div>
                <Label htmlFor="guestName">Dit navn</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Indtast dit navn"
                  maxLength={20}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                🎮 Spil som gæst
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Adgangskode</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logger ind..." : "Log ind"}
              </Button>
            </form>
            
            <div className="text-center">
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Glemt adgangskode?
              </button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Dit navn (vises til andre spillere)</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Indtast dit navn"
                  maxLength={20}
                />
              </div>
              <div>
                <Label htmlFor="signupEmail">Email</Label>
                <Input
                  id="signupEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                  required
                />
              </div>
              <div>
                <Label htmlFor="signupPassword">Adgangskode</Label>
                <Input
                  id="signupPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Opretter..." : "Opret konto"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
