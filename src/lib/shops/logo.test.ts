import test from 'node:test'
import assert from 'node:assert/strict'
import { LOGO_DATA, iconLinks, siteUrl } from './logo'

test('a typed website becomes a public web address, or nothing', () => {
  assert.equal(siteUrl('yourbusiness.com')?.href, 'https://yourbusiness.com/')
  assert.equal(siteUrl('http://cafe.example.org/menu')?.hostname, 'cafe.example.org')
  for (const bad of ['', 'localhost', 'http://127.0.0.1', '10.0.0.5', 'http://[::1]/', 'printer.local', 'ftp://x.com', 'https://user:pw@x.com', 'db.internal', 'notaurl'])
    assert.equal(siteUrl(bad), null, bad)
})

test('the touch icon wins, then the biggest icon; the usual places are tried last', () => {
  const html = `<head><link rel="icon" href="/fav-16.png" sizes="16x16"><link rel="icon" sizes="192x192" href='/icon-192.png'><link rel="apple-touch-icon" href="https://cdn.site.com/touch.png"><link rel="mask-icon" href="/mask.svg"><link rel="stylesheet" href="/a.css"></head>`
  const got = iconLinks(html, new URL('https://site.com/about'))
  assert.deepEqual(got.slice(0, 3), ['https://cdn.site.com/touch.png', 'https://site.com/icon-192.png', 'https://site.com/fav-16.png'])
  assert.ok(got.includes('https://site.com/favicon.ico'))
  assert.deepEqual(iconLinks('', new URL('https://site.com')), ['https://site.com/apple-touch-icon.png', 'https://site.com/favicon.ico'])
})

test('an icon pointing at a private address is dropped', () => {
  assert.ok(!iconLinks('<link rel="icon" href="http://192.168.1.1/x.png">', new URL('https://site.com')).some((u) => u.includes('192.168')))
})

test('only a small data: image is a logo', () => {
  assert.ok(LOGO_DATA.test('data:image/png;base64,iVBORw0KGgo='))
  assert.ok(!LOGO_DATA.test('data:text/html;base64,PGI+'))
  assert.ok(!LOGO_DATA.test('https://x.com/a.png'))
})
