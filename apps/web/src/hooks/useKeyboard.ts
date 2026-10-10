import { useEffect, useRef, useState } from 'react';

// Global variable to track if user is typing
let isTypingRef = false;

export function useKeyboard() {
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  const setIsTyping = (typing: boolean) => {
    isTypingRef = typing;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingRef) return;
      setKeys(prev => ({ ...prev, [e.code]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.code]: false }));
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setIsTyping(true);
      }
    };

    const handleFocusOut = () => {
      setIsTyping(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return { keys, isTypingRef, setIsTyping };
}

export { isTypingRef };