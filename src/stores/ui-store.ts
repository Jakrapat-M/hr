import { create } from 'zustand';

interface UIState {
 sidebarOpen: boolean;
 mobileMenuOpen: boolean;
 /** Imperative open flag for the persona picker modal — set by the avatar
  *  dropdown menu item (SF Proxy Now entry point) so the picker can live
  *  outside Topbar. PersonaSwitcher reads this and renders its Modal. */
 personaPickerOpen: boolean;
 theme:'light' |'dark' |'system';
 toggleSidebar: () => void;
 setSidebarOpen: (open: boolean) => void;
 toggleMobileMenu: () => void;
 setMobileMenuOpen: (open: boolean) => void;
 closeMobileMenu: () => void;
 setPersonaPickerOpen: (open: boolean) => void;
 setTheme: (theme:'light' |'dark' |'system') => void;
}

export const useUIStore = create<UIState>((set) => ({
 sidebarOpen: true,
 mobileMenuOpen: false,
 personaPickerOpen: false,
 theme:'light',
 toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
 setSidebarOpen: (open) => set({ sidebarOpen: open }),
 toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
 setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
 closeMobileMenu: () => set({ mobileMenuOpen: false }),
 setPersonaPickerOpen: (open) => set({ personaPickerOpen: open }),
 setTheme: (theme) => set({ theme }),
}));
