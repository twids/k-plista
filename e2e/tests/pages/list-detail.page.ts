import { Page, Locator } from '@playwright/test';

export class ListDetailPage {
  readonly page: Page;
  readonly addItemButton: Locator;
  readonly itemNameInput: Locator;
  readonly itemQuantityInput: Locator;
  readonly itemUnitInput: Locator;
  readonly saveItemButton: Locator;
  readonly backButton: Locator;
  readonly shareButton: Locator;
  readonly createGroupButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addItemButton = page.getByRole('button', { name: /add item|new item/i });
    this.itemNameInput = page.getByLabel(/item name|name/i);
    this.itemQuantityInput = page.getByLabel(/quantity/i);
    this.itemUnitInput = page.getByLabel(/unit/i);
    this.saveItemButton = page.getByRole('button', { name: /save|add/i });
    this.backButton = page.getByRole('button', { name: /back/i });
    this.shareButton = page.getByRole('button', { name: /share/i });
    this.createGroupButton = page.getByRole('button', { name: /create group|new group/i });
  }

  async goto(listId: string) {
    await this.page.goto(`/lists/${listId}`);
  }

  async addItem(name: string, quantity?: number, unit?: string) {
    await this.addItemButton.click();
    await this.itemNameInput.fill(name);
    if (quantity) {
      await this.itemQuantityInput.fill(quantity.toString());
    }
    if (unit) {
      await this.itemUnitInput.fill(unit);
    }
    await this.saveItemButton.click();
  }

  async markItemAsBought(itemName: string) {
    const itemCheckbox = this.page.getByRole('checkbox', { name: new RegExp(itemName, 'i') });
    await itemCheckbox.check();
  }

  async markItemAsNotBought(itemName: string) {
    const itemCheckbox = this.page.getByRole('checkbox', { name: new RegExp(itemName, 'i') });
    await itemCheckbox.uncheck();
  }

  async deleteItem(itemName: string) {
    const itemRow = this.page.getByText(itemName).locator('..');
    const deleteButton = itemRow.getByRole('button', { name: /delete/i });
    await deleteButton.click();
    // Confirm deletion if there's a dialog
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  async editItem(oldName: string, newName: string) {
    const itemRow = this.page.getByText(oldName).locator('..');
    const editButton = itemRow.getByRole('button', { name: /edit/i });
    await editButton.click();
    await this.itemNameInput.fill(newName);
    await this.saveItemButton.click();
  }

  async createGroup(groupName: string) {
    await this.createGroupButton.click();
    const groupNameInput = this.page.getByLabel(/group name/i);
    await groupNameInput.fill(groupName);
    const saveButton = this.page.getByRole('button', { name: /save|create/i });
    await saveButton.click();
  }

  async shareList(userEmail: string, canEdit: boolean = false) {
    await this.shareButton.click();
    const emailInput = this.page.getByLabel(/email/i);
    await emailInput.fill(userEmail);
    if (canEdit) {
      const editCheckbox = this.page.getByLabel(/can edit/i);
      await editCheckbox.check();
    }
    const shareConfirmButton = this.page.getByRole('button', { name: /share|send/i });
    await shareConfirmButton.click();
  }

  async goBack() {
    await this.backButton.click();
  }

  async getItemByName(itemName: string): Promise<Locator> {
    return this.page.getByText(itemName);
  }
}
