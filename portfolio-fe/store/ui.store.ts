import { create } from 'zustand';

export type SectionId =
  | 'hero'
  | 'about'
  | 'skills'
  | 'projects'
  | 'experience'
  | 'contact';

interface UiState {
  isMobileNavOpen: boolean;
  activeSection: SectionId;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  toggleMobileNav: () => void;
  setActiveSection: (section: SectionId) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileNavOpen: false,
  activeSection: 'hero',
  openMobileNav: () => set({ isMobileNavOpen: true }),
  closeMobileNav: () => set({ isMobileNavOpen: false }),
  toggleMobileNav: () =>
    set((state) => ({ isMobileNavOpen: !state.isMobileNavOpen })),
  setActiveSection: (section) => set({ activeSection: section }),
}));
