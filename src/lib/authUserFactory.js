// Builds persisted auth user records with a consistent default profile shape.

export const createDefaultUserProfile = (now = new Date().toISOString()) => ({
  shares: 0,
  avgCost: 0,
  acquisitionDate: null,
  lots: [],
  transactions: [],
  updatedAt: now,
});

export const createRegisteredUser = ({
  email,
  firstName,
  lastName,
  passwordHash,
  isAdmin = false,
  now = new Date().toISOString(),
}) => ({
  email,
  firstName,
  lastName,
  passwordHash,
  createdAt: now,
  updatedAt: now,
  isSubscriber: false,
  isAdmin,
  notifications: {
    athEmail: false,
  },
  profile: createDefaultUserProfile(now),
});
