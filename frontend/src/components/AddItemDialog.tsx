
import { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  Typography,
  InputAdornment,
  IconButton,
} from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ClearIcon from '@mui/icons-material/Clear';
import type { ItemGroup } from '../types';

interface AddItemDialogProps {
  open: boolean;
  groups: ItemGroup[];
  onClose: () => void;
  onAdd: (name: string, quantity: number, unit?: string, groupId?: string) => void;
  onCreateGroup?: (name: string, color?: string, icon?: string) => Promise<string>; // returns new groupId
}

const commonEmojis = [
  '🍎', '🥖', '🥛', '🥚', '🧀', '🥩', '🍗', '🐟',
  '🥕', '🥒', '🌽', '🍅', '🥬', '🥦', '🌶️', '🥑',
  '🍌', '🍇', '🍊', '🍋', '🍓', '🫐', '🍑', '🥝',
  '🍞', '🥐', '🥯', '🧈', '🥞', '🧇', '🍪', '🍰',
  '🍺', '🍷', '🥤', '☕', '🧃', '🧋', '🥫', '🍯'
];

export const AddItemDialog = ({ open, groups, onClose, onAdd, onCreateGroup }: AddItemDialogProps) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [groupId, setGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [emoji, setEmoji] = useState('');
  const emojiInputRef = useRef<HTMLInputElement>(null);

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

  const handleEmojiInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract only the first emoji from the input
    const value = e.target.value;
    if (value) {
      // Get the first character (which should be an emoji if the user selected one)
      const firstChar = Array.from(value)[0];
      setEmoji(firstChar);
    }
  };

  const handleEmojiClick = () => {
    // Focus on the emoji input to trigger the native emoji picker
    if (emojiInputRef.current) {
      emojiInputRef.current.focus();
    }
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
            <MenuItem value="">No Group</MenuItem>
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
            
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Emoji Icon (optional)</Typography>
            
            {/* Native emoji picker approach */}
            <TextField
              inputRef={emojiInputRef}
              placeholder="Click to select emoji"
              value={emoji}
              onChange={handleEmojiInputChange}
              onClick={handleEmojiClick}
              fullWidth
              size="small"
              InputProps={{
                readOnly: true,
                startAdornment: emoji ? (
                  <InputAdornment position="start">
                    <Box sx={{ fontSize: '1.5rem' }}>{emoji}</Box>
                  </InputAdornment>
                ) : null,
                endAdornment: (
                  <InputAdornment position="end">
                    {emoji ? (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmoji('');
                        }}
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={handleEmojiClick}>
                        <EmojiEmotionsIcon fontSize="small" />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
              sx={{ cursor: 'pointer', mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Tip: Use your system's emoji picker (Windows: Win + . | Mac: Cmd + Ctrl + Space | Linux: Ctrl + . or Ctrl + ;)
            </Typography>
            
            {/* Quick selection from common emojis */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Or select from common options:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {commonEmojis.map((emojiOption) => (
                <Box
                  key={emojiOption}
                  onClick={() => setEmoji(emojiOption)}
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: 1,
                    border: emoji === emojiOption ? '2px solid #1976d2' : '1px solid #ccc',
                    fontSize: '1.2rem',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  {emojiOption}
                </Box>
              ))}
            </Box>
            
            <Box>
              <Button
                variant="contained"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
              >
                Create Group
              </Button>
              <Button sx={{ ml: 2 }} onClick={() => {
                setShowNewGroup(false);
                setEmoji('');
              }}>
                Cancel
              </Button>
            </Box>
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
