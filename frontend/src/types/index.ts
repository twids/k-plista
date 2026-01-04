export interface User {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
}

export interface LoginResponse {
  id: string;
  email: string;
  name: string;
  profilePictureUrl?: string;
  token: string;
}


export interface GroceryList {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  boughtItemCount: number;
  isShared: boolean;
}

export interface GroceryItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  isBought: boolean;
  groceryListId: string;
  groupId?: string;
  groupName?: string;
  createdAt: string;
  updatedAt: string;
  boughtAt?: string;
}

export interface ItemGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
  groceryListId: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListShare {
  id: string;
  groceryListId: string;
  groceryListName: string;
  sharedWithUserId: string;
  sharedWithUserEmail: string;
  sharedWithUserName: string;
  canEdit: boolean;
  sharedAt: string;
}

export interface CreateGroceryListDto {
  name: string;
  description?: string;
}

export interface CreateGroceryItemDto {
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  groupId?: string;
}

export interface CreateItemGroupDto {
  name: string;
  icon?: string;
  color?: string;
  sortOrder: number;
}

export interface CreateListShareDto {
  sharedWithUserEmail: string;
  canEdit: boolean;
}

export interface ActiveUser {
  userId: string;
  userName: string;
}

export interface ItemBoughtStatusUpdate {
  id: string;
  isBought: boolean;
  boughtAt?: string;
  updatedAt: string;
}

export interface ItemRemovedUpdate {
  id: string;
}

export interface MagicLink {
  shareToken: string;
  shareUrl: string;
  canEdit: boolean;
}

export interface GenerateMagicLinkDto {
  canEdit: boolean;
}

export interface AcceptShare {
  listId: string;
  listName: string;
  ownerName: string;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyDto {
  name: string;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

export interface DefaultListDto {
  listId?: string;
}
