/* The two metering models, matching the quote logic in romRows(). Constants
   come from the engine so the guidance and the arithmetic cannot diverge. */

import { RU_GB, RU_LIST_PRICE, ECU_LIST_PRICE } from "../../utils/whiteboardSizing";

export const LICENSING_PASSAGES = [
  {
    id: "licensing-models",
    title: "Two meters: resource units and consumption units",
    source: "Elastic pricing: subscription models",
    tags: ["elastic", "licensing", "pricing"],
    text: `Elastic bills the two deployment models on entirely different meters, and quoting one as though it were the other is a common and expensive mistake.

Self-managed, ECE, and ECK license capacity. An Enterprise subscription is measured in Enterprise Resource Units: total GB of RAM addressable by the software, divided by ${RU_GB}, with the remainder rounded up once against the total rather than per tier.

Elastic Cloud Hosted meters consumption. Usage across RAM-hours, data transfer, and snapshot storage converts into Elastic Consumption Units at a fixed rate of 1 ECU = $${ECU_LIST_PRICE}.00. The figure comes from the Cloud pricing calculator rather than from a node count, and discounts are negotiated against the credit purchase rather than that rate.`,
  },
  {
    id: "licensing-eru-detail",
    title: "How resource units are counted",
    source: "Elastic pricing: Enterprise Resource Units",
    tags: ["elastic", "licensing", "pricing", "eru"],
    text: `The unit is memory, deliberately decoupled from node count: the same ${RU_GB} GB buys one ${RU_GB} GB node or sixty-four 1 GB ones, so an architecture can be reshaped without renegotiating the licence.

Because the remainder rounds once against the total, summing rounded per-tier figures overstates the quantity. Add the memory first, then divide.

Logstash memory is excluded. Elastic counts it for information only, so a quote that bills resource units for Logstash is wrong in the customer's favour to notice and against them to send.

List price moves with the agreement. The current list figure this tool seeds is $${RU_LIST_PRICE.toLocaleString("en-US")} per unit on an annual term, and it is a starting point the account team edits, not a quote.`,
  },
  {
    id: "licensing-ecu-detail",
    title: "How consumption units behave",
    source: "Elastic pricing: Elastic Consumption Units",
    tags: ["elastic", "licensing", "pricing", "ecu"],
    text: `Consumption units are not derived from the architecture the way resource units are, which changes the conversation. A board can tell you the shape and size of a deployment; it cannot tell you the ECU figure, because that depends on hours run, data transferred, and snapshot storage held.

The practical path is to size the deployment first, put that configuration through the Elastic Cloud pricing calculator, and bring the resulting number back. Two deployments with identical topology can consume differently if one runs part-time or moves far more data between zones.

Anything that is not self-managed bills this way, including ECE and ECK deployments running on Elastic Cloud infrastructure.`,
  },
  {
    id: "licensing-rom",
    title: "What belongs on a rough order of magnitude",
    source: "Elastic field practice: ROM estimates",
    tags: ["elastic", "licensing", "pricing", "rom"],
    text: `A ROM from a whiteboard is one line, not a line per tier: a single quantity for the deployment on whichever meter applies, with the shape behind it stated in the description — total memory, node count, and storage.

It should carry the assumptions that produced it, because those are what change. Retention, replica count, and index overhead each move the number directly, and none of them is usually settled at whiteboard stage.

Multi-year estimates normally ramp: volume grows as more sources are onboarded, and price escalates by agreement. A flat three-year line implies a customer whose data never grows, which is rarely the one being sold to.`,
  },
];
