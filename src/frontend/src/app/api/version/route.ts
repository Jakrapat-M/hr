// Build-identity endpoint: reports which commit this deployment was built from,
// so the ship `postmerge` verifier can prove production serves the merged code
// before anyone tells the BA "it's live". No secrets — Vercel build metadata only.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    {
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      env: process.env.VERCEL_ENV ?? 'development',
      builtAt: new Date().toISOString(),
    },
    // must never serve a cached SHA — the poller relies on reading the live build
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
