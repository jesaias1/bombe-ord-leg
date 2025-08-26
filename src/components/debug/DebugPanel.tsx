import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { testRoomLookup, testGameRules, validateGameState } from '@/utils/testUtils';
import { useAuth } from '@/components/auth/AuthProvider';

export const DebugPanel = ({ roomId }: { roomId?: string }) => {
  const { user } = useAuth();
  const [results, setResults] = useState<string>('');
  const [testRoomId, setTestRoomId] = useState(roomId || '');

  const runTest = async (testFn: () => Promise<any>, testName: string) => {
    setResults(prev => prev + `\n🧪 Running ${testName}...\n`);
    try {
      const result = await testFn();
      setResults(prev => prev + `✅ ${testName}: ${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      setResults(prev => prev + `❌ ${testName} failed: ${error}\n`);
    }
  };

  if (!user) return null;

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm">🔧 Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Room ID"
            value={testRoomId}
            onChange={(e) => setTestRoomId(e.target.value)}
            className="text-sm"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => runTest(testRoomLookup, 'Room Lookup')}
          >
            Test Room Lookup
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => runTest(
              () => testGameRules(testRoomId, user.id), 
              'Game Rules'
            )}
            disabled={!testRoomId}
          >
            Test Game Rules  
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => runTest(
              () => validateGameState(testRoomId),
              'Game State'
            )}
            disabled={!testRoomId}
          >
            Validate State
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setResults('')}
          >
            Clear
          </Button>
        </div>

        {results && (
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
            {results}
          </div>
        )}
      </CardContent>
    </Card>
  );
};