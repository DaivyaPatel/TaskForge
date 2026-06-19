import { useEffect } from 'react';

export const useKeyboard = (shortcuts) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // CRITICAL SAFETY CHECK: Ignore shortcuts if the user is typing in an input
      // This includes standard inputs, textareas, and TipTap/RichText contenteditable areas
      const activeElement = document.activeElement;
      if (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable
      ) {
        // Exception: We still want 'Escape' to work to blur inputs
        if (event.key !== 'Escape') return; 
      }

      // Standardize the key combination string
      let key = event.key.toLowerCase();
      
      // Handle the Spacebar (which registers as a literal space character " ")
      if (key === ' ') key = 'space';

      // Attach modifiers (Cmd on Mac, Ctrl on Windows)
      if (event.metaKey || event.ctrlKey) {
        key = `cmd+${key}`;
      }

      // If the pressed key matches a shortcut in our map, trigger it
      if (shortcuts[key]) {
        event.preventDefault(); // Prevents default browser behaviors (like page scrolling on Space)
        shortcuts[key](event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};