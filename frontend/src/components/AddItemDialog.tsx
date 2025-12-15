
import { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import type { ItemGroup, GroceryItem } from '../types';
import { CreateGroupDialog } from './CreateGroupDialog';

interface AddItemDialogProps {
  open: boolean;
  groups: ItemGroup[];
  editItem?: GroceryItem; // Item to edit, if in edit mode
  onClose: () => void;
  onAdd: (name: string, quantity: number, unit?: string, groupId?: string) => void;
  onEdit?: (id: string, name: string, quantity: number, unit?: string, groupId?: string) => void;
  onCreateGroup?: (name: string, color?: string, icon?: string) => Promise<string>; // returns new groupId
}

export const AddItemDialog = ({ open, groups, editItem, onClose, onAdd, onEdit, onCreateGroup }: AddItemDialogProps) => {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');
  const [groupId, setGroupId] = useState('');
  const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);

  // Helper function to reset form
  const resetForm = useCallback(() => {
    setName('');
    setQuantity(1);
    setUnit('');
    setGroupId('');
  }, []);

  // Pre-populate form when editing
  useEffect(() => {
    if (editItem && open) {
      setName(editItem.name);
      setQuantity(editItem.quantity);
      setUnit(editItem.unit || '');
      setGroupId(editItem.groupId || '');
    } else if (!editItem && open) {
      // Reset form when opening in add mode
      resetForm();
    }
  }, [editItem, open, resetForm]);

  const handleGroupChange = (value: string) => {
    if (value === '__new__') {
      setShowNewGroupDialog(true);
      setGroupId('');
      return;
    }
    setGroupId(value);
  };

  const handleSubmit = () => {
    if (name.trim()) {
      if (editItem && onEdit) {
        onEdit(editItem.id, name, quantity, unit || undefined, groupId || undefined);
      } else {
        onAdd(name, quantity, unit || undefined, groupId || undefined);
      }
      resetForm();
    }
  };

  const handleCreateGroup = async (groupName: string, color?: string, icon?: string) => {
    if (!onCreateGroup) return;
    const newId = await onCreateGroup(groupName, color, icon);
    setGroupId(newId);
    setShowNewGroupDialog(false);
  };

  const isEditMode = !!editItem;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? 'Edit Item' : 'Add Item'}</DialogTitle>
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
            onChange={(e) => handleGroupChange(e.target.value)}
          >
            <MenuItem value="">No Group</MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {group.icon ? <Box sx={{ fontSize: '1.1rem' }}>{group.icon}</Box> : null}
                  <span>{group.name}</span>
                </Box>
              </MenuItem>
            ))}
            <MenuItem value="__new__">
              + Create new group
            </MenuItem>
          </TextField>
        )}
        {groups.length === 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              No groups yet. Create one to organize your item.
            </Typography>
            <Button variant="outlined" onClick={() => setShowNewGroupDialog(true)}>
              Create Group
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!name.trim()}>
          {isEditMode ? 'Save' : 'Add'}
        </Button>
      </DialogActions>

      {onCreateGroup && (
        <CreateGroupDialog
          open={showNewGroupDialog}
          onClose={() => setShowNewGroupDialog(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </Dialog>
  );
};
