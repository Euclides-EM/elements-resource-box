const normalizeBasePath = (value?: string): string => {
  const raw = (value ?? "").trim();
  if (!raw || raw === "/") {
    return "/";
  }
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
};

export const getBasePath = (): string =>
  normalizeBasePath(process.env.VITE_BASE_PATH ?? process.env.BASE_PATH ?? "/");

export const stripBasePath = (url: string): string => {
  const base = getBasePath();
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;

  if (base === "/") {
    return normalizedUrl;
  }

  const baseNoTrailing = base.slice(0, -1);
  if (normalizedUrl === baseNoTrailing) {
    return "/";
  }

  if (normalizedUrl.startsWith(base)) {
    const remainder = normalizedUrl.slice(base.length - 1);
    return remainder.startsWith("/") ? remainder : `/${remainder}`;
  }

  return normalizedUrl;
};

export const isUnderBasePath = (url: string): boolean => {
  const base = getBasePath();
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  if (base === "/") {
    return true;
  }
  const baseNoTrailing = base.slice(0, -1);
  return normalizedUrl === baseNoTrailing || normalizedUrl.startsWith(base);
};
