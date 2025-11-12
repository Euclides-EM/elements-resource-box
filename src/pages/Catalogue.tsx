import { upperFirst } from "lodash";
import { useEffect, useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnResizeMode,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import styled from "@emotion/styled";
import { SiMaterialdesign } from "react-icons/si";
import { Item } from "../types";
import { useFilter } from "../contexts/FilterContext";
import {
  Container,
  Row,
  ScrollbarStyle,
  ScrollToTopButton,
} from "../components/common";
import ItemModal from "../components/tps/modal/ItemModal";
import { NO_AUTHOR, NO_CITY, NO_YEAR } from "../constants";
import { joinArr } from "../utils/util.ts";
import { FaBookReader } from "react-icons/fa";
import { SEA_COLOR } from "../utils/colors.ts";
import { authorDisplayName } from "../utils/dataUtils.ts";
import {
  TOOLTIP_BOOK_TYPE,
  TOOLTIP_WCLASS,
} from "../components/map/MapTooltips.tsx";
import { HelpTip } from "../components/map/Filter.tsx";
import { Stats } from "../components/Stats.tsx";

const TableContainer = styled.div`
  ${ScrollbarStyle};
  max-width: 98vw;
  border-radius: 0.5rem;
  background-color: aliceblue;
  color: black;
  margin-bottom: 2rem;
  overflow-x: hidden;
`;

const StyledTable = styled.table`
  table-layout: fixed;
  width: max-content;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.8rem;

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #ddd;
    white-space: wrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  td:has(.language-container) {
    white-space: normal;
  }

  td:has(.short-title-container) {
    white-space: nowrap;
    max-width: 0;
  }

  thead {
    position: sticky;
    top: 0;
    background-color: #f8f9fa;
    z-index: 1;
  }

  thead th {
    background-color: #f8f9fa;
  }

  tbody tr {
    transition: background-color 0.15s ease;
  }

  tbody tr:hover {
    background-color: #f0f0f0;
  }

  th {
    font-weight: bold;
    cursor: pointer;
    user-select: none;
    position: relative;
    padding-right: 1.5rem;

    &:hover {
      background-color: #eee;
    }

    .resizer {
      position: absolute;
      right: 0;
      top: 0;
      height: 100%;
      width: 4px;
      background: rgba(0, 0, 0, 0.05);
      cursor: col-resize;
      user-select: none;
      touch-action: none;

      &:hover {
        background: rgba(0, 0, 0, 0.2);
      }

      &.isResizing {
        background: rgba(0, 0, 0, 0.3);
        opacity: 1;
      }
    }
  }

  @media (max-width: 768px) {
    font-size: 0.8rem;

    th,
    td {
      padding: 0.5rem;
    }
  }
`;

const SortIndicator = styled.span`
  margin-left: 0.5rem;
`;

const ViewButton = styled.button`
  background-color: #f0f0f0;
  color: black;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;

  &:hover {
    background-color: #e0e0e0;
  }
`;

const LanguageSpan = styled.span`
  display: inline-block;
  margin-right: 0.25rem;
  padding: 0.125rem 0.25rem;
  background-color: #e0e0e0;
  border-radius: 0.25rem;
  font-size: 0.8rem;
`;

const StyledHelpTip = styled(HelpTip)`
  margin: 0;
`;

function Catalogue() {
  const { filteredItems, filters } = useFilter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "year", desc: false },
  ]);
  const [columnResizeMode] = useState<ColumnResizeMode>("onChange");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const handleScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setShowScrollTop(scrollTop > 200);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const columnHelper = createColumnHelper<Item>();

  const showOtherColumns =
    !filters?.type ||
    filters.type.length === 0 ||
    filters.type.some((item) => item.value === "Other");

  const showElementsColumns =
    !filters?.type ||
    filters.type.length === 0 ||
    filters.type.some((item) => item.value === "Elements");

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor((row) => row, {
          id: "actions",
          header: "",
          enableSorting: false,
          cell: (info) => (
            <Row gap={0.5} justifyStart>
              <ViewButton
                onClick={() => setSelectedItem(info.getValue())}
                title="Full View"
              >
                ⤢
              </ViewButton>
              {info.row.original.scanUrl &&
                info.row.original.scanUrl.length > 0 &&
                info.row.original.scanUrl.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View Facsimile Online"
                  >
                    <FaBookReader style={{ color: SEA_COLOR }} />
                  </a>
                ))}
              {info.row.original.diagrams_extracted === "True" && (
                <a
                  href={`/diagrams?key=${info.row.original.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Diagrams"
                >
                  <SiMaterialdesign style={{ color: SEA_COLOR }} />
                </a>
              )}
            </Row>
          ),
          size: 88,
        }),
        columnHelper.accessor("year", {
          header: "Year",
          cell: (info) => info.getValue() || NO_YEAR,
          size: 10,
          sortingFn: (rowA, rowB) => {
            const yearA = rowA.original.year;
            const yearB = rowB.original.year;
            if (!yearA && !yearB) return 0;
            if (!yearA) return 1;
            if (!yearB) return -1;
            return yearA.localeCompare(yearB);
          },
        }),
        columnHelper.accessor("cities", {
          header: "Cities",
          cell: (info) => joinArr(info.getValue()) || NO_CITY,
          size: 40,
        }),
        columnHelper.accessor("languages", {
          header: "Languages",
          cell: (info) => (
            <div className="language-container">
              {info.getValue().map((lang, i) => (
                <LanguageSpan key={i}>{lang}</LanguageSpan>
              ))}
            </div>
          ),
          size: 100,
        }),
        columnHelper.accessor("authors", {
          header: "Authors",
          cell: (info) => joinArr(info.getValue()) || NO_AUTHOR,
          size: 160,
          sortingFn: (rowA, rowB) => {
            const authorsA = rowA.original.authors || [];
            const authorsB = rowB.original.authors || [];

            if (authorsA.length === 0 && authorsB.length === 0) return 0;
            if (authorsA.length === 0) return 1;
            if (authorsB.length === 0) return -1;

            const displayNameA = authorDisplayName(authorsA[0]);
            const displayNameB = authorDisplayName(authorsB[0]);

            return displayNameA.localeCompare(displayNameB);
          },
        }),
        showOtherColumns &&
          columnHelper.accessor("title", {
            header: "Title",
            cell: (info) => {
              let val = info.getValue() || "";
              val = upperFirst(
                val
                  .replaceAll(/-\s+/gi, "")
                  .replaceAll(/\[vol\. 1]:?\s*/gi, "")
                  .replaceAll(/\[general title page]:?\s*/gi, "")
                  .replace(/\.\s*$/g, "")
                  .trim()
                  .toLowerCase(),
              );
              if (val === "?") {
                val = "";
              }
              return (
                <span className="short-title-container" title={val}>
                  {val}
                </span>
              );
            },
            size: 160,
          }),
        columnHelper.accessor("format", {
          header: "Format",
          cell: (info) => info.getValue(),
          size: 60,
        }),
        showElementsColumns &&
          columnHelper.accessor("elementsBooks", {
            header: "Elements Books",
            enableSorting: false,
            cell: (info) =>
              info
                .getValue()
                .map((range) =>
                  range.start === range.end
                    ? range.start
                    : `${range.start}-${range.end}`,
                )
                .join(", "),
            size: 105,
          }),
        columnHelper.accessor("volumesCount", {
          header: "Volumes",
          cell: (info) => info.getValue(),
          size: 40,
        }),
        showElementsColumns &&
          columnHelper.accessor("class", {
            header: () => (
              <Row gap={0.5}>
                W-Class <StyledHelpTip tooltipId={TOOLTIP_WCLASS} />
              </Row>
            ),
            enableSorting: false,
            cell: (info) => info.getValue(),
            size: 120,
          }),
        showElementsColumns &&
          columnHelper.accessor("additionalContent", {
            header: "Additional Content",
            cell: (info) => joinArr(info.getValue()),
            size: 140,
          }),
        columnHelper.accessor("type", {
          header: () => (
            <Row gap={0.5}>
              Classification <StyledHelpTip tooltipId={TOOLTIP_BOOK_TYPE} />
            </Row>
          ),
          size: 120,
        }),
      ].filter(Boolean) as ColumnDef<Item>[],
    [columnHelper, showOtherColumns, showElementsColumns],
  );

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode,
    sortDescFirst: false,
  });

  return (
    <Container style={{ width: "100%" }}>
      {showScrollTop && (
        <ScrollToTopButton onClick={scrollToTop} title="Scroll to top">
          ↑
        </ScrollToTopButton>
      )}

      <Stats />

      <TableContainer>
        <StyledTable>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        {...{
                          className: header.column.getCanSort()
                            ? "cursor-pointer select-none"
                            : "",
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.columnDef.enableSorting && (
                          <SortIndicator>
                            {{
                              asc: "↑",
                              desc: "↓",
                            }[header.column.getIsSorted() as string] || ""}
                          </SortIndicator>
                        )}
                      </div>
                    )}
                    <div
                      {...{
                        onMouseDown: header.getResizeHandler(),
                        onTouchStart: header.getResizeHandler(),
                        className: `resizer ${header.column.getIsResizing() ? "isResizing" : ""}`,
                      }}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </TableContainer>

      {selectedItem && (
        <ItemModal
          item={selectedItem}
          features={null}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </Container>
  );
}

export default Catalogue;
