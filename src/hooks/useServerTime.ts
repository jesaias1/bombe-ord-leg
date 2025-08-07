import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useServerTime = () => {
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    // For now, just use client time to avoid synchronization issues
    setIsCalculated(true);
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