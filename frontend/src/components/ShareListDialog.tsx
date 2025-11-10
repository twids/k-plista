import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Switch,
  FormControlLabel,
  Typography,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { listShareService } from '../services/listShareService';
import type { ListShare } from '../types';

interface ShareListDialogProps {
  open: boolean;
  listId: string;
  onClose: () => void;
}

export const ShareListDialog = ({ open, listId, onClose }: ShareListDialogProps) => {
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  const [shares, setShares] = useState<ListShare[]>([]);
  const [loading, setLoading] = useState(false);

  const loadShares = useCallback(async () => {
    try {
      const data = await listShareService.getAll(listId);
      setShares(data);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  }, [listId]);

  useEffect(() => {
    if (open && listId) {
      loadShares();
    }
  }, [open, listId, loadShares]);

  const handleShare = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      await listShareService.create(listId, {
        sharedWithUserEmail: email,
        canEdit,
      });
      setEmail('');
      setCanEdit(true);
      await loadShares();
    } catch (error) {
      console.error('Failed to share list:', error);
      alert('Failed to share list. Make sure the email is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await listShareService.delete(listId, shareId);
      await loadShares();
    } catch (error) {
      console.error('Failed to remove share:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share List</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Email Address"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={canEdit}
              onChange={(e) => setCanEdit(e.target.checked)}
            />
          }
          label="Can edit"
        />

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Shared with:
          </Typography>
          {shares.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Not shared with anyone yet
            </Typography>
          ) : (
            <List>
              {shares.map((share) => (
                <ListItem
                  key={share.id}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveShare(share.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={share.sharedWithUserName}
                    secondary={`${share.sharedWithUserEmail} • ${share.canEdit ? 'Can edit' : 'View only'}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          onClick={handleShare}
          variant="contained"
          disabled={!email.trim() || loading}
        >
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
};
