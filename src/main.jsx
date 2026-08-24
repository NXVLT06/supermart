/**
 * src/main.jsx — App entry point with Ant Design B&W theme ConfigProvider
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import App from './App.jsx';
import './index.css';

// Black & White Ant Design 5 theme tokens
const bwTheme = {
  token: {
    // Colors
    colorPrimary: '#1a1a1a',
    colorPrimaryHover: '#3a3a3a',
    colorPrimaryActive: '#0a0a0a',
    colorLink: '#1a1a1a',
    colorLinkHover: '#3a3a3a',
    colorSuccess: '#389e0d',
    colorWarning: '#d48806',
    colorError: '#cf1322',
    colorInfo: '#0958d9',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#fafafa',
    colorBgElevated: '#ffffff',
    colorBorder: '#e0e0e0',
    colorBorderSecondary: '#f0f0f0',
    colorText: '#0a0a0a',
    colorTextSecondary: '#6b6b6b',
    colorTextTertiary: '#9a9a9a',
    colorTextQuaternary: '#c0c0c0',
    colorFill: '#f4f4f4',
    colorFillSecondary: '#f9f9f9',
    colorFillTertiary: '#fafafa',
    colorFillQuaternary: '#ffffff',

    // Shape
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontWeightStrong: 700,

    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    margin: 16,
    marginLG: 24,
    marginSM: 12,

    // Shadows
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    boxShadowSecondary: '0 4px 16px rgba(0,0,0,0.10)',

    // Motion
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.22s',
    motionDurationFast: '0.1s',
    motionEaseInOut: 'cubic-bezier(0.4,0,0.2,1)',
  },
  components: {
    Button: {
      primaryShadow: 'none',
      defaultShadow: 'none',
    },
    Card: {
      headerBg: '#fafafa',
      headerFontSize: 15,
    },
    Table: {
      headerBg: '#f4f4f4',
      headerColor: '#6b6b6b',
      rowHoverBg: '#fafafa',
    },
    Progress: {
      defaultColor: '#1a1a1a',
    },
    Tag: {
      defaultBg: '#f4f4f4',
    },
    Input: {
      activeShadow: '0 0 0 2px rgba(26,26,26,0.15)',
    },
    Rate: {
      starColor: '#1a1a1a',
    },
    Notification: {
      zIndexPopup: 9999,
    },
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider theme={bwTheme}>
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
