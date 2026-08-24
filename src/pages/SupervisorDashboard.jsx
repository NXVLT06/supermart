/**
 * src/pages/SupervisorDashboard.jsx
 * Route: /#/supervisor
 *
 * Password-protected supervisor control center.
 * Features: SSE live updates, trolley cards grid, reviews feed, gate controls.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layout, Card, Tag, Button, Switch, List, Rate, Typography,
  Input, Space, Badge, Empty, Tooltip, Divider, notification,
  Statistic, Modal, Form, Spin,
} from 'antd';
import {
  ShoppingCartOutlined, LogoutOutlined, ThunderboltOutlined,
  StarOutlined, PhoneOutlined, LockOutlined, UnlockOutlined,
  ReloadOutlined, WarningOutlined, CheckCircleOutlined,
  DashboardOutlined, EyeOutlined, TeamOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Header, Content, Sider } = Layout;
const { Title, Text, Paragraph } = Typography;

// ── Constants ────────────────────────────────────────────────────
const DEMO_PASSWORD = 'admin123';

const STATUS_CONFIG = {
  PAID:             { color: 'success', label: 'Paid',            dot: '#52c41a' },
  AWAITING_PAYMENT: { color: 'gold',    label: 'Awaiting Payment', dot: '#faad14' },
  SHOPPING:         { color: 'blue',    label: 'Shopping',        dot: '#1677ff' },
  THEFT_FLAGGED:    { color: 'red',     label: 'Theft Flagged',   dot: '#ff4d4f' },
  UNKNOWN:          { color: 'default', label: 'Unknown',         dot: '#9a9a9a' },
};

// ── Demo seed trolleys (used when KV is empty / not connected) ───
const DEMO_TROLLEYS = [
  { trolleyID: 'T-001', status: 'PAID',             theftFlag: false, total: 847.50, phone: '+919876543210', items: [{},{},{}] },
  { trolleyID: 'T-002', status: 'AWAITING_PAYMENT', theftFlag: false, total: 1240.00, phone: '+919876543211', items: [{},{},{},{}] },
  { trolleyID: 'T-003', status: 'SHOPPING',         theftFlag: false, total: 350.75, phone: '+919876543212', items: [{}] },
  { trolleyID: 'T-004', status: 'THEFT_FLAGGED',    theftFlag: true,  total: 980.25, phone: '+919876543213', items: [{},{}] },
  { trolleyID: 'T-005', status: 'PAID',             theftFlag: false, total: 2150.00, phone: '+919876543214', items: [{},{},{},{},{},{}] },
];

const DEMO_REVIEWS = [
  { trolleyID: 'T-001', rating: 5, feedback: 'Checkout was super smooth!', submittedAt: new Date(Date.now() - 120000).toISOString() },
  { trolleyID: 'T-005', rating: 4, feedback: 'Very convenient. Loved the auto-checkout.', submittedAt: new Date(Date.now() - 300000).toISOString() },
  { trolleyID: 'T-003', rating: 3, feedback: 'Good but app was a bit slow.', submittedAt: new Date(Date.now() - 600000).toISOString() },
];

// ── Helpers ─────────────────────────────────────────────────────
const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

const timeAgo = (isoStr) => {
  if (!isoStr) return '';
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

// ── Login Screen ─────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 500));
    if (password === DEMO_PASSWORD) {
      onLogin();
    } else {
      setError('Incorrect password. Try: admin123');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: '#0a0a0a',
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              marginBottom: 16,
            }}
          >
            <DashboardOutlined style={{ color: 'white' }} />
          </div>
          <Title level={4} style={{ margin: 0, color: '#0a0a0a' }}>
            Supervisor Login
          </Title>
          <Text style={{ color: '#9a9a9a', fontSize: 13 }}>
            SmartTrolley Control Center
          </Text>
        </div>

        <Form layout="vertical" onFinish={handleLogin}>
          <Form.Item label={<Text style={{ fontWeight: 600, fontSize: 12 }}>Password</Text>}>
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9a9a9a' }} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter supervisor password"
              size="large"
              style={{ borderRadius: 10 }}
              onPressEnter={handleLogin}
            />
            {error && (
              <Text style={{ color: '#cf1322', fontSize: 12, display: 'block', marginTop: 6 }}>
                {error}
              </Text>
            )}
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            icon={<EyeOutlined />}
            style={{
              height: 48,
              borderRadius: 10,
              background: '#0a0a0a',
              borderColor: '#0a0a0a',
              fontWeight: 700,
              marginTop: 8,
            }}
          >
            {loading ? 'Verifying…' : 'Access Dashboard'}
          </Button>
        </Form>

        <Text
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 20,
            fontSize: 11,
            color: '#c0c0c0',
          }}
        >
          Demo password: <code>admin123</code>
        </Text>
      </div>
    </div>
  );
}

// ── Trolley Card ─────────────────────────────────────────────────
function TrolleyCard({ trolley, onGateAction }) {
  const cfg = STATUS_CONFIG[trolley.status] || STATUS_CONFIG.UNKNOWN;

  return (
    <div className="trolley-card">
      {/* Status indicator bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            trolley.status === 'PAID'             ? '#52c41a' :
            trolley.status === 'AWAITING_PAYMENT' ? '#faad14' :
            trolley.status === 'THEFT_FLAGGED'    ? '#ff4d4f' : '#1677ff',
          borderRadius: '12px 12px 0 0',
        }}
      />

      {/* Trolley ID */}
      <div className="trolley-id">#{trolley.trolleyID}</div>

      {/* Status tag */}
      <div style={{ marginBottom: 10 }}>
        <Tag color={cfg.color} style={{ fontWeight: 600 }}>
          {trolley.theftFlag && <WarningOutlined style={{ marginRight: 4 }} />}
          {cfg.label}
        </Tag>
      </div>

      {/* Total */}
      <div className="trolley-total">{formatCurrency(trolley.total)}</div>

      {/* Meta info */}
      <div className="trolley-meta">
        <ShoppingCartOutlined style={{ fontSize: 11 }} />
        <span>{(trolley.items || []).length} items</span>
        <span style={{ color: '#e0e0e0' }}>·</span>
        <PhoneOutlined style={{ fontSize: 11 }} />
        <span>{trolley.phone || '—'}</span>
      </div>

      {/* Gate action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Tooltip title="Force unlock gate for this trolley">
          <Button
            size="small"
            icon={<UnlockOutlined />}
            onClick={() => onGateAction(trolley.trolleyID, 'unlock')}
            style={{
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              flex: 1,
            }}
          >
            Unlock
          </Button>
        </Tooltip>
        <Tooltip title="Lock gate for this trolley">
          <Button
            size="small"
            danger
            icon={<LockOutlined />}
            onClick={() => onGateAction(trolley.trolleyID, 'lock')}
            style={{ borderRadius: 6, fontSize: 11, fontWeight: 600, flex: 1 }}
          >
            Lock
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────
function Dashboard({ onLogout }) {
  const [trolleys, setTrolleys] = useState(DEMO_TROLLEYS);
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [sseStatus, setSseStatus] = useState('connecting'); // connecting | connected | error
  const [gateOverride, setGateOverride] = useState(false);
  const [activeTab, setActiveTab] = useState('trolleys');
  const [notifApi, notifCtx] = notification.useNotification();

  const esRef = useRef(null);

  // ── Stats computation ────────────────────────────────────────
  const stats = {
    total:   trolleys.length,
    paid:    trolleys.filter((t) => t.status === 'PAID').length,
    awaiting: trolleys.filter((t) => t.status === 'AWAITING_PAYMENT').length,
    flagged:  trolleys.filter((t) => t.theftFlag).length,
  };

  // ── Load initial data ────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/reviews?limit=10');
      if (Array.isArray(data) && data.length > 0) setReviews(data);
    } catch { /* Use demo data */ }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── SSE connection ───────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (esRef.current) esRef.current.close();

    try {
      const es = new EventSource('/api/events');
      esRef.current = es;

      es.addEventListener('open', () => setSseStatus('connected'));

      es.addEventListener('trolley.update', (e) => {
        try {
          const update = JSON.parse(e.data);
          setTrolleys((prev) => {
            const idx = prev.findIndex((t) => t.trolleyID === update.trolleyID);
            if (idx === -1) return [update, ...prev];
            const next = [...prev];
            next[idx] = { ...next[idx], ...update };
            return next;
          });
          notifApi.info({
            message: `Trolley ${update.trolleyID}`,
            description: `Status → ${update.status?.replace('_', ' ')}`,
            placement: 'bottomRight',
            duration: 3,
          });
        } catch { /* skip */ }
      });

      es.addEventListener('review.new', (e) => {
        try {
          const review = JSON.parse(e.data);
          setReviews((prev) => [review, ...prev].slice(0, 20));
          notifApi.success({
            message: 'New Review',
            description: `Trolley ${review.trolleyID} left ${review.rating} stars`,
            placement: 'bottomRight',
            duration: 3,
          });
        } catch { /* skip */ }
      });

      // Reconnect when SSE cycle closes
      es.addEventListener('close', () => {
        setTimeout(connectSSE, 1000);
      });

      es.onerror = () => {
        setSseStatus('error');
        es.close();
        setTimeout(connectSSE, 3000);
      };
    } catch {
      setSseStatus('error');
      setTimeout(connectSSE, 5000);
    }
  }, [notifApi]);

  useEffect(() => {
    connectSSE();
    return () => { if (esRef.current) esRef.current.close(); };
  }, [connectSSE]);

  // ── Gate override handler ────────────────────────────────────
  const handleGateAction = useCallback(async (gateId, action) => {
    try {
      const { data } = await axios.post('/api/gate/supervisor-override', { gateId, action });
      notifApi.success({
        message: `Gate ${action}ed`,
        description: `${gateId} ${action}ed until ${new Date(data.validUntil).toLocaleTimeString()}`,
        duration: 4,
      });
    } catch (err) {
      notifApi.error({
        message: 'Gate action failed',
        description: err.response?.data?.error || err.message,
        duration: 4,
      });
    }
  }, [notifApi]);

  const handleGlobalGateOverride = useCallback(async (checked) => {
    setGateOverride(checked);
    await handleGateAction('GATE-MAIN', checked ? 'unlock' : 'lock');
  }, [handleGateAction]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <Layout style={{ minHeight: '100vh', background: '#fafafa' }}>
      {notifCtx}

      {/* ── Header ── */}
      <Header
        className="supervisor-header"
        style={{ padding: '0 24px', height: 60, lineHeight: '60px' }}
      >
        <Space align="center" size={12}>
          <div
            style={{
              width: 36,
              height: 36,
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DashboardOutlined style={{ color: 'white', fontSize: 18 }} />
          </div>
          <div>
            <div className="supervisor-header-title">Supervisor Dashboard</div>
          </div>
        </Space>

        <Space size={16}>
          {/* SSE status indicator */}
          <div className="sse-indicator">
            <div className={`sse-dot ${sseStatus !== 'connected' ? 'disconnected' : ''}`} />
            <span>{sseStatus === 'connected' ? 'Live' : sseStatus === 'error' ? 'Reconnecting…' : 'Connecting…'}</span>
          </div>

          {/* Global gate override */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            <span>Gate Override</span>
            <Switch
              size="small"
              checked={gateOverride}
              onChange={handleGlobalGateOverride}
              style={{ background: gateOverride ? '#52c41a' : undefined }}
            />
          </div>

          {/* Refresh */}
          <Tooltip title="Refresh data">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onClick={loadData}
            />
          </Tooltip>

          {/* Logout */}
          <Button
            type="text"
            icon={<LogoutOutlined />}
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}
            onClick={onLogout}
          >
            Logout
          </Button>
        </Space>
      </Header>

      <Content style={{ background: '#fafafa' }}>
        {/* ── Stat cards ── */}
        <div className="stats-row">
          {[
            { label: 'Total Trolleys', value: stats.total,    icon: <ShoppingCartOutlined /> },
            { label: 'Paid',           value: stats.paid,     icon: <CheckCircleOutlined style={{ color: '#52c41a' }} /> },
            { label: 'Awaiting',       value: stats.awaiting, icon: <ThunderboltOutlined style={{ color: '#faad14' }} /> },
            { label: 'Flagged',        value: stats.flagged,  icon: <WarningOutlined style={{ color: '#ff4d4f' }} /> },
          ].map((s, i) => (
            <div key={i} className="stat-card animate-fadeInUp" style={{ animationDelay: `${i * 0.08}s` }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ padding: '20px 20px 0', display: 'flex', gap: 8 }}>
          {[
            { key: 'trolleys', label: 'Trolleys', icon: <ShoppingCartOutlined /> },
            { key: 'reviews',  label: 'Reviews',  icon: <StarOutlined /> },
            { key: 'gate',     label: 'Gate',     icon: <TeamOutlined /> },
          ].map((tab) => (
            <Button
              key={tab.key}
              type={activeTab === tab.key ? 'primary' : 'default'}
              icon={tab.icon}
              onClick={() => setActiveTab(tab.key)}
              style={{
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                background: activeTab === tab.key ? '#0a0a0a' : undefined,
                borderColor: activeTab === tab.key ? '#0a0a0a' : '#e0e0e0',
                color: activeTab === tab.key ? 'white' : '#6b6b6b',
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* ── Trolleys grid tab ── */}
        {activeTab === 'trolleys' && (
          <>
            {trolleys.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Empty description="No active trolleys" />
              </div>
            ) : (
              <div className="trolley-grid">
                {trolleys.map((t) => (
                  <TrolleyCard
                    key={t.trolleyID}
                    trolley={t}
                    onGateAction={handleGateAction}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Reviews tab ── */}
        {activeTab === 'reviews' && (
          <div className="review-feed" style={{ marginTop: 16 }}>
            <Card
              style={{ borderRadius: 12, border: '1px solid #e0e0e0' }}
              bodyStyle={{ padding: 0 }}
              title={
                <Text strong style={{ fontSize: 14 }}>
                  Recent Customer Reviews
                </Text>
              }
            >
              {reviews.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Empty description="No reviews yet" />
                </div>
              ) : (
                <List
                  dataSource={reviews}
                  renderItem={(review, i) => (
                    <List.Item
                      key={i}
                      style={{
                        padding: '16px 20px',
                        animation: `fadeInUp 0.3s ease ${i * 0.05}s both`,
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              background: '#f4f4f4',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'monospace',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#6b6b6b',
                              flexShrink: 0,
                            }}
                          >
                            {(review.trolleyID || 'T').slice(-3)}
                          </div>
                        }
                        title={
                          <Space size={8}>
                            <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                              #{review.trolleyID}
                            </Text>
                            <Rate
                              disabled
                              value={review.rating}
                              style={{ fontSize: 12 }}
                            />
                            <Text style={{ fontSize: 11, color: '#9a9a9a' }}>
                              {timeAgo(review.submittedAt)}
                            </Text>
                          </Space>
                        }
                        description={
                          review.feedback ? (
                            <Text style={{ fontSize: 13, color: '#3a3a3a' }}>
                              "{review.feedback}"
                            </Text>
                          ) : (
                            <Text style={{ fontSize: 12, color: '#c0c0c0', fontStyle: 'italic' }}>
                              No written feedback
                            </Text>
                          )
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </div>
        )}

        {/* ── Gate controls tab ── */}
        {activeTab === 'gate' && (
          <div className="gate-controls" style={{ margin: '16px 20px' }}>
            <Card
              title={
                <Space>
                  <TeamOutlined />
                  <Text strong>Gate Control Panel</Text>
                </Space>
              }
              style={{ borderRadius: 12, border: '1px solid #e0e0e0' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {/* Main gate controls */}
                {[
                  { id: 'GATE-A', label: 'Gate A — North Entrance' },
                  { id: 'GATE-B', label: 'Gate B — South Exit' },
                  { id: 'GATE-C', label: 'Gate C — Emergency' },
                ].map((gate) => (
                  <Card
                    key={gate.id}
                    size="small"
                    style={{ borderRadius: 10, border: '1px solid #e8e8e8' }}
                    bodyStyle={{ padding: '16px' }}
                  >
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>{gate.label}</Text>
                    <Text style={{ fontSize: 11, color: '#9a9a9a', display: 'block', marginBottom: 14 }}>
                      {gate.id}
                    </Text>
                    <Space>
                      <Button
                        size="small"
                        icon={<UnlockOutlined />}
                        onClick={() => handleGateAction(gate.id, 'unlock')}
                        style={{ borderRadius: 6, fontWeight: 600 }}
                      >
                        Unlock (5 min)
                      </Button>
                      <Button
                        size="small"
                        danger
                        icon={<LockOutlined />}
                        onClick={() => handleGateAction(gate.id, 'lock')}
                        style={{ borderRadius: 6, fontWeight: 600 }}
                      >
                        Lock
                      </Button>
                    </Space>
                  </Card>
                ))}
              </div>

              <Divider />

              {/* Global master override */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: '#f4f4f4',
                  borderRadius: 10,
                }}
              >
                <div>
                  <Text strong style={{ display: 'block' }}>Master Gate Override</Text>
                  <Text style={{ fontSize: 12, color: '#9a9a9a' }}>
                    Unlock all gates simultaneously for 5 minutes
                  </Text>
                </div>
                <Switch
                  checked={gateOverride}
                  onChange={handleGlobalGateOverride}
                  checkedChildren="OPEN"
                  unCheckedChildren="AUTO"
                  style={{ background: gateOverride ? '#52c41a' : undefined }}
                />
              </div>
            </Card>
          </div>
        )}
      </Content>
    </Layout>
  );
}

// ── Root Component ───────────────────────────────────────────────
export default function SupervisorDashboard() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return <Dashboard onLogout={() => setAuthenticated(false)} />;
}
