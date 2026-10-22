import { pageMeta } from '@/lib/seo/page-meta'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { AdminAnalyticsPage } from '@/pages/AdminAnalytics'
import { amIAdmin } from '@/lib/admin.functions'

export const Route = createFileRoute('/admin')({
  ssr: false,
  head: () => ({ meta: [...pageMeta("Admin · Dashboard — Shutap", "Review Shutap bits, users and activity in the private administration area.", "/admin"), { name: 'robots', content: 'noindex' }] }),
  beforeLoad: async () => {
    try {
      const ok = await amIAdmin()
      if (!ok) throw notFound()
    } catch (e) {
      throw notFound()
    }
  },
  // Session replay hides all text on this page.
  component: () => (
    <div data-ph-private style={{ display: 'contents' }}>
      <AdminAnalyticsPage />
    </div>
  ),
  notFoundComponent: () => (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#ffffff', color: '#0b080f', fontFamily: 'Sora,sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 42, margin: 0 }}>404</h1>
        <p style={{ color: '#443c42', fontFamily: 'Newsreader,serif', fontStyle: 'italic' }}>nothing here.</p>
        <a href="/" style={{ color: '#17131a' }}>← home</a>
      </div>
    </div>
  ),
})
