/* The 5-second video of the bit on screen. Plays in a canvas (free users
 * see the shutap.com watermark; Basic and Pro see it clean). Download encodes
 * it on the device, charges one download of kind 'video', and shares on
 * phones or saves on desktop. A phone that cannot encode gets the picture
 * instead, without a second charge. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chargeDownload, type DownloadCharge } from "@/lib/bits.functions";
import { isPaidTier, type BitTier, type BitVersion } from "@/lib/bits/shared";
import { buildSpec, VIDEO_H, VIDEO_SECONDS, VIDEO_W, type VideoSpec } from "@/lib/bits/video/spec";
import { drawFrame } from "@/lib/bits/video/draw";
import { scheduleSfx } from "@/lib/bits/video/sfx";
import { canEncodeVideo, encodeVideo, type EncodeSupport } from "@/lib/bits/video/encode";
import {
  anonSessionId,
  canShareFiles,
  isShareAbort,
  jokeTap,
  jokeTrack,
  saveBlob,
} from "../joke/jokeClient";

export function VideoCard({
  bitId,
  version,
  story,
  tier,
  say,
  onSignIn,
  onLimit,
  onFallbackPicture,
  downloadsLeft,
  onCharged,
  beforeDownload,
  resume,
  onResumed,
  right,
  onWatch,
}: {
  bitId: string;
  version: BitVersion;
  story: string;
  tier: BitTier;
  say: (m: string) => void;
  /** guests: downloading needs an account */
  onSignIn?: () => void;
  /** at the daily download cap: open the plans */
  onLimit: (why: "count" | "watermark") => void;
  /** this device cannot make a video file: open the picture download instead */
  onFallbackPicture: () => void;
  downloadsLeft: number | null | undefined;
  onCharged: (r: Extract<DownloadCharge, { ok: true }>) => void;
  /** returns true when a confirm sheet took over; the download waits for `resume` */
  beforeDownload?: () => boolean;
  /** finish the download now (after the confirm, sign-in or payment) */
  resume?: boolean;
  onResumed?: () => void;
  /** what sits beside the video (the caption): gets the download button and
   *  the watermark note to place in its own row */
  right?: (downloadButton: ReactNode, note: ReactNode) => ReactNode;
  /** guests: the video is behind sign-in; this opens the sheet */
  onWatch?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [spec, setSpec] = useState<VideoSpec>(() => buildSpec(version, story));
  const gated = !!onWatch;
  const [playing, setPlaying] = useState(!gated);
  const [support, setSupport] = useState<EncodeSupport | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const charge = useServerFn(chargeDownload);
  const watermark = !isPaidTier(tier);
  const audioRef = useRef<AudioContext | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    setSpec(buildSpec(version, story));
    completedRef.current = false;
  }, [version, story]);

  useEffect(() => {
    canEncodeVideo()
      .then(setSupport)
      .catch(() => setSupport("none"));
  }, []);

  // the player: draws the frame for the current time, loops every 5s
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = canvas.width / VIDEO_W;
    let raf = 0;
    let start = performance.now();
    let lastLoop = 0;
    const tick = () => {
      const now = performance.now();
      const t = ((now - start) / 1000) % VIDEO_SECONDS;
      const loop = Math.floor((now - start) / 1000 / VIDEO_SECONDS);
      if (loop !== lastLoop) {
        lastLoop = loop;
        if (!completedRef.current) {
          completedRef.current = true;
          jokeTrack("video_completed", tier, { kind: version.kind });
        }
        if (audioRef.current && audioRef.current.state === "running")
          scheduleSfx(audioRef.current, spec, audioRef.current.currentTime + 0.02);
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawFrame(ctx, t, spec, { watermark });
      if (playing) raf = requestAnimationFrame(tick);
    };
    if (playing) {
      start = performance.now();
      jokeTrack("video_played", tier, { kind: version.kind });
      if (audioRef.current && audioRef.current.state === "running")
        scheduleSfx(audioRef.current, spec, audioRef.current.currentTime + 0.02);
      raf = requestAnimationFrame(tick);
    } else if (gated) {
      // a guest sees the first beat only: the hook and the cast, no tags, no
      // button, under a frosted cover and the ask
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawFrame(ctx, 0.8, spec, { watermark });
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillRect(0, VIDEO_H * 0.42, VIDEO_W, VIDEO_H * 0.58);
    } else {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawFrame(ctx, 4.6, spec, { watermark });
    }
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, playing, watermark, gated]);

  useEffect(() => {
    if (gated) jokeTap("video_gated", tier, { kind: version.kind });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated, version.id]);

  function tapVideo() {
    if (gated) {
      jokeTap("video_gate_tapped", tier, { kind: version.kind });
      onWatch?.();
      return;
    }
    jokeTap("video_tapped", tier, { kind: version.kind, to: playing ? "pause" : "play" });
    setPlaying((p) => !p);
  }

  function toggleSound() {
    if (!audioRef.current) {
      try {
        const AC = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
        audioRef.current = new AC();
      } catch {
        return;
      }
    }
    const ac = audioRef.current!;
    jokeTrack("video_sound_toggled", tier, { on: ac.state !== "running" });
    if (ac.state === "running") void ac.suspend();
    else void ac.resume();
  }

  async function download(skipConfirm = false) {
    jokeTap("download_tapped", tier, {
      kind: "video",
      state: onSignIn ? "guest" : downloadsLeft === 0 ? "capped" : "ok",
      resumed: skipConfirm,
      left: downloadsLeft ?? null,
    });
    if (onSignIn) return onSignIn();
    if (!skipConfirm && beforeDownload?.()) return;
    if (support === "none") {
      jokeTap("video_fallback_picture", tier, { reason: "unsupported" });
      say("This browser can't make a video file. Saving the picture instead.");
      return onFallbackPicture();
    }
    let r: DownloadCharge;
    try {
      r = await charge({
        data: {
          bit_id: bitId,
          version_id: version.id,
          kind: "video",
          anon_session_id: anonSessionId(),
        },
      });
    } catch (e) {
      jokeTap("download_failed", tier, {
        kind: "video",
        reason: "threw",
        message: e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120),
      });
      say("Couldn't start the download. Try again.");
      return;
    }
    if (!r.ok) {
      if (r.reason === "limited") {
        jokeTap("download_blocked", tier, { kind: "video", used: r.used, cap: r.cap });
        say(`That's today's ${r.cap} download${r.cap === 1 ? "" : "s"}.`);
        return onLimit("count");
      }
      jokeTap("download_failed", tier, { kind: "video", reason: r.reason });
      say(
        r.reason === "sign_in"
          ? "Sign in to download it."
          : "Couldn't start the download. Try again.",
      );
      return;
    }
    onCharged(r);
    setBusy(0);
    try {
      const out = await encodeVideo(spec, { watermark, onProgress: (p) => setBusy(p) });
      const slug =
        version.hook
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 48) || "bit";
      const name = `${slug}-shutap.${out.ext}`;
      jokeTrack("download", tier, {
        kind: "video",
        ext: out.ext,
        audio: out.audio,
        watermarked: watermark,
        used: r.used,
        cap: r.cap,
        repeat: r.repeat,
        resumed: skipConfirm,
      });
      const file = new File([out.blob], name, { type: out.blob.type });
      if (canShareFiles([file])) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (e) {
          if (isShareAbort(e)) return;
        }
      }
      saveBlob(out.blob, name);
      say(watermark ? "Saved, with the shutap.com watermark." : "Saved. No watermark.");
    } catch (e) {
      console.warn("[video] encode failed", e);
      jokeTap("video_encode_failed", tier, {
        support,
        message: e instanceof Error ? e.message.slice(0, 120) : "unknown",
      });
      jokeTap("video_fallback_picture", tier, { reason: "encode_failed" });
      say(
        "Couldn't make the video on this device. Saving the picture instead; it won't count again.",
      );
      onFallbackPicture();
    } finally {
      setBusy(null);
    }
  }

  // Finish a download that was waiting on the confirm, sign-in or payment.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (!resume || resumedRef.current || support === null) return;
    resumedRef.current = true;
    onResumed?.();
    void download(true).finally(() => {
      resumedRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume, support]);

  const left = downloadsLeft;
  const label =
    busy !== null
      ? `making the video… ${Math.round(busy * 100)}%`
      : onSignIn
        ? "sign in to watch + download"
        : left === 0
          ? "that's today's downloads · see plans"
          : `download video${left === null || left === undefined ? "" : ` · ${left} left today`}`;

  const downloadButton = (
    <button
      className="bt-btn"
      disabled={busy !== null || support === null}
      onClick={() => void download()}
    >
      {label}
    </button>
  );
  const note = watermark ? (
    <button
      type="button"
      className="bt-note"
      style={{
        background: "none",
        border: 0,
        padding: 0,
        textAlign: "left",
        cursor: "pointer",
        color: "var(--rose)",
      }}
      onClick={() => onLimit("watermark")}
    >
      video with the shutap.com watermark · remove it, Basic $1.99
    </button>
  ) : (
    <span className="bt-note">video clean, no watermark</span>
  );

  return (
    <section
      className="bt-card"
      aria-label="The 5-second video and the caption"
      data-ph-private
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div className="bt-between">
        <span className="bt-lbl">
          post it · video + caption · {version.kind === "original" ? "this bit" : version.kind}
        </span>
        <span className="bt-note">
          {downloadsLeft === null
            ? "unlimited downloads"
            : downloadsLeft === undefined
              ? ""
              : `each is one download · ${downloadsLeft} left today`}
        </span>
      </div>
      <div className="bt-vc">
        <div className="bt-vc-video">
          <div style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              width={360}
              height={Math.round((360 * VIDEO_H) / VIDEO_W)}
              className="ph-no-capture"
              style={{
                width: 180,
                height: 320,
                borderRadius: 14,
                display: "block",
                border: "1px solid var(--line)",
                cursor: "pointer",
              }}
              onClick={tapVideo}
              role={gated ? "button" : "img"}
              aria-label={
                gated
                  ? "The video. Sign in to watch it."
                  : playing
                    ? "The video, playing. Tap to pause."
                    : "The video, paused. Tap to play."
              }
            />
            {gated && (
              <button
                type="button"
                className="bt-btn sm"
                onClick={tapVideo}
                style={{ position: "absolute", left: "50%", top: "62%", transform: "translate(-50%, -50%)", whiteSpace: "nowrap", height: 30, padding: "0 10px", fontSize: 12 }}
              >
                sign in to watch
              </button>
            )}
            {!gated && (
            <button
              type="button"
              className="bt-btn ghost sm"
              onClick={toggleSound}
              aria-label="Sound on or off"
              style={{
                position: "absolute",
                right: 8,
                bottom: 8,
                height: 30,
                padding: "0 10px",
                fontSize: 12,
              }}
            >
              {audioRef.current && audioRef.current.state === "running" ? "sound on" : "sound"}
            </button>
            )}
          </div>
          <span className="bt-note" style={{ display: "block", marginTop: 6, textAlign: "center" }}>
            {VIDEO_SECONDS}s · 1080×1920 · {support === "webm" ? "webm" : "mp4"}
          </span>
        </div>
        <div className="bt-vc-right">
          {right ? (
            right(downloadButton, note)
          ) : (
            <>
              {downloadButton}
              {note}
            </>
          )}
          <span className="bt-note">
            A rewrite makes a new video and caption, and counts as a new bit.
          </span>
        </div>
      </div>
    </section>
  );
}
