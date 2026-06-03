import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Row, Column, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'teen-effort'

interface SubscriptionReceiptProps {
  name?: string
  planName?: string
  amount?: string
  billingCycle?: string
  invoiceDate?: string
  nextBillingDate?: string
}

const SubscriptionReceiptEmail = ({
  name,
  planName,
  amount,
  billingCycle,
  invoiceDate,
  nextBillingDate,
}: SubscriptionReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} payment receipt</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>
          <Text style={badgeText}>♥ {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>Payment received</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, thank` : 'Thank'} you for your payment. Here's a summary
          of your subscription.
        </Text>

        <Section style={card}>
          {planName && (
            <Row style={row}>
              <Column style={label}>Plan</Column>
              <Column style={value}>{planName}</Column>
            </Row>
          )}
          {billingCycle && (
            <Row style={row}>
              <Column style={label}>Billing</Column>
              <Column style={value}>{billingCycle}</Column>
            </Row>
          )}
          {invoiceDate && (
            <Row style={row}>
              <Column style={label}>Date</Column>
              <Column style={value}>{invoiceDate}</Column>
            </Row>
          )}
          {amount && (
            <Row style={rowTotal}>
              <Column style={labelTotal}>Total paid</Column>
              <Column style={valueTotal}>{amount}</Column>
            </Row>
          )}
        </Section>

        {nextBillingDate && (
          <Text style={note}>
            Your next billing date is {nextBillingDate}. You can manage or cancel your
            plan anytime from your account.
          </Text>
        )}

        <Hr style={hr} />
        <Text style={footer}>
          This receipt was sent by {SITE_NAME}. Keep it for your records.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionReceiptEmail,
  subject: (data: Record<string, any>) =>
    data?.amount ? `Your ${SITE_NAME} receipt — ${data.amount}` : `Your ${SITE_NAME} receipt`,
  displayName: 'Subscription receipt',
  previewData: {
    name: 'Jordan',
    planName: 'Romance (Monthly)',
    amount: '$9.99',
    billingCycle: 'Monthly',
    invoiceDate: 'June 3, 2026',
    nextBillingDate: 'July 3, 2026',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const badge = { marginBottom: '24px' }
const badgeText = { fontSize: '14px', fontWeight: 'bold', color: '#d6275a', margin: '0', letterSpacing: '0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold', color: '#16192b', margin: '0 0 12px', fontFamily: 'Georgia, serif' }
const text = { fontSize: '15px', color: '#4a4f5e', lineHeight: '1.6', margin: '0 0 24px' }
const card = { backgroundColor: '#faf6f2', borderRadius: '12px', padding: '8px 18px', margin: '0 0 24px' }
const row = { borderBottom: '1px solid #efe7e0' }
const rowTotal = {}
const label = { fontSize: '14px', color: '#777', padding: '12px 0' }
const value = { fontSize: '14px', color: '#16192b', fontWeight: 'bold', textAlign: 'right' as const, padding: '12px 0' }
const labelTotal = { fontSize: '15px', color: '#16192b', fontWeight: 'bold', padding: '14px 0' }
const valueTotal = { fontSize: '18px', color: '#d6275a', fontWeight: 'bold', textAlign: 'right' as const, padding: '14px 0' }
const note = { fontSize: '13px', color: '#777', lineHeight: '1.6', margin: '0 0 8px' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '0' }

export default SubscriptionReceiptEmail
