function stripDiacritics(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeTextForSearch(text) {
  if (!text) return "";

  let normalized = text
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();

  normalized = stripDiacritics(normalized);

  normalized = normalized
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/[''´`]/g, "'")
    .replace(/[""„"]/g, '"')
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/…/g, "...")
    .replace(/-/g, "");

  return normalized;
}

function searchWithSpecialChars(searchTerm, text) {
  if (!searchTerm || !text) {
    return false;
  }

  const normalizedSearchTerm = normalizeTextForSearch(searchTerm);
  const normalizedText = normalizeTextForSearch(text);

  if (!normalizedSearchTerm.includes('u') && !normalizedSearchTerm.includes('v')) {
    return normalizedText.includes(normalizedSearchTerm);
  }

  const pattern = normalizedSearchTerm.replace(/[uv]/g, "[uv]");
  try {
    const searchRegex = new RegExp(pattern, "i");
    return searchRegex.test(normalizedText);
  } catch {
    return normalizedText.includes(normalizedSearchTerm);
  }
}

function filterRecord(t, range, filters, filtersInclude, includeUndated, textSearch, textSearchFields, NO_CITY) {
  if (textSearch && textSearchFields.length > 0) {
    const matchesText = textSearchFields.some((field) => {
      const value = t[field];
      if (!value || typeof value !== "string") {
        return false;
      }
      return searchWithSpecialChars(textSearch, value);
    });
    if (!matchesText) return false;
  }

  const year = t.year ? parseInt(t.year.split("/")[0]) : null;
  if (range[0] > 0 && range[1] > 0) {
    if (!year) {
      return includeUndated;
    }
    if (year < range[0] || year > range[1]) {
      return false;
    }
  }

  const fields = Object.keys(filters);
  return fields.every((field) => {
    if (field === "year" && t.cities.includes(NO_CITY)) {
      return false;
    }
    const filterValues = filters[field]?.map((v) => v.value);
    if (!filterValues || filterValues.length === 0) {
      return true;
    }
    let fieldValue = t[field];
    if (typeof fieldValue === "string") {
      fieldValue = fieldValue.replace("(?)", "").replace("?", "").trim();
    }
    if (Array.isArray(fieldValue)) {
      fieldValue = fieldValue.map((v) =>
        typeof v === "string"
          ? v.replace("(?)", "").replace("?", "").trim()
          : v
      );
    }
    if (filterValues.every((v) => v === "Yes" || v === "No")) {
      if (fieldValue === null || fieldValue === undefined) {
        return false;
      }
      return filtersInclude[field] || filtersInclude[field] === undefined
        ? filterValues.includes(fieldValue.toString())
        : !filterValues.includes(fieldValue.toString());
    }
    const match = Array.isArray(fieldValue)
      ? filterValues.some(
          (v) =>
            fieldValue.includes(parseInt(v)) ||
            fieldValue.includes(v?.toString())
        )
      : filterValues.includes(fieldValue?.toString() || "");
    const include = filtersInclude[field] === undefined ? true : filtersInclude[field];
    return include ? match : !match;
  });
}

let cachedData = [];

self.addEventListener("message", (event) => {
  const message = event.data;

  if (message?.type === "setData") {
    cachedData = Array.isArray(message.payload) ? message.payload : [];
    return;
  }

  if (message?.type === "filter") {
    const {
      range,
      filters,
      filtersInclude,
      includeUndated,
      textSearch,
      textSearchFields,
      NO_CITY,
    } = message.payload || {};

    const filteredItems = cachedData.filter((t) =>
      filterRecord(
        t,
        range,
        filters,
        filtersInclude,
        includeUndated,
        textSearch,
        textSearchFields,
        NO_CITY
      )
    );

    self.postMessage(filteredItems);
  }
});
