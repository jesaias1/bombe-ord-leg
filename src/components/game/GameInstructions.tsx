import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle, Clock, Users, Zap, Target, Heart } from 'lucide-react';

export const GameInstructions: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="h-4 w-4" />
          Sådan spiller du
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">🎮 Bombe Ord Leg</DialogTitle>
          <DialogDescription>
            Et hurtigt og spændende dansk ordspil for venner og familie
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-yellow-500" />
                Hurtig start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>1.</strong> Du får en stavelse (f.eks. "lu")</p>
              <p><strong>2.</strong> Find et dansk ord der indeholder stavelsen</p>
              <p><strong>3.</strong> Skriv ordet før tiden løber ud!</p>
              <p className="text-sm text-muted-foreground">
                Eksempel: "lu" → "lufte", "husluk", "bluse" osv.
              </p>
            </CardContent>
          </Card>

          {/* Game Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-blue-500" />
                Spilleregler
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Timer</p>
                  <p className="text-sm text-muted-foreground">
                    Du har 10-20 sekunder til at finde et ord. Tiden løber tør = mister 1 liv!
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Heart className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">Liv</p>
                  <p className="text-sm text-muted-foreground">
                    Alle starter med 3 liv. Løber du tør for tid, mister du 1 liv. 0 liv = elimineret!
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Tur-skift</p>
                  <p className="text-sm text-muted-foreground">
                    Spillerne skiftes til at finde ord. Sidste spiller tilbage vinder!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Word Examples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📝 Ord eksempler</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-2">Stavelse: "st"</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• <strong>st</strong>ol</li>
                    <li>• he<strong>st</strong></li>
                    <li>• ny<strong>st</strong>e</li>
                    <li>• fo<strong>st</strong>er</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Stavelse: "ing"</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• spr<strong>ing</strong></li>
                    <li>• byg<strong>ning</strong></li>
                    <li>• træn<strong>ing</strong></li>
                    <li>• løsn<strong>ing</strong></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 Tips til succes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• <strong>Tænk hurtigt:</strong> Første ord der falder dig ind er ofte godt nok</p>
              <p>• <strong>Ugyldige ord:</strong> Taber du ikke liv - prøv bare igen!</p>
              <p>• <strong>Korte ord:</strong> Selv 3-bogstavs ord tæller (f.eks. "hus" til "us")</p>
              <p>• <strong>Forkert ord?</strong> Ingen panik - ordet bliver i feltet så du kan prøve igen</p>
            </CardContent>
          </Card>

          <div className="flex justify-center pt-4">
            <Button onClick={() => setIsOpen(false)} className="px-8">
              Lad os spille! 🚀
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};