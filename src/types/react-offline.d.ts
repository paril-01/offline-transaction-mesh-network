declare module 'react-offline' {
  import * as React from 'react';

  export interface OnlineProps {
    children?: React.ReactNode;
  }

  export interface OfflineProps {
    children?: React.ReactNode;
  }

  export const Online: React.FC<OnlineProps>;
  export const Offline: React.FC<OfflineProps>;
} 