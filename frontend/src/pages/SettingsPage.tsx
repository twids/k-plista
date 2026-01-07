import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  CircularProgress,
  Stack,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SettingsIcon from '@mui/icons-material/Settings';
import type { ApiKey, CreateApiKeyResponse, GroceryList } from '../types';
import { settingsService } from '../services/settingsService';
import { groceryListService } from '../services/groceryListService';

export const SettingsPage = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [defaultListId, setDefaultListId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState<CreateApiKeyResponse | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<{ id: string; name: string } | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [apiKeysData, listsData, defaultList] = await Promise.all([
        settingsService.getApiKeys(),
        groceryListService.getAll(),
        settingsService.getDefaultList(),
      ]);
      setApiKeys(apiKeysData);
      setLists(listsData);
      setDefaultListId(defaultList.listId || '');
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSnackbar({ open: true, message: 'Failed to load settings', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      setSnackbar({ open: true, message: 'Please enter a key name', severity: 'error' });
      return;
    }

    try {
      const response = await settingsService.createApiKey({ name: newKeyName });
      setNewApiKey(response);
      setShowKeyDialog(true);
      setOpenDialog(false);
      setNewKeyName('');
      await loadData();
    } catch (error) {
      console.error('Failed to create API key:', error);
      setSnackbar({ open: true, message: 'Failed to create API key', severity: 'error' });
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    try {
      await settingsService.deleteApiKey(id);
      setSnackbar({ open: true, message: 'API key deleted', severity: 'success' });
      await loadData();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      setSnackbar({ open: true, message: 'Failed to delete API key', severity: 'error' });
    } finally {
      setDeleteConfirmOpen(false);
      setKeyToDelete(null);
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setKeyToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (keyToDelete) {
      handleDeleteApiKey(keyToDelete.id);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setKeyToDelete(null);
  };

  const handleDefaultListChange = async (listId: string) => {
    try {
      await settingsService.setDefaultList({ listId: listId || undefined });
      setDefaultListId(listId);
      setSnackbar({ open: true, message: 'Default list updated', severity: 'success' });
    } catch (error) {
      console.error('Failed to update default list:', error);
      setSnackbar({ open: true, message: 'Failed to update default list', severity: 'error' });
    }
  };

  const handleCopyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey.key);
      setSnackbar({ open: true, message: 'API key copied to clipboard', severity: 'success' });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 7 }}>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton color="inherit" onClick={() => navigate('/lists')} edge="start" sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <SettingsIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Settings
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
        {/* Default List Setting */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Default List for Voice Commands
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select which list should receive items added via voice assistants or external APIs.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Default List</InputLabel>
              <Select
                value={defaultListId}
                label="Default List"
                onChange={(e) => handleDefaultListChange(e.target.value)}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {lists.map((list) => (
                  <MenuItem key={list.id} value={list.id}>
                    {list.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                API Keys
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Create Key
              </Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              API keys allow external services (like Home Assistant) to add items to your lists.
            </Typography>

            {apiKeys.length === 0 ? (
              <Box textAlign="center" py={3}>
                <Typography variant="body2" color="text.secondary">
                  No API keys yet. Create one to enable voice assistant integration.
                </Typography>
              </Box>
            ) : (
              <List>
                {apiKeys.map((key) => (
                  <ListItem
                    key={key.id}
                    sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => handleDeleteClick(key.id, key.name)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={key.name}
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="caption">
                            Created: {formatDate(key.createdAt)}
                          </Typography>
                          {key.lastUsedAt && (
                            <Typography variant="caption">
                              Last used: {formatDate(key.lastUsedAt)}
                            </Typography>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Container>

      {/* Create API Key Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create API Key</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Key Name"
            fullWidth
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., Home Assistant, Siri Shortcut"
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Give your key a descriptive name to help you identify it later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateApiKey} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Show New API Key Dialog */}
      <Dialog open={showKeyDialog} onClose={() => setShowKeyDialog(false)}>
        <DialogTitle>API Key Created</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Save this key now! You won't be able to see it again.
          </Alert>
          <TextField
            fullWidth
            label="API Key"
            value={newApiKey?.key || ''}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton onClick={handleCopyApiKey}>
                  <ContentCopyIcon />
                </IconButton>
              ),
            }}
            sx={{ mb: 2 }}
          />
          <Typography variant="body2" color="text.secondary">
            Use this key in the X-API-Key header when making requests to the external API endpoint.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowKeyDialog(false)} variant="contained">Done</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete API Key?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to delete the API key "{keyToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Deleting this key will break any external integrations currently using it.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
