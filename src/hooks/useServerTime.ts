import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useServerTime = () => {
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    const calculateServerTimeOffset = async () => {
      try {
        const clientTimeBeforeRequest = Date.now();
        
        // Get server time by querying the database
        const { data, error } = await supabase.rpc('get_server_time');
        
        if (error) {
          console.error('Failed to get server time:', error);
          setIsCalculated(true);
          return;
        }
        
        const clientTimeAfterRequest = Date.now();
        const roundTripTime = clientTimeAfterRequest - clientTimeBeforeRequest;
        
        // Estimate server time accounting for round trip
        const estimatedServerTime = new Date(data).getTime() + (roundTripTime / 2);
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