# Master Data App (React Native CLI, JSX)

A React Native **CLI** app (`react-native: 0.87.1`, plain **JSX** — no TypeScript) for the
Odoo-style Master Data API (NestJS backend). Fully functional **Inventory** module; **Sales**,
**Purchase**, and **Accounting** are "Coming Soon" placeholders ready for future build-out.

## What works today — Inventory
All 13 master-data modules are fully wired to the API with list (search + pagination +
pull-to-refresh + long-press delete) and create/edit forms:

Products · Product Categories · Units of Measure · UoM Categories · Warehouses ·
Locations · Customers · Vendors · Taxes · Payment Terms · Pricelists · Users · Roles

Every module runs through **one generic, config-driven CRUD engine** — see `src/config/entities.js`.
Adding a new field or a whole new module is a config change, not new screens.

## What's "Coming Soon"
Sales, Purchase, and Accounting show a branded placeholder screen (`ComingSoonScreen`) reachable
from the Dashboard and the side menu, so the navigation shape for those modules is already in
place for when their APIs/screens are built.

## Stack
- React Native **0.87.1**, plain **JSX** (no TS)
- `@react-navigation/native` + `native-stack` (Drawer avoided — see note below)
- A custom lightweight slide-out side menu (`src/navigation/SideMenu.jsx`) built on RN's core
  `Animated` API, used instead of `@react-navigation/drawer`
- `axios` with a JWT auth interceptor + automatic logout on 401
- `@react-native-async-storage/async-storage` for session persistence

> **Why a custom side menu instead of `@react-navigation/drawer`?** That package requires
> `react-native-reanimated`, which — at the time this was built — doesn't yet publish a build
> compatible with RN 0.87.1 (it's a very new release). Rather than pin to an unstable
> combination, the side menu was hand-rolled with RN's built-in `Animated` API. Zero extra
> native linking required. Swap it for the Drawer navigator later once Reanimated catches up,
> if you prefer.

## Project layout
```
App.jsx                      Root component (providers, status bar)
index.js                     RN entry point
src/
  api/
    client.js                 Axios instance, JWT interceptor, 401 handling
    crud.js                   Generic CRUD factory (list/get/create/update/remove)
    auth.js                   login()
  config/
    config.js                 API_BASE_URL, storage keys
    entities.js                The registry driving every Inventory screen - field
                               definitions, types, relations, per module
  context/
    AuthContext.jsx           Session state, login/logout, persisted via AsyncStorage
  navigation/
    RootNavigator.jsx         Auth stack vs. main app switch
    MainStackNavigator.jsx    Dashboard -> InventoryMenu -> EntityList -> EntityForm, ComingSoon
    SideMenu.jsx               Custom Animated slide-out drawer
    SideMenuContent.jsx        Menu items + logout
    navigationRef.js           Imperative navigate() used by the side menu
  screens/
    auth/LoginScreen.jsx
    dashboard/DashboardScreen.jsx
    inventory/
      InventoryMenuScreen.jsx  Hub listing all 13 modules
      EntityListScreen.jsx     Generic list screen for ANY entity
      EntityFormScreen.jsx     Generic create/edit form for ANY entity
    common/ComingSoonScreen.jsx
  components/                 Button, ScreenContainer, SearchBar, ListRow, ModuleCard,
                               FormField (dynamic field renderer), ArrayField (repeatable
                               groups - payment term lines, pricelist rules), ChipsField,
                               PickerModal (searchable picker for selects & relations),
                               Feedback (loading/empty/error states)
  utils/formTransforms.js     Record <-> form-state conversion (relations, arrays, payloads)
  theme/theme.js               Colors, spacing, typography tokens
```

## Getting started

```bash
npm install

# iOS only
cd ios && pod install && cd ..
```

### Point the app at your API
Edit `src/config/config.js` if needed. By default it targets:
- Android emulator -> `http://10.0.2.2:3000/api/v1` (maps to your host machine's localhost)
- iOS simulator -> `http://localhost:3000/api/v1`
- Physical device -> change `LOCAL_HOST` to your machine's LAN IP, e.g. `192.168.1.50`

Make sure the **Master Data API** (NestJS backend) is running and seeded
(`npm run seed` in that project) before logging in.

### Run
```bash
npx react-native start        # Metro bundler
npx react-native run-android  # in a second terminal
npx react-native run-ios      # or this, on macOS
```

Login with the seeded admin: `admin@example.com` / `Admin@123`.

## How the generic CRUD engine works
1. `src/config/entities.js` declares, per module, its REST endpoint, the field(s) to show in
   list rows, and the full form field list (`text`, `number`, `boolean`, `select`, `date`,
   `relation`, `multiselect-relation`, `text-array`, or `array` for repeatable groups like
   Payment Term installments or Pricelist rules).
2. `EntityListScreen` and `EntityFormScreen` read that config and render themselves - no
   per-module screen code.
3. `FormField` dispatches to the right input for each field type; `PickerModal` live-searches
   related entities (e.g. picking a Product Category while editing a Product) via the same
   generic CRUD API.
4. `utils/formTransforms.js` converts between the API's nested-relation JSON shape (e.g. a
   Product's `category` object) and the flat `{id, label}` shape the form works with, and
   back into a clean create/update payload on submit.

To add a brand-new master-data module later: add one entry to `ENTITIES` in `entities.js` and
one line to `INVENTORY_MENU` - the list, form, search, and validation all come for free.

## Verified
- `npx eslint App.jsx index.js src` -> 0 errors (a few stylistic warnings only)
- `npx react-native bundle --platform android --dev false ...` -> **bundles successfully**,
  confirming every import/require in the app resolves and the whole JS graph is valid.
# vender_mobileapp
