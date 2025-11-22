import { useState, useRef } from 'react';

// Simple check if a character is likely an emoji
// This is not perfect but covers most common emoji use cases
const isLikelyEmoji = (char: string): boolean => {
  const code = char.codePointAt(0);
  if (!code) return false;
  
  // Common emoji ranges (simplified):
  // Emoticons: 0x1F600-0x1F64F
  // Miscellaneous Symbols: 0x1F300-0x1F5FF
  // Transport and Map: 0x1F680-0x1F6FF
  // Supplemental Symbols: 0x1F900-0x1F9FF
  // Food & Drink: 0x1F32D-0x1F37F
  // And many more...
  return code >= 0x1F000 && code <= 0x1FFFF;
};

export const useEmojiPicker = (initialValue = '') => {
  const [emoji, setEmoji] = useState(initialValue);
  const emojiInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract only the first emoji from the input
    const value = e.target.value;
    if (value) {
      // Get the first character (which should be an emoji if the user selected one)
      const firstChar = Array.from(value)[0];
      // Only set if it looks like an emoji
      if (isLikelyEmoji(firstChar)) {
        setEmoji(firstChar);
      }
    } else {
      // Clear the emoji if the input is empty
      setEmoji('');
    }
  };

  const handleEmojiClick = () => {
    // Focus on the emoji input to trigger the native emoji picker
    if (emojiInputRef.current) {
      emojiInputRef.current.focus();
    }
  };

  const clearEmoji = () => {
    setEmoji('');
  };

  return {
    emoji,
    setEmoji,
    emojiInputRef,
    handleEmojiInputChange,
    handleEmojiClick,
    clearEmoji,
  };
};
