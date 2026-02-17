import { authorDisplayName } from "../utils/dataUtils.ts";
import { Row, Text } from "./common.ts";
import { useEditionsSearch } from "../hooks/useEditionsSearch.ts";
import { MARKER_4 } from "../utils/colors.ts";
import { useMemo } from "react";
import styled from "@emotion/styled";
import pluralize from "pluralize";

const Highlight = styled.span`
  color: ${MARKER_4};
`;

export const Stats = ({ verb }: { verb?: string }) => {
  const { items: filteredItems } = useEditionsSearch();

  const { authorsCount, languagesCount, citiesCount } = useMemo(() => {
    const authorsSet = new Set<string>();
    const citiesSet = new Set<string>();
    const languagesSet = new Set<string>();
    filteredItems?.forEach((item) => {
      item.authors?.forEach((author) =>
        authorsSet.add(authorDisplayName(author)),
      );
      item.cities?.forEach((city) => citiesSet.add(city));
      item.languages?.forEach((language) => languagesSet.add(language));
    });
    return {
      authorsCount: authorsSet.size,
      citiesCount: citiesSet.size,
      languagesCount: languagesSet.size,
    };
  }, [filteredItems]);

  if (filteredItems == null) {
    return null;
  }

  return (
    <Row>
      {filteredItems.length === 0 ? (
        <Highlight>No matches. Try adjusting the filters or search.</Highlight>
      ) : (
        <Text size={1}>
          {verb || "Listing"} <Highlight>{filteredItems.length}</Highlight>{" "}
          {pluralize("edition", filteredItems.length)}, by{" "}
          <Highlight>{authorsCount}</Highlight>{" "}
          {pluralize("author", authorsCount)}, in{" "}
          <Highlight>{languagesCount}</Highlight>{" "}
          {pluralize("language", languagesCount)}, from{" "}
          <Highlight>{citiesCount}</Highlight> {pluralize("city", citiesCount)}.
        </Text>
      )}
    </Row>
  );
};
