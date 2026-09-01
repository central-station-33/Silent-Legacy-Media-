import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ghostConfigured, publishToGhost } from "@/lib/ghost";
import type { Story } from "@/lib/types";

// Trickle-publish: finds silent_legacy_stories that are approved and due
// (scheduled_publish_at <= now, not yet published) and publishes each to
// Ghost. Meant to be hit periodically by an external scheduler (Supabase
// pg_cron + pg_net, or a Vercel Cron Job) rather than by a human -- see
// web/README.md for how to wire that up. Protected by a shared secret
// since it has no other auth and does real writes.
export async function POST(request: NextRequest) {
  const secret = process.env.PUBLISH_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "PUBLISH_CRON_SECRET is not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!ghostConfigured()) {
    return NextResponse.json({ published: 0, skipped: "Ghost is not configured yet" });
  }

  const { data, error } = await supabase()
    .from("silent_legacy_stories")
    .select("*")
    .eq("status", "approved")
    .is("published_at", null)
    .lte("scheduled_publish_at", new Date().toISOString())
    .order("scheduled_publish_at", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = (data ?? []) as Story[];
  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const story of due) {
    try {
      const blogPost = story.content?.blogPost;
      if (!blogPost?.headline || !blogPost?.body) {
        throw new Error("story.content.blogPost is missing headline/body");
      }

      const published = await publishToGhost({
        title: blogPost.headline,
        html: blogPost.body,
        tags: [story.pillar],
      });
      if (!published) throw new Error("Ghost publish returned no result");

      const { error: updateError } = await supabase()
        .from("silent_legacy_stories")
        .update({
          published_at: new Date().toISOString(),
          ghost_post_id: published.id,
          ghost_url: published.url,
        })
        .eq("id", story.id);
      if (updateError) throw new Error(updateError.message);

      results.push({ id: story.id, ok: true });
    } catch (err) {
      results.push({ id: story.id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ published: results.filter((r) => r.ok).length, results });
}
