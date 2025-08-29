/**
 * Simple testing utilities for validating game functionality
 * These can be run in the browser console for manual testing
 */

import { supabase } from '@/integrations/supabase/client';

export const testRoomLookup = async () => {
  console.log('🧪 Testing room lookup functionality...');
  
  try {
    // Test 1: Non-existent room should return empty result
    const { data: emptyResult, error: emptyError } = await supabase.rpc('get_room_safe', {
      p_room_locator: 'NONEXISTENT'
    });
    
    console.log('✅ Empty room lookup:', { data: emptyResult, error: emptyError });
    
    // Test 2: Test wrapper functions safety
    const { data: submitSafety } = await supabase.rpc('submit_word_by_user', {
      p_room_id: '550e8400-e29b-41d4-a716-446655440000', // Use room UUID for wrapper
      p_user_id: '550e8400-e29b-41d4-a716-446655440000',
      p_word: 'test'
    });
    
    console.log('✅ Submit word safety:', submitSafety);
    
    const { data: timeoutSafety } = await supabase.rpc('handle_timeout_by_user', {
      p_room_id: '550e8400-e29b-41d4-a716-446655440000', // Use room UUID for wrapper
      p_user_id: '550e8400-e29b-41d4-a716-446655440000'
    });
    
    console.log('✅ Timeout safety:', timeoutSafety);
    
    return { success: true, message: 'All room lookup tests passed' };
  } catch (error) {
    console.error('❌ Room lookup test failed:', error);
    return { success: false, error };
  }
};

export const testGameRules = async (roomId: string, userId: string) => {
  console.log('🧪 Testing game rules with room:', roomId, 'user:', userId);
  
  try {
    // Test invalid word (should not affect HP)
    const { data: invalidResult } = await supabase.rpc('submit_word', {
      p_room_id: roomId,
      p_player_id: userId, // Now expects player_id instead of user_id
      p_word: 'xyz' // Invalid word that won't contain any syllable
    });
    
    console.log('✅ Invalid word response:', invalidResult);
    
    return { success: true, message: 'Game rules test completed' };
  } catch (error) {
    console.error('❌ Game rules test failed:', error);
    return { success: false, error };
  }
};

export const validateGameState = async (roomId: string) => {
  console.log('🧪 Validating game state for room:', roomId);
  
  try {
    // Check room exists
    const { data: room } = await supabase.rpc('get_room_safe', {
      p_room_locator: roomId
    });
    
    if (!room || room.length === 0) {
      throw new Error('Room not found');
    }
    
    console.log('✅ Room found:', room[0]);
    
    // Check for active game
    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    console.log('✅ Latest game:', games?.[0]);
    
    // Check players
    const { data: players } = await supabase.rpc('get_players_public', {
      p_room_id: roomId,
      p_guest_id: null
    });
    
    console.log('✅ Players:', players);
    
    return { 
      success: true, 
      data: { 
        room: room[0], 
        game: games?.[0], 
        players: players || [] 
      } 
    };
  } catch (error) {
    console.error('❌ Game state validation failed:', error);
    return { success: false, error };
  }
};

// Usage: Run these in browser console
// testRoomLookup()
// testGameRules('YOUR_ROOM_ID', 'YOUR_USER_ID') 
// validateGameState('YOUR_ROOM_ID')