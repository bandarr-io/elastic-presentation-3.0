/* ============================================================
   The curated Elastic corpus: the guidance the AI is allowed to cite.

   Versioned in the repo on purpose. It is reviewable in a pull request, it
   works with no network and no deployment, and it stays the source of truth
   even once the same passages are pushed into Elasticsearch — the index
   becomes a serving layer over this, not a second copy that drifts.

   Every passage carries a `source`, because a claim the user cannot trace
   back is worth no more than one the model invented.
   ============================================================ */

import { SIZING_PASSAGES } from "./sizing";
import { TIER_PASSAGES } from "./tiers";
import { ARCHITECTURE_PASSAGES } from "./architectures";
import { REVIEW_PASSAGES } from "./review";
import { LICENSING_PASSAGES } from "./licensing";
import { buildIndex } from "../../utils/whiteboardKnowledge";

/* Bumped when passages change, so an Elasticsearch index built from this
   corpus can be compared against the repo it came from. */
export const KNOWLEDGE_VERSION = 1;

/* The tag every curated passage carries, which is what separates Elastic's
   recommendation from the customer's requirement at retrieval time. */
export const SCOPE_ELASTIC = "elastic";
export const SCOPE_CUSTOMER = "customer";

export const ELASTIC_CORPUS = [
  ...SIZING_PASSAGES,
  ...TIER_PASSAGES,
  ...ARCHITECTURE_PASSAGES,
  ...REVIEW_PASSAGES,
  ...LICENSING_PASSAGES,
];

/* Tokenising the corpus is the expensive part of a search and it never
   changes, so it happens once per session rather than once per question. */
let cached = null;
export const elasticIndex = () => (cached ||= buildIndex(ELASTIC_CORPUS));
