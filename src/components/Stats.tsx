import { authorDisplayName } from "../utils/dataUtils.ts";
import { Row, Text } from "./common.ts";
import { useAppliedFilter } from "../contexts/FilterAppliedContext.tsx";
import { MARKER_4 } from "../utils/colors.ts";
import { useMemo } from "react";
import styled from "@emotion/styled";

const Highlight = styled.span`
  color: ${MARKER_4};
`;

export const Stats = ({ verb }: { verb?: string }) => {
  const { filteredItems } = useAppliedFilter();

  const { authorsCount, languagesCount, citiesCount } = useMemo(() => {
    const authorsSet = new Set<string>();
    const citiesSet = new Set<string>();
    const languagesSet = new Set<string>();
    filteredItems.forEach((item) => {
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

  return (
    <Row>
      {filteredItems.length === 0 ? (
        <Highlight>No matches. Try adjusting the filters or search.</Highlight>
      ) : (
        <Text size={1}>
          {verb || "Listing"} <Highlight>{filteredItems.length}</Highlight>{" "}
          editions, by <Highlight>{authorsCount}</Highlight> authors, in{" "}
          <Highlight>{languagesCount}</Highlight> languages, from{" "}
          <Highlight>{citiesCount}</Highlight> cities.
        </Text>
      )}
    </Row>
  );
};
