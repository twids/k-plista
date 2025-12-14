import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  InputAdornment,
  IconButton,
} from '@mui/material';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import ClearIcon from '@mui/icons-material/Clear';
import { COMMON_EMOJIS, EMOJI_DISPLAY_SIZE, EMOJI_SELECTOR_SIZE, EMOJI_PICKER_HELP_TEXT } from '../constants/emojis';
import { useEmojiPicker } from '../hooks/useEmojiPicker';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, color?: string, icon?: string) => void;
}

const groupColors = [
  '#F44336', // Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#FF9800', // Orange
];

export const CreateGroupDialog = ({ open, onClose, onCreate }: CreateGroupDialogProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(groupColors[0]);
  const { emoji: icon, setEmoji: setIcon, emojiInputRef, handleEmojiInputChange, handleEmojiClick, clearEmoji } = useEmojiPicker();

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate(name, color, icon || undefined);
      setName('');
      setColor(groupColors[0]);
      clearEmoji();
    }
  };

  const handleClose = () => {
    setName('');
    setColor(groupColors[0]);
    clearEmoji();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Group</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Group Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Emoji Icon (optional)</Typography>
          
          {/* Native emoji picker approach */}
          <Box sx={{ mb: 2 }}>
            <TextField
              inputRef={emojiInputRef}
              placeholder="Click to select emoji"
              value={icon}
              onChange={handleEmojiInputChange}
              onClick={handleEmojiClick}
              fullWidth
              inputProps={{
                'aria-label': 'Select an emoji icon for this group using your system emoji picker',
              }}
              InputProps={{
                startAdornment: icon ? (
                  <InputAdornment position="start">
                    <Box sx={{ fontSize: EMOJI_DISPLAY_SIZE }}>{icon}</Box>
                  </InputAdornment>
                ) : null,
                endAdornment: (
                  <InputAdornment position="end">
                    {icon ? (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearEmoji();
                        }}
                      >
                        <ClearIcon />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={handleEmojiClick}>
                        <EmojiEmotionsIcon />
                      </IconButton>
                    )}
                  </InputAdornment>
                ),
              }}
              sx={{ cursor: 'pointer' }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {EMOJI_PICKER_HELP_TEXT}
            </Typography>
          </Box>

          {/* Quick selection from common emojis */}
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Or select from common options:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {COMMON_EMOJIS.map((emoji) => (
              <Box
                key={emoji}
                onClick={() => setIcon(emoji)}
                sx={{
                  width: EMOJI_SELECTOR_SIZE,
                  height: EMOJI_SELECTOR_SIZE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  borderRadius: 1,
                  border: icon === emoji ? '2px solid #1976d2' : '1px solid #ccc',
                  fontSize: '1.5rem',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                }}
              >
                {emoji}
              </Box>
            ))}
          </Box>
        </Box>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Color</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {groupColors.map((c) => (
              <Box
                key={c}
                onClick={() => setColor(c)}
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: color === c ? '3px solid #000' : '2px solid #ccc',
                }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};
