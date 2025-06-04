
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal = ({ isOpen, onClose }: AuthModalProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInAnonymously } = useAuth();
  const { toast } = useToast();

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setIsSignUp(false);
    setLoading(false);
  };

  const handleGuestPlay = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast venligst dit spillernavn",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await signInAnonymously(displayName);
      onClose();
      resetForm();
      toast({
        title: "Velkommen!",
        description: "Du er nu klar til at spille som gæst.",
      });
    } catch (error: any) {
      console.error('Guest login error:', error);
      toast({
        title: "Fejl",
        description: "Kunne ikke logge ind som gæst. Prøv igen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Fejl", 
        description: "Indtast både email og adgangskode",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign up flow
        const { error } = await signUp(email, password, displayName || email.split('@')[0]);
        if (error) {
          // Handle specific signup errors
          if (error.message.includes('rate limit')) {
            toast({
              title: "For mange forsøg",
              description: "Vent et øjeblik før du prøver igen.",
              variant: "destructive",
            });
          } else if (error.message.includes('already registered')) {
            toast({
              title: "Email allerede registreret",
              description: "Prøv at logge ind i stedet.",
              variant: "destructive",
            });
            setIsSignUp(false);
          } else {
            toast({
              title: "Fejl ved oprettelse",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          onClose();
          resetForm();
          toast({
            title: "Konto oprettet!",
            description: "Tjek din email for at bekræfte din konto.",
          });
        }
      } else {
        // Sign in flow
        const { error } = await signIn(email, password);
        if (error) {
          // Handle specific signin errors
          if (error.message.includes('rate limit')) {
            toast({
              title: "For mange forsøg",
              description: "Vent et øjeblik før du prøver igen.",
              variant: "destructive",
            });
          } else if (error.message.includes('Invalid login credentials')) {
            toast({
              title: "Forkerte loginoplysninger",
              description: "Tjek din email og adgangskode.",
              variant: "destructive",
            });
          } else if (error.message.includes('Email not confirmed')) {
            toast({
              title: "Email ikke bekræftet",
              description: "Tjek din email og klik på bekræftelseslinket.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login fejl",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          onClose();
          resetForm();
          toast({
            title: "Velkommen tilbage!",
            description: "Du er nu logget ind.",
          });
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast({
        title: "Uventet fejl",
        description: "Noget gik galt. Prøv igen senere.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Quick admin login function
  const handleAdminLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signIn('lin4s@live.dk', 'miebs112');
      if (error) {
        if (error.message.includes('rate limit')) {
          toast({
            title: "For mange forsøg",
            description: "Vent et øjeblik før du prøver igen.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Admin login fejl",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        onClose();
        resetForm();
        toast({
          title: "Admin login successfuld!",
          description: "Du er nu logget ind som administrator.",
        });
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      toast({
        title: "Admin login fejl",
        description: "Kunne ikke logge ind som admin.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">🎮 Kom i gang!</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quick Admin Login Button */}
          <div className="text-center">
            <Button
              onClick={handleAdminLogin}
              disabled={loading}
              variant="outline"
              className="w-full py-2 text-sm bg-blue-50 hover:bg-blue-100"
            >
              🔧 Admin Login (lin4s@live.dk)
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">eller</span>
            </div>
          </div>

          {/* Guest Play Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-lg">Spillernavn</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Dit spillernavn"
                className="text-lg py-3"
                required
              />
            </div>
            
            <Button
              onClick={handleGuestPlay}
              disabled={loading}
              className="w-full py-3 text-lg bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
            >
              {loading ? "Starter spil..." : "🚀 Spil som gæst"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">eller</span>
            </div>
          </div>

          {/* Email Auth Section */}
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button
                onClick={() => setIsSignUp(false)}
                variant={!isSignUp ? "default" : "outline"}
                className="flex-1"
              >
                Log ind
              </Button>
              <Button
                onClick={() => setIsSignUp(true)}
                variant={isSignUp ? "default" : "outline"}
                className="flex-1"
              >
                Opret konto
              </Button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
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
              
              <div className="space-y-2">
                <Label htmlFor="password">Adgangskode</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Adgangskode"
                  required
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Behandler..." : (isSignUp ? "Opret konto" : "Log ind")}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
