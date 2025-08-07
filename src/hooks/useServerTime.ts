import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useServerTime = () => {
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    const calculateServerTimeOffset = async () => {
      try {
        const clientTimeBeforeRequest = Date.now();
        
        // Get server time by using a simple query to get current timestamp
        const { data, error } = await supabase
          .from('games')
          .select('created_at')
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') { // Allow "no rows" error
          console.error('Failed to get server time:', error);
          setIsCalculated(true);
          return;
        }
        
        // Use current time as fallback if no games exist
        const serverTime = data?.created_at ? new Date(data.created_at).getTime() : Date.now();
        const clientTimeAfterRequest = Date.now();
        const roundTripTime = clientTimeAfterRequest - clientTimeBeforeRequest;
        
        // Estimate server time accounting for round trip
        const estimatedServerTime = serverTime + (roundTripTime / 2);
        const clientTime = clientTimeAfterRequest;
        
        const offset = estimatedServerTime - clientTime;
        setServerTimeOffset(offset);
        setIsCalculated(true);
        
        console.log('Server time offset calculated:', offset + 'ms');
      } catch (error) {
        console.error('Error calculating server time offset:', error);
        setIsCalculated(true);
      }
    };

    calculateServerTimeOffset();
  }, []);

  const getServerTime = () => {
    return Date.now() + serverTimeOffset;
  };

  return {
    getServerTime,
    isCalculated,
    serverTimeOffset
  };
};