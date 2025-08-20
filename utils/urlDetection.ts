
export const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string.trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export const extractDomain = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
};

