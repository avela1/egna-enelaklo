import { z } from 'zod';
import { SUB_CITIES } from '../addresses';
import { EthiopicPhoneSchema, NameSchema } from './auth';

/** The address of a customer. */
export const AddressSchema = z.object({
  contactName: NameSchema,
  contactPhone: EthiopicPhoneSchema,
  directions: z.string().trim().min(1).max(400),
  isDefault: z.boolean().optional(),
  label: z.string().trim().min(1).max(40),
  landmark: z.string().trim().min(1).max(160),
  subCity: z.enum(SUB_CITIES),
  woreda: z.string().trim().max(60).optional().or(z.literal('')),
});
export type AddressValues = z.output<typeof AddressSchema>;
