export const TAB_BAR_BASE_HEIGHT = 56;
export const TAB_BAR_EXTRA_HEIGHT = 8;

export function getTabBarHeight(insets) {
  return TAB_BAR_BASE_HEIGHT + insets.bottom + TAB_BAR_EXTRA_HEIGHT;
}
