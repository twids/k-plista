
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
} from '@mui/material';
import type { ItemGroup } from '../types';

interface AddItemDialogProps {
  open: boolean;
  groups: ItemGroup[];
  onClose: () => void;
  onAdd: (name: string, quantity: number, unit?: string, groupId?: string) => void;
  onCreateGroup?: (name: string, color?: string, icon?: string) => Promise<string>; // returns new groupId
}

export const AddItemDialog = ({ open, groups, onClose, onAdd, onCreateGroup }: AddItemDialogProps) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [groupId, setGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [emoji, setEmoji] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name, quantity, unit || undefined, groupId || undefined);
      setName('');
      setQuantity(1);
      setUnit('');
      setGroupId('');
    }
  };

  const handleCreateGroup = async () => {
    if (onCreateGroup && newGroupName.trim()) {
      // Use emoji as icon
      const newId = await onCreateGroup(newGroupName, undefined, emoji || undefined);
      setGroupId(newId);
      setNewGroupName('');
      setShowNewGroup(false);
      setEmoji('');
    }
  };

  // Emoji picker using system dialog
  const handleEmojiPicker = () => {
    // Use the native emoji picker if available
    // This works in Chrome/Edge/Opera, not Firefox/Safari
    const input = document.createElement('input');
    input.type = 'text';
    input.style.position = 'absolute';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.onblur = () => document.body.removeChild(input);
    input.oninput = () => {
      setEmoji(input.value);
      document.body.removeChild(input);
    };
    // Open emoji picker (Win + . or Cmd + Ctrl + Space)
    input.setSelectionRange(0, 0);
    input.click();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Item</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Item Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Quantity"
          type="number"
          fullWidth
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Unit (e.g., kg, pcs)"
          fullWidth
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          sx={{ mb: 2 }}
        />
        {groups.length > 0 && !showNewGroup && (
          <TextField
            select
            margin="dense"
            label="Group (optional)"
            fullWidth
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <MenuItem value="">None</MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
            <MenuItem value="__new__" onClick={() => setShowNewGroup(true)}>
              + Create new group
            </MenuItem>
          </TextField>
        )}
        {showNewGroup && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <TextField
              label="New Group Name"
              fullWidth
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="outlined" onClick={handleEmojiPicker} sx={{ mr: 2 }}>
              {emoji ? `Icon: ${emoji}` : 'Pick Emoji Icon'}
            </Button>
            {emoji && (
              <Button size="small" onClick={() => setEmoji('')}>Clear Icon</Button>
            )}
            <Button
              variant="contained"
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim()}
            >
              Create Group
            </Button>
            <Button sx={{ ml: 2 }} onClick={() => setShowNewGroup(false)}>Cancel</Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};
