import { z } from 'zod';

/** The languages the product ships with. */
export const LocaleSchema = z.enum(['en', 'am', 'om']);
export type Locale = z.infer<typeof LocaleSchema>;
export const LOCALES = LocaleSchema.options;

/** Account status. INVITED means the person has not set a password yet. */
export const UserStatusSchema = z.enum(['ACTIVE', 'DISABLED', 'INVITED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

/**
 * Validation messages are i18n keys so that the web app can translate them.
 * The API falls back to the English text in `VALIDATION_MESSAGES`.
 */
export const VALIDATION_MESSAGES = {
  'validation.required': 'This field is required',
  'validation.email': 'Enter a valid email address',
  'validation.nameTooShort': 'Your name must be at least 2 characters',
  'validation.nameTooLong': 'Your name must be 80 characters or fewer',
  'validation.passwordTooShort': 'Use at least 10 characters',
  'validation.passwordNeedsLetter': 'Use at least one letter',
  'validation.passwordNeedsNumber': 'Use at least one number',
  'validation.passwordsDoNotMatch': 'The two passwords do not match',
  'validation.phoneInvalid': 'Enter a valid Ethiopian phone number, for example +251911234567',
  'validation.termsRequired': 'You must accept the terms to continue',
  'validation.currentPasswordRequired': 'Enter your current password',
  'validation.invalid': 'This value is not valid',
  'validation.tooShort': 'This value is too short',
  'validation.tooLong': 'This value is too long',
  'validation.tooSmall': 'This value is too small',
  'validation.tooLarge': 'This value is too large',
  'validation.unknownField': 'This field is not part of the request',
  'validation.deadlineInFuture': 'The date has to be in the future',
  'validation.minRows': 'Add at least one row',
  'validation.maxRows': 'Too many rows',
} as const;

export type ValidationMessageKey = keyof typeof VALIDATION_MESSAGES;

export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const PASSWORD_MIN = 10;

/** A password needs 10+ characters, at least one letter and at least one number. */
export const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN, 'validation.passwordTooShort')
  .regex(/[A-Za-z]/, 'validation.passwordNeedsLetter')
  .regex(/[0-9]/, 'validation.passwordNeedsNumber');
export type PasswordValues = z.infer<typeof PasswordSchema>;

/**
 * Ethiopian phone numbers are stored in E.164 form: +2519XXXXXXXX.
 * The form accepts what a person naturally types and normalises it.
 */
export const EthiopicPhoneSchema = z
  .string()
  .trim()
  .transform((value) => {
    const digits = value.replace(/[\s()-]/g, '');

    if (digits === '') return '';
    if (digits.startsWith('+251')) return `+251${digits.slice(4)}`;
    if (digits.startsWith('00251')) return `+${digits.slice(2)}`;
    if (digits.startsWith('251')) return `+${digits}`;
    if (digits.startsWith('0')) return `+251${digits.slice(1)}`;

    return `+251${digits}`;
  })
  .refine((value) => value === '' || /^\+2519\d{8}$/.test(value), {
    message: 'validation.phoneInvalid',
  });

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'validation.required')
  .email('validation.email');

export const NameSchema = z
  .string()
  .trim()
  .min(NAME_MIN, 'validation.nameTooShort')
  .max(NAME_MAX, 'validation.nameTooLong');

/** Create a customer account. */
export const RegisterSchema = z.object({
  name: NameSchema,
  email: EmailSchema,
  phone: EthiopicPhoneSchema.optional().default(''),
  password: PasswordSchema,
  locale: LocaleSchema.default('en'),
  termsAccepted: z.boolean().refine((value) => value, 'validation.termsRequired'),
});
export type RegisterInput = z.input<typeof RegisterSchema>;
export type RegisterValues = z.output<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'validation.required'),
});
export type LoginInput = z.input<typeof LoginSchema>;
export type LoginValues = z.output<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
});
export type ForgotPasswordInput = z.input<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'validation.required'),
  password: PasswordSchema,
});
export type ResetPasswordInput = z.input<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, 'validation.required'),
});
export type VerifyEmailInput = z.input<typeof VerifyEmailSchema>;

/** Accept a staff invitation and set the password. */
export const AcceptInviteSchema = z.object({
  password: PasswordSchema,
  token: z.string().min(1, 'validation.required'),
});
export type AcceptInviteInput = z.input<typeof AcceptInviteSchema>;

export const ResendVerificationSchema = z.object({
  email: EmailSchema,
});
export type ResendVerificationInput = z.input<typeof ResendVerificationSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'validation.currentPasswordRequired'),
  newPassword: PasswordSchema,
});
export type ChangePasswordInput = z.input<typeof ChangePasswordSchema>;

/** Profile changes a user may make on their own account. */
export const UpdateProfileSchema = z.object({
  name: NameSchema.optional(),
  phone: EthiopicPhoneSchema.optional(),
  locale: LocaleSchema.optional(),
});
export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;
export type UpdateProfileValues = z.output<typeof UpdateProfileSchema>;

/** The user object the API returns. It never contains the password hash. */
export const MeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  locale: LocaleSchema,
  status: UserStatusSchema,
  emailVerified: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
  role: z.string(),
  permissions: z.array(z.string()),
});
export type Me = z.infer<typeof MeSchema>;
