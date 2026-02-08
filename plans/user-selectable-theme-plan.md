## Plan: User-Selectable Theme Feature

Add theme selection functionality allowing users to choose between different visual themes (Default, Modern, Dark) with preferences persisted per user in the database and applied across the entire frontend application. Includes comprehensive CSS consistency audit to ensure all components follow theme styling patterns.

**Phases: 8**

---

## Phase 1: Backend - Add Theme Property and Migration

**Objective:** Extend the User model with a Theme property and create a database migration to store user theme preferences

**Files/Functions to Modify/Create:**
- [backend/KPlista.Api/Models/User.cs](../backend/KPlista.Api/Models/User.cs) - Add `Theme` property
- [backend/KPlista.Api/Data/KPlistaDbContext.cs](../backend/KPlista.Api/Data/KPlistaDbContext.cs) - Add Theme property configuration with max length constraint
- New migration file via `dotnet ef migrations add AddThemeToUser`

**Tests to Write:**
- Unit test: Verify User model has Theme property with correct nullable string type
- Migration test: Verify migration adds Theme column as nullable varchar(50)
- DbContext test: Verify Theme property has MaxLength(50) constraint configured

**Steps:**
1. Write test asserting User model has nullable Theme property
2. Run test (should fail - property doesn't exist)
3. Add `public string? Theme { get; set; }` to User.cs
4. Write test for DbContext configuration of Theme property
5. Run test (should fail - configuration missing)
6. Add Theme configuration in OnModelCreating: `.Property(e => e.Theme).HasMaxLength(50)`
7. Write test verifying migration structure
8. Create migration: `dotnet ef migrations add AddThemeToUser`
9. Run all tests (should pass)
10. Apply migration: `dotnet ef database update`

---

## Phase 2: Backend - Theme Settings Endpoints

**Objective:** Create REST API endpoints for getting and setting user theme preferences, and include theme in authentication response

**Files/Functions to Modify/Create:**
- [backend/KPlista.Api/DTOs/SettingsDtos.cs](../backend/KPlista.Api/DTOs/SettingsDtos.cs) - Add `ThemeDto` record
- [backend/KPlista.Api/DTOs/UserDto.cs](../backend/KPlista.Api/DTOs/UserDto.cs) - Add Theme parameter
- [backend/KPlista.Api/Controllers/SettingsController.cs](../backend/KPlista.Api/Controllers/SettingsController.cs) - Add GetTheme and SetTheme endpoints
- [backend/KPlista.Api/Controllers/AuthController.cs](../backend/KPlista.Api/Controllers/AuthController.cs) - Update GetCurrentUser to include Theme

**Tests to Write:**
- DTO test: Verify ThemeDto structure with nullable string
- Controller test: GET /api/settings/theme returns current user's theme
- Controller test: PUT /api/settings/theme updates user theme and UpdatedAt
- Auth test: GetCurrentUser returns UserDto with theme property

**Steps:**
1. Write test for ThemeDto structure
2. Run test (should fail)
3. Add `public record ThemeDto(string? Theme);` to SettingsDtos.cs
4. Write test for GET /api/settings/theme endpoint
5. Run test (should fail - endpoint doesn't exist)
6. Implement GetTheme method in SettingsController
7. Write test for PUT /api/settings/theme endpoint
8. Run test (should fail)
9. Implement SetTheme method updating user.Theme and user.UpdatedAt
10. Write test for UserDto including theme
11. Update UserDto with Theme parameter
12. Update AuthController GetCurrentUser to include theme in response
13. Run all tests (should pass)

---

## Phase 3: Frontend - Theme Constants and Types

**Objective:** Define all available themes (Default, Modern, Dark) and update TypeScript interfaces to support theme selection

**Files/Functions to Modify/Create:**
- [frontend/src/constants/themes.ts](../frontend/src/constants/themes.ts) - New file with theme definitions and factory
- [frontend/src/types/index.ts](../frontend/src/types/index.ts) - Update User interface, add ThemeDto interface
- [frontend/darkTheme.js](../frontend/darkTheme.js) - Rename oskollenTheme to modernTheme, migrate to themes.ts

**Tests to Write:**
- Type test: Verify User interface includes optional theme property
- Type test: Verify ThemeDto interface matches backend
- Theme test: Verify themes.ts exports valid MUI theme objects for 'default', 'modern', 'dark'
- Theme test: Verify getTheme function returns default theme for unknown values

**Steps:**
1. Write test asserting User interface has theme property
2. Run test (should fail)
3. Add `theme?: string;` to User interface in types/index.ts
4. Add `export interface ThemeDto { theme?: string; }` to types/index.ts
5. Write test for themes constant structure with all three themes
6. Run test (should fail)
7. Create constants/themes.ts with THEMES object containing 'default', 'modern', 'dark' theme definitions
8. Rename oskollenTheme to modernTheme and migrate from darkTheme.js to themes.ts
9. Add dark theme variant with `mode: 'dark'` palette
10. Add getTheme(themeName) helper function with fallback to 'default'
11. Add THEME_OPTIONS constant for UI dropdowns with labels
12. Run all tests (should pass)

---

## Phase 4: Frontend - Theme Service Methods

**Objective:** Add API service methods for fetching and updating user theme preferences

**Files/Functions to Modify/Create:**
- [frontend/src/services/settingsService.ts](../frontend/src/services/settingsService.ts) - Add getTheme and setTheme methods

**Tests to Write:**
- Service test: Verify getTheme calls GET /settings/theme with correct types
- Service test: Verify setTheme calls PUT /settings/theme with ThemeDto payload

**Steps:**
1. Write test for settingsService.getTheme method
2. Run test (should fail - method doesn't exist)
3. Add `getTheme: () => api.get<ThemeDto>('/settings/theme')` to settingsService
4. Write test for settingsService.setTheme method
5. Run test (should fail)
6. Add `setTheme: (data: ThemeDto) => api.put<void>('/settings/theme', data)` to settingsService
7. Run all tests (should pass)

---

## Phase 5: Frontend - Theme Context Provider

**Objective:** Create a React context to manage theme state and provide theme switching functionality throughout the app

**Files/Functions to Modify/Create:**
- [frontend/src/contexts/ThemeContext.tsx](../frontend/src/contexts/ThemeContext.tsx) - New context provider
- [frontend/src/hooks/useTheme.ts](../frontend/src/hooks/useTheme.ts) - New hook for accessing theme context

**Tests to Write:**
- Context test: ThemeProvider provides currentTheme and setTheme function
- Context test: Theme initializes from authenticated user's theme property
- Context test: setTheme persists to backend via settingsService
- Context test: Theme defaults to 'default' when user has no preference
- Hook test: useTheme returns context values correctly

**Steps:**
1. Write test for ThemeContext structure and types
2. Run test (should fail)
3. Create ThemeContext.tsx with ThemeContextType interface
4. Write test for ThemeProvider initialization
5. Run test (should fail)
6. Implement ThemeProvider with useState for theme
7. Add useEffect to load theme from AuthContext user object
8. Write test for setTheme function
9. Run test (should fail)
10. Implement setTheme calling settingsService.setTheme and updating local state
11. Write test for useTheme hook
12. Create hooks/useTheme.ts with useContext wrapper
13. Run all tests (should pass)

---

## Phase 6: Frontend - Apply Dynamic Theme in App

**Objective:** Integrate ThemeProvider with App component to dynamically apply user-selected themes

**Files/Functions to Modify/Create:**
- [frontend/src/App.tsx](../frontend/src/App.tsx) - Wrap with ThemeContext, use dynamic theme
- Update component tree structure to include ThemeProvider

**Tests to Write:**
- App test: Verify ThemeProvider wraps app and receives MUI theme
- App test: Theme changes when useTheme().setTheme is called
- App test: Loading state prevents theme flash before user loads

**Steps:**
1. Write test for App using dynamic theme from context
2. Run test (should fail - still using static theme)
3. Remove static theme creation from App.tsx
4. Import ThemeProvider from contexts and useTheme hook
5. Wrap Router with custom ThemeProvider
6. Write test for theme switching
7. Run test (should fail)
8. Create useMemo for theme object using getTheme(currentTheme)
9. Pass dynamic theme to MUI ThemeProvider
10. Add loading guard to prevent flash of wrong theme
11. Run all tests (should pass)

---

## Phase 7: Frontend - Settings UI for Theme Selection

**Objective:** Add theme selector dropdown to Settings page allowing users to change their theme preference

**Files/Functions to Modify/Create:**
- [frontend/src/pages/SettingsPage.tsx](../frontend/src/pages/SettingsPage.tsx) - Add theme selection Card
- Add FormControl with Select for theme options (Default, Modern, Dark)

**Tests to Write:**
- Component test: SettingsPage renders theme selector Card
- Component test: Select displays all available themes from THEME_OPTIONS
- Component test: Selecting theme calls useTheme().setTheme
- Component test: Success snackbar shows after theme change
- Component test: Error snackbar shows on API failure

**Steps:**
1. Write test for theme selector Card rendering
2. Run test (should fail - Card doesn't exist)
3. Add new Card section to SettingsPage with "Theme Preference" title
4. Write test for Select component with theme options
5. Run test (should fail)
6. Add FormControl + InputLabel + Select components
7. Map THEME_OPTIONS to MenuItem components
8. Write test for theme change handler
9. Run test (should fail)
10. Implement handleThemeChange using useTheme().setTheme
11. Add snackbar feedback for success/error
12. Run all tests (should pass)

---

## Phase 8: Frontend - Comprehensive CSS Consistency Audit

**Objective:** Systematically audit every component and page for CSS inconsistencies, missing theme styles, and ensure proper theme styling application across entire application

**Files/Functions to Modify/Create:**
- All components in [frontend/src/components/](../frontend/src/components/)
- All pages in [frontend/src/pages/](../frontend/src/pages/)
- [frontend/src/index.css](../frontend/src/index.css) - Global theme consistency
- [frontend/src/App.css](../frontend/src/App.css) - App-level styles
- Any component-specific CSS modules or styled components

**Tests to Write:**
- Visual regression test: Verify all MUI components respect theme borderRadius
- Component test: All Buttons use theme spacing, colors, and typography
- Component test: All Cards use theme shadows, borders, and spacing
- Component test: All Typography uses theme font families and weights
- Component test: All form controls (TextField, Select, Input) use theme styling
- Component test: All Dialogs and Modals use theme styling
- Component test: All navigation elements use theme colors
- Integration test: Theme switching applies to all components instantly

**Steps:**
1. **Create component inventory**: List all component files and page files to audit
2. **Write tests for Button components**: Verify theme consistency
3. **Audit Button usages**: Check all files for hardcoded colors, sizes, or styles
4. **Fix Button inconsistencies**: Remove inline styles, use theme props
5. **Write tests for Card components**: Verify theme shadows and borders
6. **Audit Card usages**: Check for hardcoded borderRadius or boxShadow values
7. **Fix Card inconsistencies**: Ensure all Cards inherit from theme
8. **Write tests for Typography**: Verify font families, weights, and colors
9. **Audit Typography usages**: Check for hardcoded font styles or text colors
10. **Fix Typography inconsistencies**: Use theme.typography variants
11. **Write tests for form controls**: TextField, Select, Checkbox, Radio, Switch
12. **Audit all form components**: Check input borderRadius, colors, spacing
13. **Fix form inconsistencies**: Apply theme.components overrides
14. **Write tests for Dialog/Modal components**: Verify theme styling
15. **Audit Dialog/Modal usages**: Check paper styles, backdrop colors
16. **Fix Dialog/Modal inconsistencies**: Use theme values
17. **Write tests for navigation**: AppBar, Drawer, List items
18. **Audit navigation components**: Check colors, spacing, typography
19. **Fix navigation inconsistencies**: Theme-aware navigation
20. **Write tests for icons and icon buttons**: Size and color consistency
21. **Audit icon usages**: Check for hardcoded icon colors or sizes
22. **Fix icon inconsistencies**: Use theme.palette colors
23. **Audit index.css**: Check for global style conflicts with theme
24. **Fix index.css**: Remove conflicting styles, use theme CSS variables if needed
25. **Audit App.css**: Check for app-level overrides
26. **Fix App.css**: Ensure compatibility with all themes
27. **Audit custom components**: Non-MUI components like UpdateBanner, custom dialogs
28. **Fix custom component styles**: Apply theme styling consistently
29. **Write integration tests**: Full theme switching across all pages
30. **Run all tests**: Verify comprehensive theme consistency
31. **Manual visual testing**: Test all three themes on every page
32. **Document missing elements**: Create list of any elements that need theme styling
33. **Fix all missing elements**: Add theme styling to any components lacking proper CSS

**Component Audit Checklist:**
- [ ] All Button variants (contained, outlined, text)
- [ ] All Card components and CardContent styling
- [ ] All Typography variants (h1-h6, body1-2, caption)
- [ ] All TextField and Input components
- [ ] All Select dropdowns and Menus
- [ ] All Checkbox, Radio, Switch components
- [ ] All Dialog and Modal components
- [ ] All AppBar and Drawer navigation
- [ ] All List and ListItem components
- [ ] All IconButton components
- [ ] All Chip components
- [ ] All Alert and Snackbar components
- [ ] All Tabs and Tab panels
- [ ] All custom styled components
- [ ] Global CSS in index.css and App.css
