/**
 * src/pages/ReviewView.jsx
 * Route: /#/review/:trolleyId
 *
 * Customer review page — Ant Rate + Input.TextArea → POST /api/review/submit
 * Shows Ant Result "Thank You" on success.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Rate, Input, Button, Result, Typography, Space,
  notification, Divider,
} from 'antd';
import {
  ShoppingCartOutlined, StarOutlined, SendOutlined,
  SmileOutlined, HeartOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Custom review prompt labels for each star
const RATE_DESCRIPTIONS = [
  'Terrible',
  'Poor',
  'Average',
  'Good',
  'Excellent!',
];

// Emoji matching each rating level
const RATE_EMOJIS = ['😤', '😕', '😐', '😊', '🤩'];

export default function ReviewView() {
  const { trolleyId } = useParams();

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [notifApi, notifCtx] = notification.useNotification();

  const handleSubmit = async () => {
    if (rating === 0) {
      notifApi.warning({
        message: 'Please rate your experience',
        description: 'Select at least 1 star before submitting.',
        duration: 3,
      });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post('/api/review/submit', {
        trolleyID: trolleyId,
        sessionId: null,
        rating,
        feedback: feedback.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      notifApi.error({
        message: 'Submission failed',
        description: err.response?.data?.error || 'Could not submit review. Please try again.',
        duration: 5,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Thank you screen ─────────────────────────────────────────
  if (submitted) {
    return (
      <div
        className="page-center"
        style={{
          background: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
          minHeight: '100vh',
        }}
      >
        <div className="thankyou-container animate-fadeInUp" style={{ maxWidth: 440, width: '100%' }}>
          <Card
            style={{
              borderRadius: 20,
              border: '1px solid #e0e0e0',
              boxShadow: '0 16px 48px rgba(0,0,0,0.10)',
              overflow: 'hidden',
              textAlign: 'center',
            }}
            bodyStyle={{ padding: '48px 32px' }}
          >
            {/* Animated checkmark icon */}
            <div
              style={{
                width: 88,
                height: 88,
                background: '#0a0a0a',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                fontSize: 40,
                animation: 'fadeInUp 0.5s ease both',
              }}
            >
              <span style={{ color: 'white' }}>✓</span>
            </div>

            <Result
              status="success"
              title={
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: '#0a0a0a',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Thank You!
                </span>
              }
              subTitle={
                <div>
                  <Paragraph style={{ color: '#6b6b6b', fontSize: 15, margin: '8px 0 16px' }}>
                    Your feedback helps us improve every shopping experience.
                  </Paragraph>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#f4f4f4',
                      padding: '8px 16px',
                      borderRadius: 99,
                      fontSize: 14,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{RATE_EMOJIS[rating - 1]}</span>
                    <Text strong>You rated us {rating} star{rating !== 1 ? 's' : ''}</Text>
                  </div>
                </div>
              }
              extra={[
                <Button
                  key="home"
                  type="primary"
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  style={{
                    background: '#0a0a0a',
                    borderColor: '#0a0a0a',
                    borderRadius: 8,
                    fontWeight: 600,
                  }}
                  onClick={() => window.close()}
                >
                  Done
                </Button>,
              ]}
            />

            <Divider />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center' }}>
              <HeartOutlined style={{ color: '#cf1322', fontSize: 12 }} />
              <Text style={{ fontSize: 11, color: '#9a9a9a' }}>
                SmartTrolley · Trolley #{trolleyId}
              </Text>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Review form ──────────────────────────────────────────────
  return (
    <div
      className="page-center"
      style={{ background: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)' }}
    >
      {notifCtx}
      <div
        style={{ maxWidth: 480, width: '100%' }}
        className="animate-fadeInUp"
      >
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: '#0a0a0a',
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              marginBottom: 12,
            }}
          >
            <ShoppingCartOutlined style={{ color: 'white' }} />
          </div>
          <Title level={3} style={{ margin: 0, color: '#0a0a0a' }}>
            How was your experience?
          </Title>
          <Text style={{ color: '#9a9a9a', fontSize: 13 }}>
            Trolley #{trolleyId}
          </Text>
        </div>

        <Card
          style={{
            borderRadius: 20,
            border: '1px solid #e0e0e0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
          bodyStyle={{ padding: '32px' }}
        >
          {/* Star rating */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <Text
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#9a9a9a',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 16,
              }}
            >
              Overall Rating
            </Text>

            <Rate
              value={rating}
              onChange={setRating}
              style={{ fontSize: 40 }}
              character={<StarOutlined />}
            />

            {rating > 0 && (
              <div
                style={{
                  marginTop: 12,
                  animation: 'fadeInUp 0.3s ease both',
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    display: 'block',
                    lineHeight: 1,
                    marginBottom: 4,
                  }}
                >
                  {RATE_EMOJIS[rating - 1]}
                </Text>
                <Text
                  strong
                  style={{ color: '#1a1a1a', fontSize: 15 }}
                >
                  {RATE_DESCRIPTIONS[rating - 1]}
                </Text>
              </div>
            )}
          </div>

          <Divider style={{ margin: '0 0 24px' }} />

          {/* Written feedback */}
          <div style={{ marginBottom: 24 }}>
            <Text
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 600,
                color: '#9a9a9a',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 10,
              }}
            >
              Tell us more (optional)
            </Text>
            <TextArea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What did you like? What could be improved?"
              rows={4}
              maxLength={500}
              showCount
              style={{
                resize: 'none',
                borderRadius: 10,
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                borderColor: '#e0e0e0',
              }}
            />
          </div>

          {/* Submit button */}
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            block
            loading={submitting}
            onClick={handleSubmit}
            style={{
              height: 52,
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              background: '#0a0a0a',
              borderColor: '#0a0a0a',
              letterSpacing: '-0.01em',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </Button>

          {/* Skip */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <Button
              type="link"
              style={{ color: '#9a9a9a', fontSize: 12 }}
              onClick={() => setSubmitted(true)}
            >
              Skip for now
            </Button>
          </div>
        </Card>

        {/* Footer note */}
        <div style={{ textAlign: 'center', marginTop: 16, color: '#9a9a9a', fontSize: 11 }}>
          <SmileOutlined /> &nbsp;Your feedback is anonymous and helps us improve
        </div>
      </div>
    </div>
  );
}
