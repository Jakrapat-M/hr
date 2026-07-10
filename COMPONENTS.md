# Reusable Components Index

This document lists the reusable UI components available in the Humi design system.

### Atoms
- **Avatar** (`src/frontend/src/components/humi/atoms/Avatar.tsx`)
  - **Props:** `src`, `alt`, `fallback`, `size`
  - **Description:** Displays a user profile image or initials fallback.
- **Button** (`src/frontend/src/components/humi/atoms/Button.tsx`)
  - **Props:** `variant`, `size`, `asChild`, `className`
  - **Description:** Primary interactive button component for user actions.
- **Capability** (`src/frontend/src/components/humi/atoms/Capability.tsx`)
  - **Props:** `name`, `status`
  - **Description:** Displays a specific user capability, tag, or role.
- **Textarea** (`src/frontend/src/components/humi/atoms/Textarea.tsx`)
  - **Props:** `rows`, `placeholder`, `className`
  - **Description:** Multi-line text input field.
- **Toggle** (`src/frontend/src/components/humi/atoms/Toggle.tsx`)
  - **Props:** `checked`, `onChange`
  - **Description:** A switch component for toggling binary states.

### Molecules
- **Card** (`src/frontend/src/components/humi/molecules/Card.tsx`)
  - **Props:** `className`, `children`
  - **Description:** A flexible container component with optional structural elements like titles and eyebrows.
- **DemoValuesDisclaimer** (`src/frontend/src/components/humi/molecules/DemoValuesDisclaimer.tsx`)
  - **Props:** None
  - **Description:** A banner to indicate that the current view is using mock or demo data.
- **EmptyState** (`src/frontend/src/components/humi/molecules/EmptyState.tsx`)
  - **Props:** `title`, `description`, `icon`, `action`
  - **Description:** A placeholder state shown when no data is available to display.
- **FormField** (`src/frontend/src/components/humi/molecules/FormField.tsx`)
  - **Props:** `label`, `error`, `helperText`, `children`
  - **Description:** Wrapper component for input elements that provides accessible labels, error messages, and helper text.
- **FormInput** (`src/frontend/src/components/humi/molecules/FormField.tsx`)
  - **Props:** `type`, `name`, `placeholder`, `className`
  - **Description:** A standard text input designed to integrate cleanly within a FormField.
- **Nav** (`src/frontend/src/components/humi/molecules/Nav.tsx`)
  - **Props:** `sections`, `className`
  - **Description:** A navigation menu component that renders groups of links.
- **QuickActionsTile** (`src/frontend/src/components/humi/molecules/QuickActionsTile.tsx`)
  - **Props:** `actions`, `className`
  - **Description:** A tile displaying a grid of quick action shortcuts for common user flows.

### Organisms
- **CancelRequestModal** (`src/frontend/src/components/humi/organisms/CancelRequestModal.tsx`)
  - **Props:** `open`, `onClose`, `onConfirm`, `fields`
  - **Description:** A specific modal dialog for confirming the cancellation of a request.
- **ClaimStepper** (`src/frontend/src/components/humi/organisms/ClaimStepper.tsx`)
  - **Props:** `steps`, `activeIndex`
  - **Description:** A progress stepper indicating the current step in multi-step claim processes.
- **DataTable** (`src/frontend/src/components/humi/organisms/DataTable.tsx`)
  - **Props:** `columns`, `data`, `loading`, `onSort`
  - **Description:** A robust table component with sorting, pagination, and loading state capabilities.
- **LeaveRangeCalendar** (`src/frontend/src/components/humi/organisms/LeaveRangeCalendar.tsx`)
  - **Props:** `from`, `to`, `onChange`, `holidays`
  - **Description:** An interactive calendar used for selecting date ranges for leave requests.
- **Modal** (`src/frontend/src/components/humi/organisms/Modal.tsx`)
  - **Props:** `open`, `onClose`, `title`, `widthClass`, `children`
  - **Description:** A dialog window used for focused tasks, confirmations, or alerts.
- **ModuleContextStrip** (`src/frontend/src/components/humi/organisms/ModuleContextStrip.tsx`)
  - **Props:** `module`, `persona`, `quickStats`
  - **Description:** A contextual header strip displaying module info, persona, and key stats.
- **NotificationBell** (`src/frontend/src/components/humi/organisms/NotificationBell.tsx`)
  - **Props:** `count`, `onClick`
  - **Description:** A bell icon component that displays an unread notification badge.

### Shell
- **AppShell** (`src/frontend/src/components/humi/shell/AppShell.tsx`)
  - **Props:** `children`
  - **Description:** The primary application shell layout wrapping all main content.
- **CommandPalette** (`src/frontend/src/components/humi/shell/CommandPalette.tsx`)
  - **Props:** `open`, `onClose`
  - **Description:** A global search and command palette interface.
- **Sidebar** (`src/frontend/src/components/humi/shell/Sidebar.tsx`)
  - **Props:** `onNavigate`, `onClose`, `className`
  - **Description:** The primary navigation sidebar for the application layout.
- **Topbar** (`src/frontend/src/components/humi/shell/Topbar.tsx`)
  - **Props:** `title`, `subtitle`, `actions`, `onSearchClick`
  - **Description:** The top navigation bar displaying page title, user info, and global actions.
