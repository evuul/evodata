// Defines when a below-the-fold section should leave its lightweight placeholder.

export const shouldShowDeferredContent = ({ observerSupported, isIntersecting }) =>
  !observerSupported || Boolean(isIntersecting);
