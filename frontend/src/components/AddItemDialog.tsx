import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
} from '@mui/material';
import type { ItemGroup } from '../types';

interface AddItemDialogProps {
  open: boolean;
  groups: ItemGroup[];
  onClose: () => void;
  onAdd: (name: string, quantity: number, unit?: string, groupId?: string) => void;
}

export const AddItemDialog = ({ open, groups, onClose, onAdd }: AddItemDialogProps) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [groupId, setGroupId] = useState('');

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name, quantity, unit || undefined, groupId || undefined);
      setName('');
      setQuantity(1);
      setUnit('');
      setGroupId('');
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
        {groups.length > 0 && (
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
          </TextField>
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
