/**
 * Deep linking configuration (stub for MVP).
 * Not wired into the app; for future use when implementing deep links
 * (e.g. grqaser://book/:id, grqaser://search?q=).
 *
 * @see https://reactnavigation.org/docs/deep-linking/
 * @see src/navigation/README.md
 */
export const linking = {
  prefixes: ['grqaser://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Library: 'library',
          Player: 'player',
          Favorites: 'favorites',
          Profile: 'profile',
        },
      },
      BookDetail: 'book/:id',
      Search: 'search',
      Settings: 'settings',
    },
  },
};
