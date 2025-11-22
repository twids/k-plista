import { useState, useRef } from 'react';

export const useEmojiPicker = (initialValue = '') => {
  const [emoji, setEmoji] = useState(initialValue);
  const emojiInputRef = useRef<HTMLInputElement>(null);

  const handleEmojiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract only the first emoji from the input
    const value = e.target.value;
    if (value) {
      // Get the first character (which should be an emoji if the user selected one)
      const firstChar = Array.from(value)[0];
      setEmoji(firstChar);
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
