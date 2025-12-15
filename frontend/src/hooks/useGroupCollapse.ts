import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing group collapse state with localStorage persistence.
 * Each group's collapse state is stored per list to maintain separate states across different lists.
 * 
 * @param listId - The ID of the grocery list
 * @returns Object containing collapse states and toggle function
 */
export const useGroupCollapse = (listId: string | undefined) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Load collapsed groups from localStorage when listId changes
  useEffect(() => {
    if (!listId) return;

    const storageKey = `groupCollapse_${listId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCollapsedGroups(new Set(parsed));
      } else {
        setCollapsedGroups(new Set());
      }
    } catch (error) {
      console.error('Failed to load collapse state from localStorage:', error);
      setCollapsedGroups(new Set());
    }
  }, [listId]);

  // Toggle collapse state for a specific group
  const toggleGroupCollapse = useCallback((groupId: string) => {
    if (!listId) return;

    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }

      // Save to localStorage
      const storageKey = `groupCollapse_${listId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.error('Failed to save collapse state to localStorage:', error);
      }

      return newSet;
    });
  }, [listId]);

  // Check if a group is collapsed
  const isGroupCollapsed = useCallback((groupId: string) => {
    return collapsedGroups.has(groupId);
  }, [collapsedGroups]);

  return {
    isGroupCollapsed,
    toggleGroupCollapse,
  };
};
