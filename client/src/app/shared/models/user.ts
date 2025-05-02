export interface User {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    appUserId?: string;
    internalId?: number;
}