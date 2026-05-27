/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as betaOps from "../betaOps.js";
import type * as checkIns from "../checkIns.js";
import type * as commitments from "../commitments.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_adminMetrics from "../lib/adminMetrics.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_charities from "../lib/charities.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_notifications from "../lib/notifications.js";
import type * as lib_pactPasses from "../lib/pactPasses.js";
import type * as lib_payments from "../lib/payments.js";
import type * as lib_proofUrls from "../lib/proofUrls.js";
import type * as lib_review from "../lib/review.js";
import type * as lib_slackText from "../lib/slackText.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as paymentsInternal from "../paymentsInternal.js";
import type * as reviews from "../reviews.js";
import type * as slack from "../slack.js";
import type * as users from "../users.js";
import type * as waitlist from "../waitlist.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  betaOps: typeof betaOps;
  checkIns: typeof checkIns;
  commitments: typeof commitments;
  crons: typeof crons;
  http: typeof http;
  "lib/adminMetrics": typeof lib_adminMetrics;
  "lib/auth": typeof lib_auth;
  "lib/charities": typeof lib_charities;
  "lib/dates": typeof lib_dates;
  "lib/ledger": typeof lib_ledger;
  "lib/notifications": typeof lib_notifications;
  "lib/pactPasses": typeof lib_pactPasses;
  "lib/payments": typeof lib_payments;
  "lib/proofUrls": typeof lib_proofUrls;
  "lib/review": typeof lib_review;
  "lib/slackText": typeof lib_slackText;
  notifications: typeof notifications;
  payments: typeof payments;
  paymentsInternal: typeof paymentsInternal;
  reviews: typeof reviews;
  slack: typeof slack;
  users: typeof users;
  waitlist: typeof waitlist;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
