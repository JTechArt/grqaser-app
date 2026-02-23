import {useWindowDimensions} from 'react-native';

/**
 * Shared layout constants and hook for Search and Favorites screens.
 * Keeps grid layout (columns, card size, spacing) consistent across both.
 */
export const CARD_GAP = 12;
export const CARD_MARGIN = 6;
export const LIST_PADDING = 8;
export const LIST_PADDING_BOTTOM = 24;
export const EMPTY_MARGIN_TOP = 24;

export function useBookGridLayout() {
  const {width} = useWindowDimensions();
  const cardWidth = width * 0.45;
  const numColumns = Math.floor(width / (cardWidth + CARD_GAP)) || 2;
  return {cardWidth, numColumns};
}
