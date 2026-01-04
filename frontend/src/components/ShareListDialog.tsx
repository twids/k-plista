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
  Divider,
  InputAdornment,
  Snackbar,
  Alert,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import { listShareService } from '../services/listShareService';
import { groceryListService } from '../services/groceryListService';
import type { ListShare } from '../types';
import { useCountdownDelete } from '../hooks/useCountdownDelete';

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
  const [magicLink, setMagicLink] = useState('');
  const [magicLinkCanEdit, setMagicLinkCanEdit] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveShareAction = async (shareId: string) => {
    try {
      await listShareService.delete(listId, shareId);
      await loadShares();
    } catch (error) {
      console.error('Failed to remove share:', error);
    }
  };

  const { deletingItems, initiateDelete, cancelDelete } = useCountdownDelete(handleRemoveShareAction);

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
      setError('Failed to share list. Make sure the email is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string, userName: string) => {
    initiateDelete(shareId, `Removing access for "${userName}"`);
  };

  const handleGenerateMagicLink = async () => {
    setLoading(true);
    try {
      const data = await groceryListService.generateMagicLink(listId, { canEdit: magicLinkCanEdit });
      setMagicLink(data.shareUrl);
    } catch (error) {
      console.error('Failed to generate magic link:', error);
      setError('Failed to generate magic link.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyMagicLink = async () => {
    try {
      await navigator.clipboard.writeText(magicLink);
      setShowCopied(true);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setError('Failed to copy link to clipboard. Please copy it manually.');
    }
  };

  const handleCloseCopiedSnackbar = () => {
    setShowCopied(false);
  };

  const handleCloseErrorSnackbar = () => {
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share List</DialogTitle>
      <DialogContent>
        {/* Magic Link Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Share via Magic Link
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generate a link that anyone can use to access this list
          </Typography>
          {!magicLink ? (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={magicLinkCanEdit}
                    onChange={(e) => setMagicLinkCanEdit(e.target.checked)}
                  />
                }
                label="Allow edit access"
                sx={{ mb: 2 }}
              />
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={handleGenerateMagicLink}
                disabled={loading}
                fullWidth
              >
                Generate Magic Link
              </Button>
            </>
          ) : (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Permission: {magicLinkCanEdit ? 'Can edit' : 'View only'}
              </Typography>
              <TextField
                fullWidth
                value={magicLink}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleCopyMagicLink} edge="end">
                        <ContentCopyIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Email Sharing Section */}
        <Typography variant="subtitle2" gutterBottom>
          Share with specific users
        </Typography>
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
              {shares.map((share) => {
                const deletingShare = deletingItems.find(d => d.itemId === share.id);
                const isDeleting = !!deletingShare;
                
                return (
                  <ListItem
                    key={share.id}
                    sx={{ bgcolor: isDeleting ? 'warning.light' : 'transparent' }}
                    secondaryAction={
                      isDeleting ? (
                        <>
                          <Chip
                            label={`${deletingShare?.countdown ?? 0}s`}
                            size="small"
                            color="warning"
                            sx={{ mr: 1 }}
                            aria-label={`Deletion countdown: ${deletingShare?.countdown ?? 0} seconds`}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            color="warning"
                            onClick={() => cancelDelete(share.id)}
                            aria-label={`Cancel share removal for ${share.sharedWithUserName}`}
                          >
                            Undo
                          </Button>
                        </>
                      ) : (
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleRemoveShare(share.id, share.sharedWithUserName)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )
                    }
                  >
                    <ListItemText
                      primary={share.sharedWithUserName}
                      secondary={`${share.sharedWithUserEmail} • ${share.canEdit ? 'Can edit' : 'View only'}`}
                    />
                  </ListItem>
                );
              })}
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

      <Snackbar
        open={showCopied}
        autoHideDuration={3000}
        onClose={handleCloseCopiedSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseCopiedSnackbar} severity="success" sx={{ width: '100%' }}>
          Link copied to clipboard!
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseErrorSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseErrorSnackbar} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};
