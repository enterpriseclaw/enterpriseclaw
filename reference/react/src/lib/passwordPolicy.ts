export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include at least one uppercase letter, one lowercase letter, and one number';

const hasUppercase = /[A-Z]/;
const hasLowercase = /[a-z]/;
const hasNumber = /[0-9]/;

export function isPasswordValid(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    hasUppercase.test(password) &&
    hasLowercase.test(password) &&
    hasNumber.test(password)
  );
}
