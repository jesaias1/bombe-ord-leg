
import { useUserStats } from '@/hooks/useUserStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Zap, Clock, GamepadIcon, Crown } from 'lucide-react';

export const UserStats = () => {
  const { stats, isLoading } = useUserStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Dine Statistikker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Indlæser statistikker...</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Dine Statistikker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Ingen statistikker fundet. Spil dit første spil for at se dine stats!</p>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}t ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const winRate = stats.total_games_played > 0 
    ? Math.round((stats.total_games_won / stats.total_games_played) * 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Dine Statistikker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Words */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Target className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{stats.total_words_guessed}</div>
            <div className="text-sm text-blue-600">Ord gættet</div>
          </div>

          {/* Current Streak */}
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <Zap className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{stats.current_streak}</div>
            <div className="text-sm text-green-600">Nuværende streak</div>
          </div>

          {/* Longest Streak */}
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Crown className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">{stats.longest_streak}</div>
            <div className="text-sm text-purple-600">Længste streak</div>
          </div>

          {/* Games Played */}
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <GamepadIcon className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-700">{stats.total_games_played}</div>
            <div className="text-sm text-orange-600">Spil spillet</div>
          </div>

          {/* Win Rate */}
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-700">{winRate}%</div>
            <div className="text-sm text-yellow-600">Sejrsrate</div>
          </div>

          {/* Playtime */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Clock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-700">{formatTime(stats.total_playtime_seconds)}</div>
            <div className="text-sm text-gray-600">Spilletid</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-6 space-y-2">
          {stats.fastest_word_time && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Hurtigste ord:</span>
              <Badge variant="secondary">{(stats.fastest_word_time / 1000).toFixed(1)}s</Badge>
            </div>
          )}
          
          {stats.favorite_syllable && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Yndlings stavelse:</span>
              <Badge variant="outline">{stats.favorite_syllable}</Badge>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Spil vundet:</span>
            <Badge variant="default">{stats.total_games_won}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
