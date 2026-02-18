/**
 * Validates if a string is a valid UUID format
 */
export const isUuid = (s: string): boolean => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

/**
 * Validates that a room ID is a UUID, throws error if not
 */
export const validateRoomId = (roomId: string): void => {
  if (!isUuid(roomId)) {
    throw new Error(`Invalid room UUID format: ${roomId}`);
  }
};

/**
 * Runtime guard to ensure room ID is UUID before RPC calls
 */
export const ensureRoomUuid = (roomId: string, errorMessage: string = 'Invalid room ID format'): string => {
  if (!isUuid(roomId)) {
    throw new Error(`${errorMessage}: ${roomId}`);
  }
  return roomId;
};