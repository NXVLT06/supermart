/**
 * src/App.jsx — Router setup with HashRouter
 */

import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';

// Lazy load pages for code splitting
const PaymentView = lazy(() => import('./pages/PaymentView.jsx'));
const ReviewView = lazy(() => import('./pages/ReviewView.jsx'));
const SupervisorDashboard = lazy(() => import('./pages/SupervisorDashboard.jsx'));

// Full-screen loader used during lazy page hydration
function PageLoader() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafafa',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <Spin size="large" style={{ color: '#1a1a1a' }} />
        <p style={{ marginTop: 16, color: '#9a9a9a', fontSize: 13, fontWeight: 500 }}>
          Loading…
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Payment flow */}
          <Route path="/pay/:trolleyId" element={<PaymentView />} />

          {/* Post-payment review */}
          <Route path="/review/:trolleyId" element={<ReviewView />} />

          {/* Supervisor control dashboard */}
          <Route path="/supervisor" element={<SupervisorDashboard />} />

          {/* Redirect root to a demo trolley for easy testing */}
          <Route path="/" element={<Navigate to="/supervisor" replace />} />

          {/* 404 catch-all */}
          <Route
            path="*"
            element={
              <div className="page-center">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 72, fontWeight: 800, color: '#1a1a1a', lineHeight: 1 }}>
                    404
                  </div>
                  <p style={{ color: '#9a9a9a', marginTop: 12 }}>Page not found</p>
                </div>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
