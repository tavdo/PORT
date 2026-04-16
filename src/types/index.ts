export interface ShipData {
  imo: string;
  name: string;
  vesselType: string;
  grossTonnage: number;
  length: number;
  width: number;
  draft: number;
}

export interface ChargeLineItem {
  key: string;
  label: string;
  amountUSD: number;
  calculationMethod?: string;
  group?: string;
  gelAmount?: number;
}

export interface ChargeSection {
  id: string;
  title: string;
  items: ChargeLineItem[];
}

export interface VoyageInfo {
  addressTo?: string;
  cargoDescription?: string;
  cargoQty?: string;
  activityRef?: string;
  port?: string;
  documentDate?: string;
  arrival?: string;
  departure?: string;
  fdaNumber?: string;
}

export interface CalculateRequestBody {
  imo: string;
  hours: number;
  usdToGel: number;
  /** Used with DB-configured cargo per-ton rate */
  cargoWeightTn?: number;
  reducedGrt?: number;
  depthM?: number;
  nightPilotIn?: boolean;
  nightPilotOut?: boolean;
  holidayTowageOut?: boolean;
  holidayMooringIn?: boolean;
  holidayMooringOut?: boolean;
  freshWaterTn?: number;
  anchorageDays?: number;
  includeCertificates?: boolean;
  voyage?: VoyageInfo;
  lineOverrides?: Record<string, number>;
}

export interface FdaRequestBody extends CalculateRequestBody {
  fdaNumber?: string;
  fdaDate?: string;
  arrival?: string;
  departure?: string;
  advanceReceivedUsd?: number;
}

export interface CalculateResponse {
  kind: "pda" | "fda";
  ship: {
    name: string;
    type: string;
    grt: number;
    reducedGrt: number;
    length: number;
    width: number;
    depthM: number;
    lbd: number;
  };
  voyage?: VoyageInfo;
  charges: {
    sections: ChargeSection[];
    port: ChargeLineItem[];
    nonPort: ChargeLineItem[];
  };
  totalUSD: number;
  totalGEL: number;
  fda?: {
    advanceReceivedUsd: number;
    balanceUsd: number;
  };
  meta: {
    model: string;
    tariffFile: string;
  };
}

/** @deprecated legacy env-based lump sums */
export interface PricingConfig {
  tonnagePerGrtUsd: number;
  berth: number;
  towageIn: number;
  towageOut: number;
  mooringIn: number;
  mooringOut: number;
  sanitary: number;
  watchman: number;
  positionInternet: number;
  monitoring: number;
  lightDues: number;
  pilotageIn: number;
  pilotageOut: number;
  agencyFee: number;
  clearance: number;
  pollutionRatePerGrt: number;
}
