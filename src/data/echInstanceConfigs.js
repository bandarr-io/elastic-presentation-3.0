/* ============================================================
   echInstanceConfigs
   Elastic Cloud Hosted (ECH) instance configurations per cloud provider,
   extracted from the Elastic docs so the sizing calculator can design
   clusters from what ECH actually offers:

   - https://www.elastic.co/docs/reference/cloud/cloud-hosted/aws-default
   - https://www.elastic.co/docs/reference/cloud/cloud-hosted/gcp-default-provider
   - https://www.elastic.co/docs/reference/cloud/cloud-hosted/azure-default
   - https://www.elastic.co/docs/reference/cloud/cloud-hosted/ec-regions-templates-instances
     (source of the per-node RAM size ladders, published in MB)

   Per config: `diskRatio` is disk GB per GB of RAM (the docs call it an
   estimation), `cpuPerGB` is the published vCPU/RAM decimal, and `sizes` is
   the per-node RAM ladder in GB — a node scales up this ladder and the tier
   scales out past the top rung. Current-generation configs only (no
   deprecated variants). The docs publish no disk ratio for master/Kibana
   configs, so those carry `diskRatio: null`.

   Each role lists its configs in preference order; the first entry available
   in the chosen region is what the sizing uses (hot defaults to the Storage
   Optimized profile).

   Regions come from the per-region instance lists on the
   ec-regions-templates-instances page. A config without a `regions` field is
   offered in every region of its provider; otherwise `regions` names where
   it exists (mostly the newest hot-tier hardware and, on AWS, the c-family
   master/Kibana generations and the c5d/m5dn ML split). The RAM ladders are
   identical across regions.
   ============================================================ */

/* Region ids follow the docs' own anchors (AWS's oldest regions predate its
   `aws-` prefix). Labels are the docs' city names. */
export const ECH_REGIONS = {
  aws: [
    ["us-east-1", "N. Virginia (us-east-1)"],
    ["aws-us-east-2", "Ohio (us-east-2)"],
    ["us-west-1", "N. California (us-west-1)"],
    ["us-west-2", "Oregon (us-west-2)"],
    ["us-gov-east-1", "US East GovCloud (us-gov-east-1)"],
    ["aws-ca-central-1", "Canada (ca-central-1)"],
    ["sa-east-1", "Sao Paulo (sa-east-1)"],
    ["eu-west-1", "Ireland (eu-west-1)"],
    ["aws-eu-west-2", "London (eu-west-2)"],
    ["aws-eu-west-3", "Paris (eu-west-3)"],
    ["aws-eu-central-1", "Frankfurt (eu-central-1)"],
    ["aws-eu-central-2", "Zurich (eu-central-2)"],
    ["aws-eu-north-1", "Stockholm (eu-north-1)"],
    ["aws-eu-south-1", "Milan (eu-south-1)"],
    ["aws-af-south-1", "Cape Town (af-south-1)"],
    ["aws-me-south-1", "Bahrain (me-south-1)"],
    ["aws-ap-east-1", "Hong Kong (ap-east-1)"],
    ["ap-northeast-1", "Tokyo (ap-northeast-1)"],
    ["aws-ap-northeast-2", "Seoul (ap-northeast-2)"],
    ["aws-ap-south-1", "Mumbai (ap-south-1)"],
    ["ap-southeast-1", "Singapore (ap-southeast-1)"],
    ["ap-southeast-2", "Sydney (ap-southeast-2)"],
  ],
  gcp: [
    ["gcp-us-central1", "Iowa (us-central1)"],
    ["gcp-us-east1", "South Carolina (us-east1)"],
    ["gcp-us-east4", "N. Virginia (us-east4)"],
    ["gcp-us-west1", "Oregon (us-west1)"],
    ["gcp-northamerica-northeast1", "Montreal (northamerica-northeast1)"],
    ["gcp-southamerica-east1", "Sao Paulo (southamerica-east1)"],
    ["gcp-europe-north1", "Finland (europe-north1)"],
    ["gcp-europe-west1", "Belgium (europe-west1)"],
    ["gcp-europe-west2", "London (europe-west2)"],
    ["gcp-europe-west3", "Frankfurt (europe-west3)"],
    ["gcp-europe-west4", "Netherlands (europe-west4)"],
    ["gcp-europe-west9", "Paris (europe-west9)"],
    ["gcp-me-west1", "Tel Aviv (me-west1)"],
    ["gcp-asia-east1", "Taiwan (asia-east1)"],
    ["gcp-asia-northeast1", "Tokyo (asia-northeast1)"],
    ["gcp-asia-northeast3", "Seoul (asia-northeast3)"],
    ["gcp-asia-south1", "Mumbai (asia-south1)"],
    ["gcp-asia-southeast1", "Singapore (asia-southeast1)"],
    ["gcp-asia-southeast2", "Jakarta (asia-southeast2)"],
    ["gcp-australia-southeast1", "Sydney (australia-southeast1)"],
  ],
  azure: [
    ["azure-eastus", "Virginia (eastus)"],
    ["azure-eastus2", "Virginia (eastus2)"],
    ["azure-centralus", "Iowa (centralus)"],
    ["azure-southcentralus", "Texas (southcentralus)"],
    ["azure-westus2", "Washington (westus2)"],
    ["azure-canadacentral", "Toronto (canadacentral)"],
    ["azure-brazilsouth", "Sao Paulo (brazilsouth)"],
    ["azure-northeurope", "Ireland (northeurope)"],
    ["azure-uksouth", "London (uksouth)"],
    ["azure-francecentral", "Paris (francecentral)"],
    ["azure-westeurope", "Netherlands (westeurope)"],
    ["azure-southafricanorth", "Johannesburg (southafricanorth)"],
    ["azure-centralindia", "Pune (centralindia)"],
    ["azure-japaneast", "Tokyo (japaneast)"],
    ["azure-southeastasia", "Singapore (southeastasia)"],
    ["azure-australiaeast", "New South Wales (australiaeast)"],
  ],
};

/* Where the region-limited hardware lives (from the per-region lists). */
const AWS_I8G = ["us-east-1", "aws-us-east-2", "us-west-2", "aws-ca-central-1", "sa-east-1",
  "eu-west-1", "aws-eu-west-2", "aws-eu-north-1", "ap-northeast-1", "aws-ap-northeast-2",
  "aws-ap-south-1", "ap-southeast-1", "ap-southeast-2"];
const AWS_M6GD = ["us-east-1", "aws-us-east-2", "us-west-1", "us-west-2", "eu-west-1",
  "aws-eu-west-2", "aws-eu-central-1", "aws-eu-central-2", "aws-eu-north-1",
  "ap-northeast-1", "aws-ap-south-1", "ap-southeast-1", "ap-southeast-2"];
const AWS_C8GD = ["us-east-1", "aws-us-east-2", "us-west-2", "aws-ca-central-1",
  "aws-eu-west-2", "aws-eu-central-1", "ap-northeast-1", "ap-southeast-2"];
const AWS_R6GD = ["us-east-1", "aws-us-east-2", "us-west-1", "us-west-2", "aws-ca-central-1",
  "eu-west-1", "aws-eu-central-1", "aws-eu-west-3", "ap-northeast-1", "aws-ap-south-1",
  "ap-southeast-1", "ap-southeast-2"];
const AWS_C6GD = ["us-east-1", "aws-us-east-2", "us-west-1", "us-west-2", "aws-ca-central-1",
  "sa-east-1", "eu-west-1", "aws-eu-west-2", "aws-eu-west-3", "aws-eu-central-1",
  "aws-eu-central-2", "aws-eu-north-1", "ap-northeast-1", "aws-ap-south-1",
  "ap-southeast-1", "ap-southeast-2"];
const AWS_COMMERCIAL = ECH_REGIONS.aws.map(([id]) => id).filter((id) => id !== "us-gov-east-1");
const AWS_GOVCLOUD = ["us-gov-east-1"];
const GCP_C4A = ["gcp-us-central1", "gcp-us-east1", "gcp-us-east4", "gcp-europe-west2",
  "gcp-europe-west3", "gcp-europe-west4", "gcp-asia-east1", "gcp-asia-southeast1"];
/* The Azure family matrix carves Lsv3 out of two regions, even though the
   per-region lists still show it there; trust the explicit statement. */
const AZURE_LSV3 = ECH_REGIONS.azure.map(([id]) => id)
  .filter((id) => id !== "azure-centralus" && id !== "azure-southafricanorth");

const GB_1_TO_60 = [1, 2, 4, 8, 15, 30, 60];
const GB_2_TO_60 = [2, 4, 8, 15, 30, 60];
const GB_4_TO_60 = [4, 8, 15, 30, 60];
const GB_1_TO_64 = [1, 2, 4, 8, 16, 32, 64];
const GB_2_TO_64 = [2, 4, 8, 16, 32, 64];
const GB_4_TO_64 = [4, 8, 16, 32, 64];
const KIBANA_GB = [1, 2, 4, 8];

export const ECH_PROVIDERS = {
  aws: {
    label: "Elastic Cloud — AWS",
    configs: {
      hot: [
        { id: "aws.es.datahot.i8g",   family: "i8g (Graviton4)", profile: "Storage Optimized",  diskRatio: 27, cpuPerGB: 0.133, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_I8G },
        { id: "aws.es.datahot.i3en",  family: "i3en",            profile: "Storage Optimized (Dense)", diskRatio: 74, cpuPerGB: 0.133, storage: "NVMe", sizes: GB_1_TO_60 },
        { id: "aws.es.datahot.m6gd",  family: "m6gd",            profile: "General Purpose",    diskRatio: 15, cpuPerGB: 0.267, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_M6GD },
        { id: "aws.es.datahot.c8gd",  family: "c8gd (Graviton4)", profile: "CPU Optimized",     diskRatio: 27, cpuPerGB: 0.533, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_C8GD },
        { id: "aws.es.datahot.r6gd",  family: "r6gd",            profile: "Vector Search Optimized", diskRatio: 6, cpuPerGB: 0.133, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_R6GD },
      ],
      warm:   [{ id: "aws.es.datawarm.i3en",   family: "i3en", diskRatio: 74, cpuPerGB: 0.133, storage: "NVMe", sizes: GB_2_TO_60 }],
      cold:   [{ id: "aws.es.datacold.i3en",   family: "i3en", diskRatio: 74, cpuPerGB: 0.133, storage: "NVMe", sizes: GB_2_TO_60 }],
      frozen: [{ id: "aws.es.datafrozen.i3en", family: "i3en", diskRatio: 74, cpuPerGB: 0.133, storage: "NVMe", sizes: GB_4_TO_60 }],
      /* Masters and Kibana ride AWS's c-family generations, so the pick walks
         newest to oldest until one exists in the region (Graviton4 c8gd,
         Graviton2 c6gd, Intel c5d everywhere commercial, Graviton3 c7gd in
         GovCloud). */
      master: [
        { id: "aws.es.master.c8gd", family: "c8gd", diskRatio: null, cpuPerGB: 0.533, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_C8GD },
        { id: "aws.es.master.c6gd", family: "c6gd", diskRatio: null, cpuPerGB: 0.533, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_C6GD },
        { id: "aws.es.master.c5d",  family: "c5d",  diskRatio: null, cpuPerGB: 0.529, storage: "NVMe", sizes: [1, 2, 4, 8, 17, 32, 64], regions: AWS_COMMERCIAL },
        { id: "aws.es.master.c7gd", family: "c7gd", diskRatio: null, cpuPerGB: 0.533, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_GOVCLOUD },
      ],
      kibana: [
        { id: "aws.kibana.c8gd", family: "c8gd", diskRatio: null, cpuPerGB: 0.533, storage: "NVMe", sizes: KIBANA_GB, regions: AWS_C8GD },
        { id: "aws.kibana.c6gd", family: "c6gd", diskRatio: null, cpuPerGB: 0.533, storage: "NVMe", sizes: KIBANA_GB, regions: AWS_C6GD },
        { id: "aws.kibana.c5d",  family: "c5d",  diskRatio: null, cpuPerGB: 0.529, storage: "NVMe", sizes: KIBANA_GB, regions: AWS_COMMERCIAL },
        { id: "aws.kibana.c7gd", family: "c7gd", diskRatio: null, cpuPerGB: 0.533, storage: "NVMe", sizes: KIBANA_GB, regions: AWS_GOVCLOUD },
      ],
      /* ML has a single config per region, but AWS splits it like the masters:
         the per-region lists show c5d everywhere commercial and m5dn only in
         GovCloud (the AWS-default family matrix lists both as if universal —
         the per-region lists win). c5d rides a 64 GB-topped ladder, m5dn a
         60 GB one. The docs publish no disk ratio for ML configs. */
      ml: [
        { id: "aws.es.ml.c5d",  family: "c5d",  diskRatio: null, cpuPerGB: 0.529, storage: "NVMe", sizes: GB_1_TO_64, regions: AWS_COMMERCIAL },
        { id: "aws.es.ml.m5dn", family: "m5dn", diskRatio: null, cpuPerGB: 0.267, storage: "NVMe", sizes: GB_1_TO_60, regions: AWS_GOVCLOUD },
      ],
    },
    /* Logstash is self-managed even next to an ECH deployment; suggest plain
       compute boxes from the same cloud. */
    logstash: [
      { ram: 8,  instance: "c6i.xlarge",  cpu: 4,  disk: "EBS gp3" },
      { ram: 16, instance: "c6i.2xlarge", cpu: 8,  disk: "EBS gp3" },
      { ram: 32, instance: "c6i.4xlarge", cpu: 16, disk: "EBS gp3" },
    ],
  },

  gcp: {
    label: "Elastic Cloud — GCP",
    configs: {
      hot: [
        { id: "gcp.es.datahot.n2.68x10x45", family: "N2",  profile: "Storage Optimized",         diskRatio: 45, cpuPerGB: 0.156, storage: "NVMe", sizes: GB_1_TO_64 },
        { id: "gcp.es.datahot.n2.68x10x95", family: "N2",  profile: "Storage Optimized (Dense)", diskRatio: 95, cpuPerGB: 0.156, storage: "NVMe", sizes: GB_1_TO_64 },
        { id: "gcp.es.datahot.n2.68x16x45", family: "N2",  profile: "General Purpose",           diskRatio: 45, cpuPerGB: 0.25,  storage: "NVMe", sizes: GB_1_TO_64 },
        { id: "gcp.es.datahot.n2.68x32x45", family: "N2",  profile: "CPU Optimized",             diskRatio: 45, cpuPerGB: 0.5,   storage: "NVMe", sizes: GB_1_TO_64 },
        { id: "gcp.es.datahot.c4a.highcpu", family: "C4a (ARM)", profile: "CPU Optimized (ARM)", diskRatio: 35, cpuPerGB: 0.533, storage: "NVMe", sizes: GB_1_TO_60, regions: GCP_C4A },
      ],
      warm:   [{ id: "gcp.es.datawarm.n2.68x10x190",  family: "N2", diskRatio: 190, cpuPerGB: 0.156, storage: "HDD",  sizes: GB_2_TO_64 }],
      cold:   [{ id: "gcp.es.datacold.n2.68x10x190",  family: "N2", diskRatio: 190, cpuPerGB: 0.156, storage: "HDD",  sizes: GB_2_TO_64 }],
      frozen: [{ id: "gcp.es.datafrozen.n2.68x10x90", family: "N2", diskRatio: 90,  cpuPerGB: 0.156, storage: "NVMe", sizes: GB_4_TO_64 }],
      master: [{ id: "gcp.es.master.n2.68x32x45",     family: "N2", diskRatio: null, cpuPerGB: 0.5,  storage: "NVMe", sizes: GB_1_TO_64 }],
      ml:     [{ id: "gcp.es.ml.n2.68x32x45",         family: "N2", diskRatio: null, cpuPerGB: 0.5,  storage: "NVMe", sizes: GB_1_TO_64 }],
      kibana: [{ id: "gcp.kibana.n2.68x32x45",        family: "N2", diskRatio: null, cpuPerGB: 0.5,  storage: "NVMe", sizes: KIBANA_GB }],
    },
    logstash: [
      { ram: 8,  instance: "n2-standard-2", cpu: 2, disk: "PD-SSD" },
      { ram: 16, instance: "n2-standard-4", cpu: 4, disk: "PD-SSD" },
      { ram: 32, instance: "n2-standard-8", cpu: 8, disk: "PD-SSD" },
    ],
  },

  azure: {
    label: "Elastic Cloud — Azure",
    configs: {
      hot: [
        { id: "azure.es.datahot.edsv4", family: "Edsv4", profile: "Storage Optimized",       diskRatio: 35, cpuPerGB: 0.133, storage: "SSD",  sizes: GB_1_TO_60 },
        { id: "azure.es.datahot.ddv4",  family: "Ddv4",  profile: "General Purpose",         diskRatio: 35, cpuPerGB: 0.267, storage: "SSD",  sizes: GB_1_TO_60 },
        { id: "azure.es.datahot.fsv2",  family: "Fsv2",  profile: "CPU Optimized",           diskRatio: 35, cpuPerGB: 0.533, storage: "SSD",  sizes: GB_1_TO_60 },
        { id: "azure.es.datahot.lsv3",  family: "Lsv3",  profile: "Vector Search Optimized", diskRatio: 28, cpuPerGB: 0.133, storage: "NVMe", sizes: GB_1_TO_60, regions: AZURE_LSV3 },
      ],
      warm:   [{ id: "azure.es.datawarm.edsv4",   family: "Edsv4", diskRatio: 200, cpuPerGB: 0.133, storage: "HDD", sizes: GB_2_TO_60 }],
      cold:   [{ id: "azure.es.datacold.edsv4",   family: "Edsv4", diskRatio: 200, cpuPerGB: 0.133, storage: "HDD", sizes: GB_2_TO_60 }],
      frozen: [{ id: "azure.es.datafrozen.edsv4", family: "Edsv4", diskRatio: 90,  cpuPerGB: 0.133, storage: "SSD", sizes: GB_4_TO_60 }],
      master: [{ id: "azure.es.master.fsv2",      family: "Fsv2",  diskRatio: null, cpuPerGB: 0.533, storage: "SSD", sizes: GB_1_TO_60 }],
      ml:     [{ id: "azure.es.ml.fsv2",          family: "Fsv2",  diskRatio: null, cpuPerGB: 0.533, storage: "SSD", sizes: GB_1_TO_60 }],
      kibana: [{ id: "azure.kibana.fsv2",         family: "Fsv2",  diskRatio: null, cpuPerGB: 0.533, storage: "SSD", sizes: KIBANA_GB }],
    },
    logstash: [
      { ram: 8,  instance: "F4s v2",  cpu: 4,  disk: "Premium SSD" },
      { ram: 16, instance: "F8s v2",  cpu: 8,  disk: "Premium SSD" },
      { ram: 32, instance: "F16s v2", cpu: 16, disk: "Premium SSD" },
    ],
  },
};

const inRegion = (config, region) =>
  !region || !config.regions || config.regions.includes(region);

/* The config for a role, or null when the provider isn't an ECH one
   (self-managed). A region narrows the candidates to what's offered there;
   only the hot tier offers a choice of hardware profiles, and an unknown or
   absent profile — and every other role — falls back to the first available
   (default) config. */
export function echConfig(provider, role, profile, region) {
  const configs = ECH_PROVIDERS[provider]?.configs?.[role];
  if (!configs) return null;
  const avail = configs.filter((c) => inRegion(c, region));
  return (profile && avail.find((c) => c.profile === profile)) || avail[0] || configs[0];
}

/* Hot-tier hardware profile names for a provider's picker — only the ones
   the chosen region offers. [] off ECH. */
export function echProfiles(provider, region) {
  return (ECH_PROVIDERS[provider]?.configs?.hot || [])
    .filter((c) => inRegion(c, region))
    .map((c) => c.profile);
}

/* Round RAM up the config's per-node ladder; past the top rung, the tier
   scales out with more nodes instead. */
export function snapToLadder(sizes, ramGB) {
  return sizes.find((s) => s >= ramGB) || sizes[sizes.length - 1];
}
