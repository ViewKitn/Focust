export const validateGoalText = (text: string) => text.length >= 1 && text.length <= 500;
export const validateChatMessage = (text: string) => text.length >= 1 && text.length <= 200;
export const validateNickname = (text: string) => text.length >= 1 && text.length <= 30;
export const validateRoomCode = (code: string) => /^[A-Z0-9]{6}$/.test(code);
export const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
