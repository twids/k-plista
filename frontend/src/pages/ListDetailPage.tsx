import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Fab,
  AppBar,
  Toolbar,
  IconButton,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  ListItemSecondaryAction,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import FolderIcon from '@mui/icons-material/Folder';
import type { GroceryItem, ItemGroup } from '../types';
import { groceryItemService } from '../services/groceryItemService';
import { itemGroupService } from '../services/itemGroupService';
import { AddItemDialog } from '../components/AddItemDialog';
import { ShareListDialog } from '../components/ShareListDialog';
import { CreateGroupDialog } from '../components/CreateGroupDialog';

export const ListDetailPage = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);

  const loadData = useCallback(async () => {
    if (!listId) return;
    
    try {
      const [itemsData, groupsData] = await Promise.all([
        groceryItemService.getAll(listId),
        itemGroupService.getAll(listId),
      ]);
      setItems(itemsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  useEffect(() => {
    if (listId) {
      loadData();
    }
  }, [listId, loadData]);

  const handleToggleBought = async (item: GroceryItem) => {
    if (!listId) return;
    
    try {
      await groceryItemService.markBought(listId, item.id, !item.isBought);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!listId) return;
    
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await groceryItemService.delete(listId, itemId);
        await loadData();
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleAddItem = async (name: string, quantity: number, unit?: string, groupId?: string) => {
    if (!listId) return;
    
    try {
      await groceryItemService.create(listId, { name, quantity, unit, groupId });
      await loadData();
      setOpenItemDialog(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleCreateGroup = async (name: string, color?: string) => {
    if (!listId) return;
    
    try {
      const sortOrder = groups.length;
      await itemGroupService.create(listId, { name, color, sortOrder });
      await loadData();
      setOpenGroupDialog(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const renderItemsByGroup = () => {
    const ungroupedItems = items.filter(item => !item.groupId);
    const groupedItems = groups.map(group => ({
      group,
      items: items.filter(item => item.groupId === group.id),
    }));

    return (
      <>
        {groupedItems.map(({ group, items: groupItems }) => (
          groupItems.length > 0 && (
            <Box key={group.id} sx={{ mb: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <FolderIcon sx={{ color: group.color || 'primary.main' }} />
                <Typography variant="h6">{group.name}</Typography>
                <Chip size="small" label={groupItems.length} />
              </Stack>
              <List>
                {groupItems.map((item) => (
                  <ListItem
                    key={item.id}
                    sx={{
                      textDecoration: item.isBought ? 'line-through' : 'none',
                      opacity: item.isBought ? 0.6 : 1,
                    }}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={item.isBought}
                        onChange={() => handleToggleBought(item)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.name}
                      secondary={`${item.quantity} ${item.unit || 'pcs'}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              <Divider />
            </Box>
          )
        ))}

        {ungroupedItems.length > 0 && (
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Ungrouped Items
            </Typography>
            <List>
              {ungroupedItems.map((item) => (
                <ListItem
                  key={item.id}
                  sx={{
                    textDecoration: item.isBought ? 'line-through' : 'none',
                    opacity: item.isBought ? 0.6 : 1,
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={item.isBought}
                      onChange={() => handleToggleBought(item)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.name}
                    secondary={`${item.quantity} ${item.unit || 'pcs'}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 8 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/lists')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Grocery List
          </Typography>
          <IconButton color="inherit" onClick={() => setOpenShareDialog(true)}>
            <ShareIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {items.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No items yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add your first grocery item!
            </Typography>
          </Box>
        ) : (
          renderItemsByGroup()
        )}
      </Container>

      <Stack
        direction="row"
        spacing={2}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
      >
        <Fab
          color="secondary"
          aria-label="create group"
          onClick={() => setOpenGroupDialog(true)}
        >
          <FolderIcon />
        </Fab>
        <Fab
          color="primary"
          aria-label="add item"
          onClick={() => setOpenItemDialog(true)}
        >
          <AddIcon />
        </Fab>
      </Stack>

      <AddItemDialog
        open={openItemDialog}
        groups={groups}
        onClose={() => setOpenItemDialog(false)}
        onAdd={handleAddItem}
      />

      <ShareListDialog
        open={openShareDialog}
        listId={listId || ''}
        onClose={() => setOpenShareDialog(false)}
      />

      <CreateGroupDialog
        open={openGroupDialog}
        onClose={() => setOpenGroupDialog(false)}
        onCreate={handleCreateGroup}
      />
    </Box>
  );
};
