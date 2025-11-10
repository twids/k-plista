import { Page, Locator } from '@playwright/test';

export class ListsPage {
  readonly page: Page;
  readonly createListButton: Locator;
  readonly listNameInput: Locator;
  readonly listDescriptionInput: Locator;
  readonly saveListButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createListButton = page.getByRole('button', { name: /create list|new list|add list/i });
    this.listNameInput = page.getByLabel(/list name|name/i);
    this.listDescriptionInput = page.getByLabel(/description/i);
    this.saveListButton = page.getByRole('button', { name: /save|create/i });
    this.searchInput = page.getByPlaceholder(/search/i);
  }

  async goto() {
    await this.page.goto('/lists');
  }

  async createList(name: string, description?: string) {
    await this.createListButton.click();
    await this.listNameInput.fill(name);
    if (description) {
      await this.listDescriptionInput.fill(description);
    }
    await this.saveListButton.click();
  }

  async clickList(listName: string) {
    await this.page.getByText(listName).click();
  }

  async getListByName(listName: string): Promise<Locator> {
    return this.page.getByText(listName);
  }

  async deleteList(listName: string) {
    const listCard = this.page.getByText(listName).locator('..');
    const deleteButton = listCard.getByRole('button', { name: /delete/i });
    await deleteButton.click();
    // Confirm deletion if there's a dialog
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
  }

  async searchLists(query: string) {
    await this.searchInput.fill(query);
  }
}
