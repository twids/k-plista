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
  Avatar,
  AvatarGroup,
  Tooltip,
  Paper,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ShareIcon from '@mui/icons-material/Share';
import FolderIcon from '@mui/icons-material/Folder';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { GroceryItem, ItemGroup, ActiveUser, ItemBoughtStatusUpdate, ItemRemovedUpdate } from '../types';
import { groceryItemService } from '../services/groceryItemService';
import { itemGroupService } from '../services/itemGroupService';
import { AddItemDialog } from '../components/AddItemDialog';
import { ShareListDialog } from '../components/ShareListDialog';
import { CreateGroupDialog } from '../components/CreateGroupDialog';
import { useSignalR } from '../hooks/useSignalR';
import signalRService from '../services/signalRService';
import { useCountdownDelete } from '../hooks/useCountdownDelete';
import { useGroupCollapse } from '../hooks/useGroupCollapse';

// Sortable Item Component
interface SortableItemProps {
  item: GroceryItem;
  onToggleBought: (item: GroceryItem) => void;
  onEdit: (item: GroceryItem) => void;
  onDelete: (itemId: string, itemName: string) => void;
  isDeleting: boolean;
  deleteCountdown?: number;
  onCancelDelete?: () => void;
}

const SortableItem = ({ 
  item, 
  onToggleBought, 
  onEdit, 
  onDelete, 
  isDeleting,
  deleteCountdown,
  onCancelDelete 
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        textDecoration: item.isBought ? 'line-through' : 'none',
        opacity: item.isBought ? 0.6 : 1,
        py: 0.5,
        bgcolor: isDeleting ? 'warning.light' : isDragging ? 'action.hover' : 'transparent',
        cursor: isDragging ? 'grabbing' : 'grab',
        '&:hover': {
          bgcolor: isDeleting ? 'warning.light' : 'action.hover',
        },
      }}
    >
      <ListItemIcon
        sx={{ 
          minWidth: 40, 
          cursor: 'grab',
          touchAction: 'none', // Prevent default touch behaviors (scrolling) on drag handle
        }}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${item.name}`}
      >
        <DragIndicatorIcon sx={{ color: 'text.secondary' }} />
      </ListItemIcon>
      <ListItemIcon sx={{ minWidth: 40 }}>
        <Checkbox
          edge="start"
          checked={item.isBought}
          onChange={() => onToggleBought(item)}
          tabIndex={-1}
          disabled={isDeleting}
        />
      </ListItemIcon>
      <ListItemText
        primary={item.name}
        secondary={`${item.quantity} ${item.unit || 'pcs'}`}
      />
      <ListItemSecondaryAction>
        {isDeleting ? (
          <>
            <Chip
              label={`${deleteCountdown}s`}
              size="small"
              color="warning"
              sx={{ mr: 1 }}
            />
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={onCancelDelete}
            >
              Undo
            </Button>
          </>
        ) : (
          <>
            <IconButton
              edge="end"
              aria-label={`edit ${item.name}`}
              size="small"
              onClick={() => onEdit(item)}
              sx={{ mr: 1 }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              edge="end"
              aria-label="delete"
              size="small"
              onClick={() => onDelete(item.id, item.name)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
};

// Droppable Group Container Component
interface DroppableGroupProps {
  id: string;
  children: React.ReactNode;
}

const DroppableGroup = ({ id, children }: DroppableGroupProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        backgroundColor: isOver ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
        transition: 'background-color 0.2s',
      }}
    >
      {children}
    </div>
  );
};

// Group Header Component
interface GroupHeaderProps {
  group: ItemGroup;
  groupItemsCount: number;
  isCollapsed: boolean;
  activeId: string | null;
  onToggleCollapse: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddItem: () => void;
  isDeleting?: boolean;
  deleteCountdown?: number;
  onCancelDelete?: () => void;
}

const GroupHeader = ({
  group,
  groupItemsCount,
  isCollapsed,
  activeId,
  onToggleCollapse,
  onEdit,
  onDelete,
  onAddItem,
  isDeleting,
  deleteCountdown,
  onCancelDelete,
}: GroupHeaderProps) => {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, bgcolor: isDeleting ? 'warning.light' : 'transparent', borderRadius: 1, py: 0.5 }}>
      <IconButton
        size="small"
        aria-label={isCollapsed ? `Expand ${group.name} group` : `Collapse ${group.name} group`}
        onClick={onToggleCollapse}
        sx={{ p: 0.5 }}
        disabled={isDeleting}
      >
        {isCollapsed ? (
          <ChevronRightIcon fontSize="small" />
        ) : (
          <ExpandMoreIcon fontSize="small" />
        )}
      </IconButton>
      {group.icon ? (
        <Box sx={{ fontSize: '1.5rem' }}>{group.icon}</Box>
      ) : (
        <FolderIcon sx={{ color: group.color || 'primary.main', fontSize: '1.25rem' }} />
      )}
      <Typography variant="subtitle1" fontWeight={500}>{group.name}</Typography>
      <Chip size="small" label={groupItemsCount} />
      <Box sx={{ flexGrow: 1 }} />
      {activeId && !isDeleting && (
        <Box
          role="region"
          aria-label={`Drop zone for ${group.name} group`}
          sx={{
            color: 'text.secondary',
            fontStyle: 'italic',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap',
            mr: 1,
          }}
        >
          Drop items here
        </Box>
      )}
      {isDeleting ? (
        <>
          <Chip
            label={`${deleteCountdown}s`}
            size="small"
            color="warning"
            sx={{ mr: 1 }}
          />
          <Button
            size="small"
            variant="contained"
            color="warning"
            onClick={onCancelDelete}
          >
            Undo
          </Button>
        </>
      ) : (
        <>
          <IconButton
            size="small"
            aria-label={`edit-group-${group.name}`}
            onClick={onEdit}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`delete-group-${group.name}`}
            onClick={onDelete}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`add-item-to-group-${group.name}`}
            onClick={onAddItem}
            sx={{ ml: 1 }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </>
      )}
    </Stack>
  );
};

export const ListDetailPage = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const { isConnected, joinList, leaveList } = useSignalR();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItem | undefined>(undefined);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [openGroupDialog, setOpenGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ItemGroup | undefined>(undefined);
  const [prefillGroupId, setPrefillGroupId] = useState<string | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Group collapse state management
  const { isGroupCollapsed, toggleGroupCollapse } = useGroupCollapse(listId);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
        delay: 150, // Small delay helps distinguish drag from scroll on touch devices
        tolerance: 5, // Tolerance to allow minor movements during the delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDeleteItemAction = async (itemId: string) => {
    if (!listId) return;
    try {
      await groceryItemService.delete(listId, itemId);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleDeleteGroupAction = async (groupId: string) => {
    if (!listId) return;
    try {
      await itemGroupService.delete(listId, groupId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const { deletingItems, initiateDelete, cancelDelete } = useCountdownDelete(handleDeleteItemAction);
  const { 
    deletingItems: deletingGroups, 
    initiateDelete: initiateGroupDelete, 
    cancelDelete: cancelGroupDelete 
  } = useCountdownDelete(handleDeleteGroupAction);

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

  const handleEditItem = (item: GroceryItem) => {
    setEditingItem(item);
    setPrefillGroupId(undefined);
    setOpenItemDialog(true);
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

  const handleUpdateItem = async (id: string, name: string, quantity: number, unit?: string, groupId?: string) => {
    if (!listId || !editingItem) return;
    try {
      await groceryItemService.update(listId, id, { 
        name, 
        description: editingItem.description,
        quantity, 
        unit, 
        groupId 
      });
      setOpenItemDialog(false);
      setEditingItem(undefined);
      setPrefillGroupId(undefined);
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleCreateGroup = async (name: string, color?: string, icon?: string) => {
    if (!listId) return;
    try {
      const sortOrder = groups.length;
      await itemGroupService.create(listId, { name, icon, color, sortOrder });
      await loadData();
      setOpenGroupDialog(false);
      setEditingGroup(undefined);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleEditGroup = async (id: string, name: string, color?: string, icon?: string) => {
    if (!listId || !editingGroup) return;
    try {
      await itemGroupService.update(listId, id, { 
        name, 
        icon, 
        color, 
        sortOrder: editingGroup.sortOrder 
      });
      await loadData();
      setOpenGroupDialog(false);
      setEditingGroup(undefined);
    } catch (error) {
      console.error('Failed to update group:', error);
    }
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    initiateGroupDelete(groupId, `Deleting group "${groupName}"`);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !listId) return;

    const activeItemId = active.id as string;
    const overContainerId = over.id as string;

    const activeItem = items.find(item => item.id === activeItemId);
    if (!activeItem) return;

    // Determine the target group
    let targetGroupId: string | undefined = undefined;

    // Check if dropped over a group
    const targetGroup = groups.find(g => g.id === overContainerId);
    if (targetGroup) {
      targetGroupId = targetGroup.id;
    } else if (overContainerId === 'ungrouped') {
      targetGroupId = undefined;
    } else {
      // Dropped over another item - find which group it belongs to
      const overItem = items.find(item => item.id === overContainerId);
      if (overItem) {
        targetGroupId = overItem.groupId;
      }
    }

    // Only update if the group has changed
    if (activeItem.groupId !== targetGroupId) {
      try {
        // Optimistically update the UI
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === activeItemId
              ? { ...item, groupId: targetGroupId }
              : item
          )
        );

        // Update on the server
        await groceryItemService.update(listId, activeItemId, {
          name: activeItem.name,
          description: activeItem.description,
          quantity: activeItem.quantity,
          unit: activeItem.unit,
          groupId: targetGroupId,
        });
      } catch (error) {
        console.error('Failed to move item:', error);
        // Revert on error
        await loadData();
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const renderItemsByGroup = () => {
    const ungroupedItems = items.filter(item => !item.groupId);
    const groupedItems = groups.map(group => ({
      group,
      items: items.filter(item => item.groupId === group.id),
    }));

    return (
      <>
        {groupedItems.map(({ group, items: groupItems }) => {
          const groupItemIds = groupItems.map(item => item.id);
          const deletingGroup = deletingGroups.find(d => d.itemId === group.id);
          
          return (
            <Paper
              key={group.id}
              elevation={1}
              sx={{
                mb: 2,
                p: 1,
                borderRadius: 2,
                border: '2px dashed transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.light',
                },
              }}
            >
              <DroppableGroup id={group.id}>
                {isGroupCollapsed(group.id) ? (
                  <GroupHeader
                    group={group}
                    groupItemsCount={groupItems.length}
                    isCollapsed={true}
                    activeId={activeId}
                    onToggleCollapse={() => toggleGroupCollapse(group.id)}
                    onEdit={() => {
                      setEditingGroup(group);
                      setOpenGroupDialog(true);
                    }}
                    onDelete={() => handleDeleteGroup(group.id, group.name)}
                    onAddItem={() => {
                      setEditingItem(undefined);
                      setPrefillGroupId(group.id);
                      setOpenItemDialog(true);
                    }}
                    isDeleting={!!deletingGroup}
                    deleteCountdown={deletingGroup?.countdown}
                    onCancelDelete={() => cancelGroupDelete(group.id)}
                  />
                ) : (
                  <>
                    <Box sx={{ mb: 0.5 }}>
                      <GroupHeader
                        group={group}
                        groupItemsCount={groupItems.length}
                        isCollapsed={false}
                        activeId={activeId}
                        onToggleCollapse={() => toggleGroupCollapse(group.id)}
                        onEdit={() => {
                          setEditingGroup(group);
                          setOpenGroupDialog(true);
                        }}
                        onDelete={() => handleDeleteGroup(group.id, group.name)}
                        onAddItem={() => {
                          setEditingItem(undefined);
                          setPrefillGroupId(group.id);
                          setOpenItemDialog(true);
                        }}
                        isDeleting={!!deletingGroup}
                        deleteCountdown={deletingGroup?.countdown}
                        onCancelDelete={() => cancelGroupDelete(group.id)}
                      />
                    </Box>
                    <SortableContext items={groupItemIds} strategy={verticalListSortingStrategy}>
                      <List dense sx={{ py: 0 }}>
                        {groupItems.length === 0 ? (
                          <ListItem
                            sx={{
                              py: 2,
                              justifyContent: 'center',
                              color: 'text.secondary',
                              fontStyle: 'italic',
                            }}
                          >
                            <Typography variant="body2">
                              Drop items here or click + to add
                            </Typography>
                          </ListItem>
                        ) : (
                          groupItems.map(item => {
                            const deletingItem = deletingItems.find(d => d.itemId === item.id);
                            return (
                              <SortableItem
                                key={item.id}
                                item={item}
                                onToggleBought={handleToggleBought}
                                onEdit={handleEditItem}
                                onDelete={handleDeleteItem}
                                isDeleting={!!deletingItem}
                                deleteCountdown={deletingItem?.countdown}
                                onCancelDelete={() => cancelDelete(item.id)}
                              />
                            );
                          })
                        )}
                      </List>
                    </SortableContext>
                  </>
                )}
              </DroppableGroup>
            </Paper>
          );
        })}
        <Paper
          elevation={1}
          sx={{
            p: 1,
            borderRadius: 2,
            border: '2px dashed transparent',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: 'primary.light',
            },
          }}
        >
          <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5, px: 1 }}>
            Ungrouped Items
          </Typography>
          <DroppableGroup id="ungrouped">
            <SortableContext items={ungroupedItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <List dense sx={{ py: 0 }}>
                {ungroupedItems.length === 0 ? (
                  <ListItem
                    sx={{
                      py: 2,
                      justifyContent: 'center',
                      color: 'text.secondary',
                      fontStyle: 'italic',
                    }}
                  >
                    <Typography variant="body2">
                      No ungrouped items
                    </Typography>
                  </ListItem>
                ) : (
                  ungroupedItems.map(item => {
                    const deletingItem = deletingItems.find(d => d.itemId === item.id);
                    return (
                      <SortableItem
                        key={item.id}
                        item={item}
                        onToggleBought={handleToggleBought}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                        isDeleting={!!deletingItem}
                        deleteCountdown={deletingItem?.countdown}
                        onCancelDelete={() => cancelDelete(item.id)}
                      />
                    );
                  })
                )}
              </List>
            </SortableContext>
          </DroppableGroup>
        </Paper>
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
            onClick={() => {
              setEditingItem(undefined);
              setPrefillGroupId(undefined);
              setOpenItemDialog(true);
            }}
          >
            <AddIcon />
          </Fab>
        </Stack>

        <AddItemDialog
          open={openItemDialog}
          groups={groups}
          editItem={editingItem}
          prefillGroupId={prefillGroupId}
          onClose={() => {
            setOpenItemDialog(false);
            setEditingItem(undefined);
            setPrefillGroupId(undefined);
          }}
          onAdd={(name, quantity, unit, groupId) => {
            handleAddItem(name, quantity, unit, groupId || prefillGroupId);
          }}
          onEdit={handleUpdateItem}
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
          onClose={() => {
            setOpenGroupDialog(false);
            setEditingGroup(undefined);
          }}
          onCreate={handleCreateGroup}
          onEdit={handleEditGroup}
          editGroup={editingGroup}
        />
      </Box>

      <DragOverlay>
        {activeId ? (
          <Paper
            elevation={8}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 1,
              cursor: 'grabbing',
              opacity: 0.9,
            }}
          >
            <Typography variant="body1">
              {items.find(item => item.id === activeId)?.name}
            </Typography>
          </Paper>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
