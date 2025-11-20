import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import type { GroceryList } from '../types';

interface EditListDialogProps {
  open: boolean;
  list: GroceryList | null;
  onClose: () => void;
  onUpdate: (id: string, name: string, description?: string) => void;
}

export const EditListDialog = ({ open, list, onClose, onUpdate }: EditListDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || '');
    }
  }, [list]);

  const handleSubmit = () => {
    if (list && name.trim()) {
      onUpdate(list.id, name, description || undefined);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit List</DialogTitle>
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
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};
