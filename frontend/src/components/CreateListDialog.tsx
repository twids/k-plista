import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import { AUTO_REMOVE_DELAY_OPTIONS, DEFAULT_AUTO_REMOVE_DELAY } from '../constants/autoRemove';

interface CreateListDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description?: string, autoRemoveBoughtItemsEnabled?: boolean, autoRemoveBoughtItemsDelayMinutes?: number) => void;
}

export const CreateListDialog = ({ open, onClose, onCreate }: CreateListDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [autoRemoveEnabled, setAutoRemoveEnabled] = useState(false);
  const [autoRemoveDelay, setAutoRemoveDelay] = useState(DEFAULT_AUTO_REMOVE_DELAY);

  const handleSubmit = () => {
    if (name.trim()) {
      onCreate(
        name, 
        description || undefined,
        autoRemoveEnabled,
        autoRemoveDelay
      );
      setName('');
      setDescription('');
      setAutoRemoveEnabled(false);
      setAutoRemoveDelay(DEFAULT_AUTO_REMOVE_DELAY);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New List</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="List Name"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Description (optional)"
          fullWidth
          multiline
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 3 }}
        />
        
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Auto-Remove Settings
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={autoRemoveEnabled}
                onChange={(e) => setAutoRemoveEnabled(e.target.checked)}
              />
            }
            label="Automatically remove bought items"
          />
          {autoRemoveEnabled && (
            <TextField
              select
              fullWidth
              label="Remove after"
              value={autoRemoveDelay}
              onChange={(e) => setAutoRemoveDelay(Number(e.target.value))}
              sx={{ mt: 2 }}
            >
              {AUTO_REMOVE_DELAY_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {autoRemoveEnabled && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Bought items will be automatically deleted after the selected time period.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
};
