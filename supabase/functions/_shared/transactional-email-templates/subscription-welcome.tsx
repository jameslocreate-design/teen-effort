import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'teen-effort'

interface SubscriptionWelcomeProps {
  name?: string
  planName?: string
  appUrl?: string
}

const SubscriptionWelcomeEmail = ({ name, planName, appUrl }: SubscriptionWelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {planName ? `Welcome to ${planName}` : 'Welcome'} — your love story just got an upgrade
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={badge}>
          <Text style={badgeText}>♥ {SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>
          {name ? `Welcome, ${name}!` : 'Welcome!'}
        </Heading>
        <Text style={text}>
          {planName
            ? `You're now on the ${planName} plan. `
            : "You're all set with your new plan. "}
          Every feature you unlocked is ready for you and your partner — more date
          ideas, smarter suggestions, and tools to keep your relationship thriving.
        </Text>
        {appUrl && (
          <Section style={btnWrap}>
            <Button style={button} href={appUrl}>
              Start exploring
            </Button>
          </Section>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          Thank you for choosing {SITE_NAME}. Here's to many memorable dates ahead.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: SubscriptionWelcomeEmail,
  subject: (data: Record<string, any>) =>
    data?.planName ? `Welcome to ${data.planName} 💕` : `Welcome to ${SITE_NAME} 💕`,
  displayName: 'Subscription welcome',
  previewData: { name: 'Jordan', planName: 'Romance', appUrl: 'https://teen-effort.lovable.app' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif' }
const container = { padding: '32px 28px', maxWidth: '480px', margin: '0 auto' }
const badge = { marginBottom: '24px' }
const badgeText = { fontSize: '14px', fontWeight: 'bold', color: '#d6275a', margin: '0', letterSpacing: '0.5px' }
const h1 = { fontSize: '26px', fontWeight: 'bold', color: '#16192b', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#4a4f5e', lineHeight: '1.6', margin: '0 0 24px', fontFamily: 'Arial, sans-serif' }
const btnWrap = { margin: '0 0 28px' }
const button = {
  backgroundColor: '#d6275a',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold',
  textDecoration: 'none',
  padding: '12px 28px',
  borderRadius: '10px',
  fontFamily: 'Arial, sans-serif',
}
const hr = { borderColor: '#eee', margin: '28px 0' }
const footer = { fontSize: '13px', color: '#999999', margin: '0', fontFamily: 'Arial, sans-serif' }

export default SubscriptionWelcomeEmail
