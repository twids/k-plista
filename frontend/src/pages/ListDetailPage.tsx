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
import { useCountdownDelete } from '../hooks/useCountdownDelete';
import { CountdownDeleteSnackbar } from '../components/CountdownDeleteSnackbar';

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
  const [prefillGroupId, setPrefillGroupId] = useState<string | undefined>(undefined);

  const handleDeleteItemAction = async (itemId: string) => {
    if (!listId) return;
    try {
      await groceryItemService.delete(listId, itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const { countdownState, initiateDelete, cancelDelete } = useCountdownDelete(handleDeleteItemAction);

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

  // SignalR subscription
  useEffect(() => {
    if (!listId || !isConnected) return;

    joinList(listId).catch(err => console.error('Failed to join list:', err));

    const handleItemAdded = (item: GroceryItem) => setItems(prev => [...prev, item]);
    const handleItemUpdated = (item: GroceryItem) => setItems(prev => prev.map(i => i.id === item.id ? item : i));
    const handleItemBoughtStatusChanged = (data: ItemBoughtStatusUpdate) => {
      setItems(prev => prev.map(item => item.id === data.id ? { ...item, isBought: data.isBought, boughtAt: data.boughtAt, updatedAt: data.updatedAt } : item));
    };
    const handleItemRemoved = (data: ItemRemovedUpdate) => setItems(prev => prev.filter(item => item.id !== data.id));
    const handleUserJoined = (user: ActiveUser) => setActiveUsers(prev => prev.some(u => u.userId === user.userId) ? prev : [...prev, user]);
    const handleUserLeft = (user: ActiveUser) => setActiveUsers(prev => prev.filter(u => u.userId !== user.userId));
    const handleActiveUsers = (users: ActiveUser[]) => setActiveUsers(users);

    signalRService.onItemAdded(handleItemAdded);
    signalRService.onItemUpdated(handleItemUpdated);
    signalRService.onItemBoughtStatusChanged(handleItemBoughtStatusChanged);
    signalRService.onItemRemoved(handleItemRemoved);
    signalRService.onUserJoined(handleUserJoined);
    signalRService.onUserLeft(handleUserLeft);
    signalRService.onActiveUsers(handleActiveUsers);

    return () => {
      signalRService.offItemAdded(handleItemAdded);
      signalRService.offItemUpdated(handleItemUpdated);
      signalRService.offItemBoughtStatusChanged(handleItemBoughtStatusChanged);
      signalRService.offItemRemoved(handleItemRemoved);
      signalRService.offUserJoined(handleUserJoined);
      signalRService.offUserLeft(handleUserLeft);
      signalRService.offActiveUsers(handleActiveUsers);
      leaveList(listId).catch(err => console.error('Failed to leave list:', err));
      setActiveUsers([]);
    };
  }, [listId, isConnected, joinList, leaveList]);

  const handleToggleBought = async (item: GroceryItem) => {
    if (!listId) return;
    try {
      await groceryItemService.markBought(listId, item.id, !item.isBought);
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    initiateDelete(itemId, `Deleting "${itemName}"`);
  };

  const handleAddItem = async (name: string, quantity: number, unit?: string, groupId?: string) => {
    if (!listId) return;
    try {
      await groceryItemService.create(listId, { name, quantity, unit, groupId });
      setOpenItemDialog(false);
      setPrefillGroupId(undefined);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleCreateGroup = async (name: string, color?: string, icon?: string) => {
    if (!listId) return;
    try {
      const sortOrder = groups.length;
      await itemGroupService.create(listId, { name, icon, color, sortOrder });
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
          <Box key={group.id} sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, px: 1 }}>
              {group.icon ? (
                <Box sx={{ fontSize: '1.5rem' }}>{group.icon}</Box>
              ) : (
                <FolderIcon sx={{ color: group.color || 'primary.main', fontSize: '1.25rem' }} />
              )}
              <Typography variant="subtitle1" fontWeight={500}>{group.name}</Typography>
              <Chip size="small" label={groupItems.length} />
              <IconButton
                size="small"
                aria-label={`add-item-to-group-${group.name}`}
                onClick={() => {
                  setPrefillGroupId(group.id);
                  setOpenItemDialog(true);
                }}
                sx={{ ml: 1 }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Stack>
            <List dense sx={{ py: 0 }}>
              {groupItems.map(item => (
                <ListItem
                  key={item.id}
                  sx={{
                    textDecoration: item.isBought ? 'line-through' : 'none',
                    opacity: item.isBought ? 0.6 : 1,
                    py: 0.5,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
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
                      size="small"
                      onClick={() => handleDeleteItem(item.id, item.name)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Divider />
          </Box>
        ))}
        <Box>
          <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5, px: 1 }}>
            Ungrouped Items
          </Typography>
          <List dense sx={{ py: 0 }}>
            {ungroupedItems.map(item => (
              <ListItem
                key={item.id}
                sx={{
                  textDecoration: item.isBought ? 'line-through' : 'none',
                  opacity: item.isBought ? 0.6 : 1,
                  py: 0.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
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
                    size="small"
                    onClick={() => handleDeleteItem(item.id, item.name)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
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
    <Box sx={{ pb: 7 }}>
      <AppBar position="static">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/lists')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Grocery List
          </Typography>
          {activeUsers.length > 0 && (
            <Box sx={{ mr: 1 }}>
              <AvatarGroup max={4}>
                {activeUsers.map((user) => (
                  <Tooltip key={user.userId} title={user.userName}>
                    <Avatar
                      sx={{
                        width: 30,
                        height: 30,
                        fontSize: '0.75rem',
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

      <Container maxWidth="md" sx={{ mt: 2, px: { xs: 2, sm: 3 } }}>
        {items.length === 0 ? (
          <Box textAlign="center" py={6}>
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
          size="medium"
          onClick={() => setOpenGroupDialog(true)}
        >
          <FolderIcon />
        </Fab>
        <Fab
          color="primary"
          aria-label="add item"
          size="medium"
          onClick={() => setOpenItemDialog(true)}
        >
          <AddIcon />
        </Fab>
      </Stack>

      <AddItemDialog
        open={openItemDialog}
        groups={groups}
        onClose={() => {
          setOpenItemDialog(false);
          setPrefillGroupId(undefined);
        }}
        onAdd={(name, quantity, unit, groupId) => {
          handleAddItem(name, quantity, unit, groupId || prefillGroupId);
        }}
        onCreateGroup={async (name, color, icon) => {
          if (!listId) return '';
          const sortOrder = groups.length;
          const group = await itemGroupService.create(listId, { name, icon, color, sortOrder });
          await loadData();
          return group.id;
        }}
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

      <CountdownDeleteSnackbar
        open={countdownState.isCountingDown}
        message={countdownState.message}
        countdown={countdownState.countdown}
        onCancel={cancelDelete}
      />
    </Box>
  );
};
