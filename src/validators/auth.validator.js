/**
 * Mirrors the backend's Zod rules so the user gets told before a round trip.
 * The server validates again regardless — this is convenience, not enforcement.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9]{10,15}$/;

export function validateLogin({ email, password }) {
  const errors = {};
  if (!email?.trim()) errors.email = 'Email is required';
  else if (!EMAIL.test(email.trim())) errors.email = 'Enter a valid email address';
  if (!password) errors.password = 'Password is required';
  return errors;
}

export function validateRegister(values) {
  const errors = {};

  if (!values.name?.trim()) errors.name = 'Name is required';
  else if (values.name.trim().length < 2) errors.name = 'Name is too short';

  if (!values.email?.trim()) errors.email = 'Email is required';
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Enter a valid email address';

  if (!values.phone?.trim()) errors.phone = 'Phone number is required';
  else if (!PHONE.test(values.phone.trim())) errors.phone = 'Enter a 10 to 15 digit phone number';

  const weak = passwordProblem(values.password);
  if (weak) errors.password = weak;

  if (values.confirmPassword !== undefined) {
    if (!values.confirmPassword) errors.confirmPassword = 'Type your password again';
    else if (values.confirmPassword !== values.password) errors.confirmPassword = 'These do not match';
  }

  if (values.role === 'rider') {
    if (!values.vehicle?.type) errors['vehicle.type'] = 'Choose a vehicle type';
    if (!values.vehicle?.numberPlate?.trim()) errors['vehicle.numberPlate'] = 'Number plate is required';
    else if (values.vehicle.numberPlate.trim().length < 4)
      errors['vehicle.numberPlate'] = 'Number plate looks too short';

    if (!values.licence?.number?.trim()) errors['licence.number'] = 'Licence number is required';
    else if (values.licence.number.trim().length < 5)
      errors['licence.number'] = 'Licence number looks too short';
  }

  return errors;
}

/**
 * The first rule a password fails, or null.
 *
 * The same five the backend enforces, in the same order, so the message the
 * user sees before submitting is the message they would have got after. One at
 * a time rather than all five at once — the checklist beside the field shows
 * the full picture; this is for the field's own error slot.
 */
export function passwordProblem(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Use at least 8 characters';
  if (!/[a-z]/.test(password)) return 'Include a lowercase letter';
  if (!/[A-Z]/.test(password)) return 'Include an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Include a number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Include a symbol';
  return null;
}

export const hasErrors = (errors) => Object.keys(errors).length > 0;
