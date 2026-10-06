import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { getProfile } from '@/lib/feed.functions'
import type { FeedPost } from '@/lib/feed-shared'
import { FollowButton, PostCard, Toast, useToast } from '@/components/feed/kit'

type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>['profile']>

export function ProfilePage({ slug }: { slug: string }) {
  const load = useServerFn(getProfile)
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [toast, say] = useToast()

  useEffect(() => {
    setProfile(undefined)
    load({ data: { slug } })
      .then((r) => {
        setProfile(r.profile)
        setPosts(r.posts ?? [])
      })
      .catch(() => setProfile(null))
  }, [slug])

  if (profile === undefined)
    return (
      <div className="fd">
        <div className="fd-col">
          <p className="fd-muted">loading…</p>
        </div>
      </div>
    )
  if (profile === null)
    return (
      <div className="fd">
        <div className="fd-col">
          <div className="fd-empty">
            <b>No one here by that name.</b>
            <Link to="/rooms" className="fd-btn">
              back to rooms
            </Link>
          </div>
        </div>
      </div>
    )

  return (
    <div className="fd">
      <div className="fd-col">
        <div className="fd-between" style={{ alignItems: 'flex-start' }}>
          <div className="fd-row" style={{ gap: 14 }}>
            <span className="fd-av lg">{profile.emoji}</span>
            <div>
              <h1 className="fd-h1" style={{ fontSize: 22 }}>
                {profile.alias}
              </h1>
              <span className="fd-faint">
                joined {new Date(profile.joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
          {profile.isMe ? (
            <Link to="/rooms" search={{ tab: 'saved' }} className="fd-btn ghost sm">
              saved
            </Link>
          ) : (
            <FollowButton
              slug={profile.slug}
              following={profile.amFollowing}
              signedIn={profile.signedIn}
              onChange={(f, n) => setProfile((p) => (p ? { ...p, amFollowing: f, followers: n } : p))}
            />
          )}
        </div>

        <div className="fd-stats">
          <div>
            <b>{posts.length}</b>
            <span>posts</span>
          </div>
          <div>
            <b>{profile.followers}</b>
            <span>followers</span>
          </div>
          <div>
            <b>{profile.following}</b>
            <span>following</span>
          </div>
          <div>
            <b>{profile.likes}</b>
            <span>likes</span>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="fd-empty">
            <b>No posts yet.</b>
            {profile.isMe ? (
              <Link to="/" className="fd-btn">
                write one
              </Link>
            ) : null}
          </div>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              signedIn={profile.signedIn}
              say={say}
              hideFollow
              onGone={(id) => setPosts((xs) => xs.filter((x) => x.id !== id))}
            />
          ))
        )}
      </div>
      <Toast msg={toast} />
    </div>
  )
}
