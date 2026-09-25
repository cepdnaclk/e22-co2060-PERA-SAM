export function validateProfile(fullName: string, phone: string) {
  const name = fullName.trim();
  const contactPhone = phone.trim();
  if (!name || name.length > 80) return 'profileNameInvalid' as const;
  if (contactPhone && (!/^\+?[\d\s().-]+$/.test(contactPhone) ||
    contactPhone.replace(/\D/g, '').length < 7 ||
    contactPhone.replace(/\D/g, '').length > 15)) {
    return 'profilePhoneInvalid' as const;
  }
  return null;
}
