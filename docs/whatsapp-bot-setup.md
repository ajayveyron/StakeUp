# WhatsApp Bot Setup Notes

## Current App State

- The app now stores a separate `users.whatsappNumber` value.
- Normal non-admin users must record a WhatsApp number after sign-in before entering the app.
- Users can update the WhatsApp number from Profile.
- Live WhatsApp sending is not enabled yet. The next step needs Meta or provider credentials and approved message templates.

## Recommended Provider Path

Use Meta WhatsApp Cloud API directly unless you want a managed BSP such as WATI, AiSensy, Twilio, or 360dialog to handle account setup, inbox tooling, and some template operations.

Direct Meta setup gives us the cleanest backend control for Pact Raven:

- Convex can own reminder scheduling.
- Convex HTTP actions can receive webhook events.
- Existing `notifications` and `notificationDeliveries` tables can be extended from `email` to `email | whatsapp`.
- The Expo app should never receive WhatsApp access tokens or sender secrets.

## What You Need To Create

1. Create or use a Meta Business portfolio in Meta Business Suite.
2. Create a Meta developer app and add the WhatsApp product.
3. Create or connect a WhatsApp Business Account, also called WABA.
4. Add a sender phone number for Pact Raven.
5. Complete phone verification and, before production messaging, complete the required business checks Meta asks for.
6. Generate a production access token through a system user, not the temporary test token.
7. Create a long random webhook verify token. This is a string we choose, then paste into Meta when registering the webhook.
8. Create and submit message templates for approval.
9. Give me the non-secret IDs and add the secrets to Convex env when we implement sending.

## Secrets And IDs We Will Need

Put these in Convex environment variables, not `EXPO_PUBLIC_*` variables:

```txt
WHATSAPP_PROVIDER=meta
WHATSAPP_GRAPH_API_VERSION=vXX.X
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=...
WHATSAPP_APP_SECRET=...
```

Notes:

- `WHATSAPP_ACCESS_TOKEN` is secret.
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` is secret-ish because it proves Meta webhook setup.
- `WHATSAPP_APP_SECRET` is needed to verify webhook signatures.
- `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_BUSINESS_ACCOUNT_ID` are not public app config, but they are less sensitive than the token.
- Do not put any of these in mobile client env vars.

## Templates To Prepare

Start with utility templates. Suggested template names:

- `pact_proof_due`: reminder that proof is due today.
- `pact_deadline_warning`: reminder near the user's proof deadline.
- `proof_under_review`: confirmation after proof is submitted.
- `proof_approved`: approved proof and refund credit update.
- `proof_rejected`: rejected proof with reason and forfeit note.
- `payout_requested`: manual payout request recorded.
- `payout_processed`: manual payout completed.

Keep template copy transactional, direct, and consistent with Pact Raven. Avoid broad marketing language in these templates.

## Webhook And Automation Shape

When we wire the notification flow, I expect to add:

- A Convex HTTP webhook route for Meta verification and webhook POST events.
- Signature validation using `WHATSAPP_APP_SECRET`.
- A WhatsApp send action that calls Graph API with `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN`.
- A `whatsapp` delivery channel in `notificationDeliveries`.
- Delivery status updates from Meta webhooks.
- Convex scheduled jobs for due-proof reminders and deadline-warning reminders.
- Template send helpers that choose the right approved template and language.

## Decisions I Need From You Later

- Which sender number should Pact Raven use?
- Should reminders go once per due day, twice per due day, or only near deadline?
- What is the default reminder time for workout pacts and content pacts?
- Should admins receive WhatsApp alerts too, or only users?
- Which languages should templates support first: English only, Hinglish, or Hindi too?
- Should users be able to opt out from WhatsApp while keeping in-app notifications?

## Useful Official References

- Meta Cloud API overview: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Meta app dashboard: https://developers.facebook.com/apps/
- WhatsApp Manager: https://business.facebook.com/wa/manage/home/
- Meta template docs: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/
- Meta webhook docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/
