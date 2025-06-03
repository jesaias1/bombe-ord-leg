
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
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInAnonymously } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
      onClose();
      toast({
        title: isLogin ? "Velkommen tilbage!" : "Konto oprettet!",
        description: isLogin ? "Du er nu logget ind." : "Du kan nu spille spillet.",
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

  const handleAnonymousJoin = async () => {
    if (!displayName.trim()) {
      toast({
        title: "Fejl",
        description: "Indtast venligst dit navn",
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
        description: "Du er nu klar til at spille.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLogin ? "Log ind" : "Opret konto"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Spillernavn</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Indtast dit spillernavn"
              required
            />
          </div>
          
          {isLogin || !isLogin ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email (valgfri)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Adgangskode (valgfri)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Indtast adgangskode"
                />
              </div>
            </>
          ) : null}
          
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              onClick={handleAnonymousJoin}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Opretter..." : "Spil som gæst"}
            </Button>
            
            {email && password && (
              <Button type="submit" disabled={loading} variant="outline" className="w-full">
                {loading ? "Behandler..." : (isLogin ? "Log ind" : "Opret konto")}
              </Button>
            )}
          </div>
        </form>
        
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isLogin ? "Har du ikke en konto? Opret en" : "Har du allerede en konto? Log ind"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
