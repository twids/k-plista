import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Fab,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import EditIcon from '@mui/icons-material/Edit';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LogoutIcon from '@mui/icons-material/Logout';
import type { GroceryList } from '../types';
import { groceryListService } from '../services/groceryListService';
import { useAuth } from '../hooks/useAuth';
import { CreateListDialog } from '../components/CreateListDialog';
import { EditListDialog } from '../components/EditListDialog';

export const ListsPage = () => {
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingList, setEditingList] = useState<GroceryList | null>(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      const data = await groceryListService.getAll();
      setLists(data);
    } catch (error) {
      console.error('Failed to load lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = async (name: string, description?: string) => {
    try {
      await groceryListService.create({ name, description });
      await loadLists();
      setOpenDialog(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };

  const handleEditList = async (id: string, name: string, description?: string) => {
    try {
      await groceryListService.update(id, { name, description });
      await loadLists();
      setEditingList(null);
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (confirm('Are you sure you want to delete this list?')) {
      try {
        await groceryListService.delete(id);
        await loadLists();
      } catch (error) {
        console.error('Failed to delete list:', error);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
          <ShoppingCartIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Koplista
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
          My Grocery Lists
        </Typography>

        {lists.length === 0 ? (
          <Box textAlign="center" py={6}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No lists yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first grocery list to get started!
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {lists.map((list) => (
              <Card key={list.id} elevation={1}>
                <CardContent sx={{ pb: 1, '&:last-child': { pb: 1.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom sx={{ mb: 0.5 }}>
                        {list.name}
                      </Typography>
                      {list.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {list.description}
                        </Typography>
                      )}
                      <Box mt={1}>
                        <Chip
                          size="small"
                          label={`${list.boughtItemCount}/${list.itemCount} bought`}
                          color={list.itemCount === 0 ? 'default' : 
                                list.boughtItemCount === list.itemCount ? 'success' : 'primary'}
                          sx={{ mr: 1 }}
                        />
                        {list.isShared && (
                          <Chip size="small" icon={<ShareIcon />} label="Shared" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ pt: 0, pb: 1 }}>
                  <Button size="small" onClick={() => navigate(`/lists/${list.id}`)}>
                    Open
                  </Button>
                  <IconButton size="small" onClick={() => setEditingList(list)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteList(list.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}
      </Container>

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenDialog(true)}
      >
        <AddIcon />
      </Fab>

      <CreateListDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onCreate={handleCreateList}
      />

      <EditListDialog
        open={editingList !== null}
        list={editingList}
        onClose={() => setEditingList(null)}
        onUpdate={handleEditList}
      />
    </Box>
  );
};
