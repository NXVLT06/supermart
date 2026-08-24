/**
 * src/pages/PaymentView.jsx
 * Route: /#/pay/:trolleyId
 *
 * Shows an itemized receipt with a 3-second auto-pay progress countdown.
 * On completion → POST /api/payment/verify → redirect to /#/review/:trolleyId
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Table, Progress, Tag, Skeleton, Alert,
  Typography, Divider, notification, Space,
} from 'antd';
import {
  ShoppingCartOutlined, CheckCircleOutlined, SafetyCertificateOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text } = Typography;

// ── Currency helper ────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

// ── Table columns definition ───────────────────────────────────
const COLUMNS = [
  {
    title: 'SKU',
    dataIndex: 'sku',
    key: 'sku',
    width: 90,
    render: (val) => (
      <Text code style={{ fontSize: 11 }}>{val}</Text>
    ),
  },
  {
    title: 'Item',
    dataIndex: 'name',
    key: 'name',
    render: (val) => <Text strong style={{ fontSize: 14 }}>{val}</Text>,
  },
  {
    title: 'Qty',
    dataIndex: 'qty',
    key: 'qty',
    width: 60,
    align: 'center',
    render: (val) => <Text style={{ color: '#6b6b6b' }}>{val}</Text>,
  },
  {
    title: 'Unit Price',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    width: 110,
    align: 'right',
    render: (val) => (
      <Text style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
        {formatCurrency(val)}
      </Text>
    ),
  },
  {
    title: 'Total',
    key: 'lineTotal',
    width: 110,
    align: 'right',
    render: (_, record) => {
      const total = (record.qty || 1) * (record.unitPrice || 0);
      return (
        <Text strong style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
          {formatCurrency(total)}
        </Text>
      );
    },
  },
];

// ── Demo fallback data for testing without backend ─────────────
const DEMO_TROLLEY = {
  trolleyID: 'DEMO-001',
  status: 'AWAITING_PAYMENT',
  theftFlag: false,
  total: 847.50,
  phone: '+919876543210',
  items: [
    { sku: 'GRC001', name: 'Organic Whole Milk (1L)', qty: 2, unitPrice: 65 },
    { sku: 'GRC002', name: 'Brown Bread Loaf', qty: 1, unitPrice: 45 },
    { sku: 'GRC003', name: 'Basmati Rice 5kg', qty: 1, unitPrice: 380 },
    { sku: 'GRC004', name: 'Fresh Tomatoes (1kg)', qty: 3, unitPrice: 40 },
    { sku: 'GRC005', name: 'Amul Butter 500g', qty: 1, unitPrice: 232.50 },
  ],
};

// ── Main Component ─────────────────────────────────────────────
export default function PaymentView() {
  const { trolleyId } = useParams();
  const navigate = useNavigate();

  const [trolley, setTrolley] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('loading'); // loading | countdown | processing | done
  const [notifApi, notifCtx] = notification.useNotification();

  const progressRef = useRef(null);
  const hasVerified = useRef(false);

  // ── Fetch trolley data ─────────────────────────────────────
  const fetchTrolley = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`/api/trolley/${trolleyId}`);
      setTrolley(data);
      setPhase('countdown');
    } catch (err) {
      // Use demo data when API is unavailable (local dev)
      if (err.response?.status === 404 || !err.response) {
        setTrolley({ ...DEMO_TROLLEY, trolleyID: trolleyId });
        setPhase('countdown');
      } else {
        setError(err.response?.data?.error || err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [trolleyId]);

  useEffect(() => {
    fetchTrolley();
  }, [fetchTrolley]);

  // ── Auto-pay countdown ─────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return;

    const DURATION = 3000; // 3 seconds
    const TICK = 50;       // 50ms intervals for smooth animation
    let elapsed = 0;

    progressRef.current = setInterval(() => {
      elapsed += TICK;
      const pct = Math.min(Math.round((elapsed / DURATION) * 100), 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(progressRef.current);
        verifyPayment();
      }
    }, TICK);

    return () => clearInterval(progressRef.current);
  }, [phase]); // eslint-disable-line

  // ── Verify payment ─────────────────────────────────────────
  const verifyPayment = useCallback(async () => {
    if (hasVerified.current) return;
    hasVerified.current = true;
    setPhase('processing');

    try {
      await axios.post('/api/payment/verify', { trolleyId });
      setPhase('done');
      setTimeout(() => navigate(`/review/${trolleyId}`), 800);
    } catch (err) {
      notifApi.error({
        message: 'Payment Error',
        description: err.response?.data?.error || 'Could not verify payment. Please try again.',
        duration: 5,
      });
      // Still redirect on error in demo mode
      setTimeout(() => navigate(`/review/${trolleyId}`), 1500);
    }
  }, [trolleyId, navigate, notifApi]);

  // ── Compute grand total ────────────────────────────────────
  const grandTotal = trolley
    ? (trolley.items || []).reduce(
        (sum, item) => sum + (item.qty || 1) * (item.unitPrice || 0),
        0
      ) || trolley.total
    : 0;

  // ── Progress color/status ──────────────────────────────────
  const progressStrokeColor = {
    '0%': '#6b6b6b',
    '60%': '#3a3a3a',
    '100%': '#0a0a0a',
  };

  const progressStatus = phase === 'done' ? 'success' : phase === 'processing' ? 'active' : 'normal';

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="page-center" style={{ background: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)' }}>
      {notifCtx}
      <div className="receipt-container animate-fadeIn">

        {/* ── Brand header ── */}
        <div className="receipt-header" style={{ padding: '8px 0 20px', borderBottom: 'none' }}>
          <div className="brand-header" style={{ justifyContent: 'center' }}>
            <div className="brand-icon">
              <ShoppingCartOutlined />
            </div>
            <div>
              <div className="brand-title">SmartTrolley</div>
              <div className="brand-subtitle">Automatic Checkout System</div>
            </div>
          </div>
        </div>

        {/* ── Main receipt card ── */}
        <Card
          style={{
            borderRadius: 16,
            border: '1px solid #e0e0e0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}
          bodyStyle={{ padding: '24px' }}
        >
          {/* ── Loading skeleton ── */}
          {loading && (
            <div>
              <Skeleton active paragraph={{ rows: 5 }} />
            </div>
          )}

          {/* ── Error state ── */}
          {!loading && error && (
            <Alert
              type="error"
              message="Could not load trolley data"
              description={error}
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* ── Receipt content ── */}
          {!loading && trolley && (
            <>
              {/* Trolley info strip */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: '#f4f4f4',
                  borderRadius: 8,
                }}
              >
                <Space>
                  <Text style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b6b6b' }}>
                    #{trolley.trolleyID}
                  </Text>
                  {trolley.theftFlag && (
                    <Tag color="red" style={{ margin: 0 }}>⚠ FLAGGED</Tag>
                  )}
                </Space>
                <Tag
                  color={trolley.status === 'PAID' ? 'success' : 'processing'}
                  style={{ margin: 0 }}
                >
                  {trolley.status?.replace('_', ' ')}
                </Tag>
              </div>

              {/* Items table */}
              <div style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#9a9a9a',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'block',
                    marginBottom: 10,
                  }}
                >
                  Items in Trolley
                </Text>
                <Table
                  dataSource={(trolley.items || []).map((item, i) => ({ ...item, key: i }))}
                  columns={COLUMNS}
                  pagination={false}
                  size="small"
                  scroll={{ x: true }}
                  style={{ marginBottom: 4 }}
                />
              </div>

              {/* Grand total */}
              <Divider style={{ margin: '16px 0 12px', borderColor: '#1a1a1a', borderWidth: 2 }} />
              <div className="receipt-total-row">
                <div>
                  <Text className="receipt-total-label">Grand Total</Text>
                  <div style={{ fontSize: 11, color: '#9a9a9a', marginTop: 2 }}>
                    {(trolley.items || []).length} item(s) · incl. all taxes
                  </div>
                </div>
                <Text className="receipt-total-amount">{formatCurrency(grandTotal)}</Text>
              </div>

              {/* ── Progress / Auto-pay section ── */}
              <div className="progress-section" style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    gap: 8,
                  }}
                >
                  {phase === 'done' ? (
                    <CheckCircleOutlined style={{ fontSize: 18, color: '#389e0d' }} />
                  ) : (
                    <ClockCircleOutlined
                      style={{
                        fontSize: 18,
                        color: '#1a1a1a',
                        animation: phase === 'processing' ? 'spin 1s linear infinite' : 'none',
                      }}
                    />
                  )}
                  <Text strong style={{ fontSize: 14 }}>
                    {phase === 'done'
                      ? 'Payment Verified!'
                      : phase === 'processing'
                      ? 'Processing payment…'
                      : 'Auto-pay in progress'}
                  </Text>
                </div>

                <Progress
                  type="circle"
                  percent={progress}
                  status={progressStatus}
                  strokeColor={phase === 'done' ? '#389e0d' : progressStrokeColor}
                  trailColor="#e0e0e0"
                  strokeWidth={8}
                  size={120}
                  format={(pct) =>
                    phase === 'done' ? (
                      <CheckCircleOutlined style={{ fontSize: 32, color: '#389e0d' }} />
                    ) : (
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 22,
                          fontWeight: 800,
                          color: '#1a1a1a',
                        }}
                      >
                        {pct}%
                      </span>
                    )
                  }
                />

                <p className="progress-label">
                  {phase === 'done'
                    ? 'Redirecting to review…'
                    : phase === 'processing'
                    ? 'Please wait'
                    : 'Tap your card or scan QR to pay'}
                </p>
              </div>

              {/* Security note */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  marginTop: 16,
                  color: '#9a9a9a',
                  fontSize: 11,
                }}
              >
                <SafetyCertificateOutlined />
                <span>Secured · End-to-end encrypted transaction</span>
              </div>
            </>
          )}
        </Card>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 16, color: '#9a9a9a', fontSize: 11 }}>
          SmartTrolley Checkout System v1.0
        </div>
      </div>
    </div>
  );
}
