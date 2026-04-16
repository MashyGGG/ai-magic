import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1a1a2e',
    colorLink: '#c9a96e',
    borderRadius: 8,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: {
      siderBg: '#1a1a2e',
      triggerBg: '#16163a',
    },
    Menu: {
      darkItemBg: '#1a1a2e',
      darkItemSelectedBg: 'rgba(201, 169, 110, 0.15)',
      darkItemSelectedColor: '#c9a96e',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
    },
    Card: {
      borderRadiusLG: 8,
    },
    Button: {
      borderRadius: 6,
    },
  },
};
