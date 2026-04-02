Adds groups — collections of spaces that each launch onto their own virtual desktop, enabling reusable full Windows desktop setups.

## Backend (`src-tauri/src/lib.rs`)
- New `SpaceGroup` struct: `id`, `name`, `description`, `color`, `spaceIds[]`, timestamps
- `GroupsState` — mirrors `SpacesState`, persists to a separate `groups.json`
- Commands: `get_groups`, `save_group`, `delete_group`, `launch_group`
- `launch_group` iterates each space in the group, calling `create_virtual_desktop_with_name` per space so each space gets its own desktop

## Frontend
- **`src/types.ts`** — `SpaceGroup` interface
- **`GroupForm`** — name/description/color + selectable table list of spaces
- **`GroupDetail`** — shows member spaces, "Launch Group" button, delete confirmation
- **`SpacesSidebar`** — new Groups section with color dots, space-count badge, "New Group" button; new props: `groups`, `selectedGroupId`, `onSelectGroup`, `onNewGroup`
- **`App.tsx`** — group state, CRUD handlers, `launch_group` invocation; selecting a group clears the selected space and vice versa

## Virtual Desktop Naming
- `create_virtual_desktop_with_name()` — creates a virtual desktop and names it using the winvd API
- Virtual desktops are now named after the space (e.g., "Dev Workspace") instead of generic "Desktop x"

## UI Fixes
- GroupForm Color label has proper padding to separate from color picker
- GroupForm Spaces section uses a table view instead of checkbox list
- Color icon appears before space name in the table
- Selection count shown below the table

## Tests
- 3 new `SpaceGroup` type tests in `types.test.ts`
- 7 new tests in `SpacesSidebar.test.tsx` covering group rendering, selection, and button callbacks