
import type { FieldPath, OrderByDirection } from "firebase/firestore";
import type { PaymentTerms } from "./pos"; // Assuming PaymentTerms will be in pos.ts

export interface QueryOptions {
    limit?: number;
    orderByField?: string | FieldPath;
    orderDirection?: OrderByDirection;
    startDate?: Date;
    endDate?: Date;
    status?: 'completed' | 'returned' | 'all'; // For transactions
    paymentTerms?: PaymentTerms[]; // For transactions
}

export type PaymentMethod = 'cash' | 'card' | 'transfer'; // For general reporting, e.g. Sales Summary

    