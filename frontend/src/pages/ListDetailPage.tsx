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
  Avatar,
  AvatarGroup,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import FolderIcon from '@mui/icons-material/Folder';
import type { GroceryItem, ItemGroup, ActiveUser, ItemBoughtStatusUpdate, ItemRemovedUpdate } from '../types';
import { groceryItemService } from '../services/groceryItemService';
import { itemGroupService } from '../services/itemGroupService';
import { AddItemDialog } from '../components/AddItemDialog';
import { ShareListDialog } from '../components/ShareListDialog';
import { CreateGroupDialog } from '../components/CreateGroupDialog';
import { useSignalR } from '../hooks/useSignalR';
import signalRService from '../services/signalRService';

export const ListDetailPage = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { isConnected, joinList, leaveList } = useSignalR();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
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

  // SignalR connection and event handlers
  useEffect(() => {
    if (!listId || !isConnected) return;

    // Join the list room
    joinList(listId).catch(err => console.error('Failed to join list:', err));

    // Set up event handlers
    const handleItemAdded = (item: GroceryItem) => {
      console.log('Item added:', item);
      setItems(prevItems => [...prevItems, item]);
    };

    const handleItemUpdated = (item: GroceryItem) => {
      console.log('Item updated:', item);
      setItems(prevItems => prevItems.map(i => i.id === item.id ? item : i));
    };

    const handleItemBoughtStatusChanged = (data: ItemBoughtStatusUpdate) => {
      console.log('Item bought status changed:', data);
      setItems(prevItems => prevItems.map(item => 
        item.id === data.id 
          ? { ...item, isBought: data.isBought, boughtAt: data.boughtAt, updatedAt: data.updatedAt }
          : item
      ));
    };

    const handleItemRemoved = (data: ItemRemovedUpdate) => {
      console.log('Item removed:', data);
      setItems(prevItems => prevItems.filter(item => item.id !== data.id));
    };

    const handleUserJoined = (user: ActiveUser) => {
      console.log('User joined:', user);
      setActiveUsers(prev => {
        // Check if user already exists
        if (prev.some(u => u.userId === user.userId)) {
          return prev;
        }
        return [...prev, user];
      });
    };

    const handleUserLeft = (user: ActiveUser) => {
      console.log('User left:', user);
      setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
    };

    const handleActiveUsers = (users: ActiveUser[]) => {
      console.log('Active users:', users);
      setActiveUsers(users);
    };

    signalRService.onItemAdded(handleItemAdded);
    signalRService.onItemUpdated(handleItemUpdated);
    signalRService.onItemBoughtStatusChanged(handleItemBoughtStatusChanged);
    signalRService.onItemRemoved(handleItemRemoved);
    signalRService.onUserJoined(handleUserJoined);
    signalRService.onUserLeft(handleUserLeft);
    signalRService.onActiveUsers(handleActiveUsers);

    return () => {
      // Clean up event handlers
      signalRService.offAllHandlers();
      // Leave the list room
      leaveList(listId).catch(err => console.error('Failed to leave list:', err));
      setActiveUsers([]);
    };
  }, [listId, isConnected, joinList, leaveList]);

  const handleToggleBought = async (item: GroceryItem) => {
    if (!listId) return;
    
    try {
      await groceryItemService.markBought(listId, item.id, !item.isBought);
      // No need to reload - SignalR will update automatically
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!listId) return;
    
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await groceryItemService.delete(listId, itemId);
        // No need to reload - SignalR will update automatically
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    }
  };

  const handleAddItem = async (name: string, quantity: number, unit?: string, groupId?: string) => {
    if (!listId) return;
    
    try {
      await groceryItemService.create(listId, { name, quantity, unit, groupId });
      // No need to reload - SignalR will update automatically
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
          {activeUsers.length > 0 && (
            <Box sx={{ mr: 2 }}>
              <AvatarGroup max={4}>
                {activeUsers.map((user) => (
                  <Tooltip key={user.userId} title={user.userName}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: '0.875rem',
                        bgcolor: 'secondary.main',
                      }}
                    >
                      {user.userName.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </AvatarGroup>
            </Box>
          )}
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
