
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
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInAnonymously } = useAuth();
  const { toast } = useToast();

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
      toast({
        title: "Velkommen!",
        description: "Du er nu klar til at spille som gæst.",
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
      await signIn(email, password);
      onClose();
      toast({
        title: "Velkommen tilbage!",
        description: "Du er nu logget ind.",
      });
    } catch (error: any) {
      // Try sign up if sign in fails
      try {
        await signUp(email, password, displayName || email.split('@')[0]);
        onClose();
        toast({
          title: "Konto oprettet!",
          description: "Du kan nu spille spillet.",
        });
      } catch (signUpError: any) {
        toast({
          title: "Fejl",
          description: signUpError.message,
          variant: "destructive",
        });
      }
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

          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">eller</span>
              </div>
            </div>
          </div>

          {!showEmailForm ? (
            <Button
              onClick={() => setShowEmailForm(true)}
              variant="outline"
              className="w-full"
            >
              Log ind med email
            </Button>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
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
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Logger ind..." : "Log ind / Opret konto"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEmailForm(false)}
                >
                  Tilbage
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
