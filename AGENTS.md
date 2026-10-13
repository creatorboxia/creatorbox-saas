<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Build chat transcripts and composers from the installed AI Elements primitives so markdown, scrolling, and input behavior remain consistent.
- Stripe webhook pure logic lives in src/lib/stripe-webhook.ts (tested with `bun test`); events go processing → processed|failed in stripe_processed_events so retries are safe.
