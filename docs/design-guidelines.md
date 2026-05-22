# Pact Raven Design Guidelines

This is the source of truth for Pact Raven product and website design. Future UI work should preserve this direction unless the product direction is explicitly changed.

## North Star

Pact Raven should feel sparse, clean, spacious, and psychologically sharp. Cal AI is the benchmark for the level of activation quality we want: minimal screens, obvious next actions, low cognitive load, and polished states.

Do not copy Cal AI visually. Use it as the quality bar for clarity, restraint, pacing, and flow.

The app and website must pass the three-second Reel test: someone seeing the product in a TikTok, Instagram Reel, or creator screen recording should understand the core model almost immediately.

Core model: `Lock money. Show proof daily. Missed days go to charity.`

## Product Feel

- Calm, serious, and direct.
- Very little text. No redundant or duplicate explanations.
- One clear action per screen whenever possible.
- Spacious layouts with quiet hierarchy.
- Trust through precision, not through loud decoration.
- App/PWA is the primary product surface; the website supports conversion, trust, and policy clarity.
- Founder-led short-form content is the primary marketing motion, so screens must read clearly when shown quickly on a phone video.

## Visual System

- Use neutral grey surfaces with only a 1-3% blue tint when depth is needed.
- Do not use yellow-tinted backgrounds, cards, panels, borders, or selected states.
- Primary actions should be dark neutral with white text.
- Success, warning, and danger colors should be functional and restrained.
- Keep border radius at 8px unless a native control requires otherwise.
- Use Inter/system sans. Avoid Impact, giant uppercase, poster styling, grain, decorative shapes, or brutalist panels.
- Website content should stay in a clear max-width lane. Current website max width is `1120px`.
- Cards are only for repeated items, modals, or framed tools. Do not nest cards.

## Layout

- Keep top padding restrained. Screens should not feel like content is floating too low.
- Prefer fewer panels and more whitespace over dense card stacks.
- Avoid visible text that explains obvious UI behavior.
- Avoid duplicate summaries of money, proof, deadline, or payment state on the same screen.
- Every screen should have one dominant visual job: choose, pay, prove, review, or resolve.

## Mobile App

- Activation should be one question per screen.
- Inputs should be obvious, with short labels and minimal helper copy.
- Proof submission should put the prompt image and camera action first.
- Show the signature/record confirmation only after proof is attached.
- Profile stays quiet: account, wallet, legal, support. It should not become the main activation surface.
- Empty, loading, success, rejected, and missed states should be polished but sparse.

## Website

- Homepage should convert, not explain everything.
- Primary CTA is workout pact. Content pact can stay secondary.
- Keep nav short and clear.
- Legal and policy content must remain complete, but visually quiet.
- Do not remove legal meaning for minimalism.

## Copy

- Default to the clearest three-second line: `Lock money. Show proof daily. Missed days go to charity.`
- Use Pact Raven language: pact, proof, record, witness, sign, locked, successful day, missed day, rejected day, forfeited, refund credit, the Raven.
- Avoid generic habit-app copy like "great job", "you got this", "complete your task", "submit activity", or broad motivational text.
- Prefer short, concrete labels over paragraphs.
- If the same idea appears twice on one screen, remove one.
- Prefer `Show proof` over `Submit proof`.

## Accessibility And Polish

- Icon-only actions need accessibility labels.
- Web focus states must stay visible.
- Use `…` instead of `...` in loading copy.
- Text must fit its container on mobile and desktop.
- No screen should have more than one primary CTA unless there is a strong product reason.

## Pre-Ship Check

- Does the screen feel sparse enough?
- Is there only one primary action?
- Is any text duplicated nearby?
- Are surfaces neutral grey, not yellow tinted?
- Does the user know what to do without reading a paragraph?
- Would a viewer understand the core model in three seconds of a Reel or TikTok?
- Are legal/payment/proof claims still accurate?
