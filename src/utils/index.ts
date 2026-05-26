/**
 * Formatea segundos en formato MM:SS para los relojes del juego.
 * @param seconds Cantidad de segundos totales.
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Genera un ID de sala temporal en el cliente.
 */
export const generateRoomId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};
