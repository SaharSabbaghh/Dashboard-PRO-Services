/**
 * Types and utilities for payment-based conversions
 */

export interface RawPayment {
  PAYMENT_TYPE: string;
  CREATION_DATE: string; // "2026-01-14 14:22:31.000"
  CONTRACT_ID: string;
  CLIENT_ID: string;
  STATUS: string; // "RECEIVED", "PRE_PDP", etc.
  DATE_OF_PAYMENT: string; // "2026-01-14"
  AMOUNT_OF_PAYMENT?: string | number; // Payment amount (optional for backward compatibility)
}

export interface ProcessedPayment {
  paymentType: string;
  creationDate: string;
  contractId: string;
  clientId: string;
  status: 'received' | 'pre_pdp' | 'other';
  dateOfPayment: string; // ISO date string "2026-01-14"
  service: 'oec' | 'owwa' | 'travel_visa' | 'other';
  amountOfPayment: number; // Parsed payment amount (0 if not provided)
}

export interface PaymentData {
  uploadDate: string;
  totalPayments: number;
  receivedPayments: number;
  payments: ProcessedPayment[];
}

/**
 * Maps payment types to P&L services
 */
export const PAYMENT_TYPE_MAP: Record<string, 'oec' | 'owwa' | 'travel_visa' | 'other'> = {
  // OEC payments
  "the maid's overseas employment certificate": 'oec',
  'overseas employment certificate': 'oec',
  'oec': 'oec',
  "the maid's contract verification": 'oec', // Contract verification = OEC
  'contract verification': 'oec',
  
  // OWWA payments
  'owwa registration': 'owwa',
  'owwa': 'owwa',
  
  // Travel Visa payments (all countries)
  'travel to lebanon visa': 'travel_visa',
  'travel to egypt visa': 'travel_visa',
  'travel to jordan visa': 'travel_visa',
  'travel to morocco visa': 'travel_visa',
  'travel to turkey visa': 'travel_visa',
  'travel to philippines visa': 'travel_visa',
  'travel visa': 'travel_visa',
  'visa': 'travel_visa',
};

/**
 * Maps payment type string to service category
 */
export function mapPaymentTypeToService(paymentType: string): 'oec' | 'owwa' | 'travel_visa' | 'other' {
  const normalized = paymentType.toLowerCase().trim();
  
  // Direct match
  if (PAYMENT_TYPE_MAP[normalized]) {
    return PAYMENT_TYPE_MAP[normalized];
  }
  
  // Fuzzy matching for common variations
  if (normalized.includes('oec') || normalized.includes('employment certificate') || normalized.includes('contract verification')) {
    return 'oec';
  }
  
  if (normalized.includes('owwa')) {
    return 'owwa';
  }
  
  if (normalized.includes('visa') || normalized.includes('travel to')) {
    return 'travel_visa';
  }
  
  return 'other';
}

/**
 * Normalizes payment status
 */
export function normalizePaymentStatus(status: string): 'received' | 'pre_pdp' | 'other' {
  const normalized = status.toLowerCase().trim();
  
  if (normalized === 'received') {
    return 'received';
  }
  
  if (normalized === 'pre_pdp') {
    return 'pre_pdp';
  }
  
  return 'other';
}

/**
 * Parses payment amount from string or number
 */
export function parsePaymentAmount(amount?: string | number): number {
  if (amount === undefined || amount === null || amount === '') {
    return 0;
  }
  
  if (typeof amount === 'number') {
    return amount;
  }
  
  // Remove any currency symbols, commas, spaces
  const cleaned = String(amount).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

