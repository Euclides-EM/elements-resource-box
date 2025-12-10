package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	basePath      = "public/docs/"
	itemsPrintCSV = basePath + "items_print.csv"

	ustcBaseURL = "https://www.ustc.ac.uk/editions/"
)

// CSV column names (adjust if they differ)
const (
	colKey              = "key"
	colShortTitle       = "short_title"
	colShortTitleSource = "short_title_source"
	colUSTCID           = "ustc_id"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("error: %v", err)
	}
}

func run() error {
	// Open original CSV
	f, err := os.Open(itemsPrintCSV)
	if err != nil {
		return fmt.Errorf("open items_print.csv: %w", err)
	}
	defer f.Close()

	r := csv.NewReader(f)
	r.FieldsPerRecord = -1 // allow variable length rows

	// Read header
	headers, err := r.Read()
	if err != nil {
		return fmt.Errorf("read header: %w", err)
	}

	idxKey := indexOf(headers, colKey)
	idxShortTitle := indexOf(headers, colShortTitle)
	idxShortTitleSource := indexOf(headers, colShortTitleSource)
	idxUSTC := indexOf(headers, colUSTCID)

	if idxKey == -1 || idxShortTitle == -1 || idxShortTitleSource == -1 || idxUSTC == -1 {
		return fmt.Errorf("missing one of required columns: %q, %q, %q, %q",
			colKey, colShortTitle, colShortTitleSource, colUSTCID)
	}

	// Load all rows into memory
	var rows [][]string
	rows = append(rows, headers) // keep header as first row

	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	rowNum := 1
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("read row %d: %w", rowNum, err)
		}
		rowNum++

		// Ensure the slice has at least len(headers) entries
		if len(rec) < len(headers) {
			rec = append(rec, make([]string, len(headers)-len(rec))...)
		}

		key := strings.TrimSpace(rec[idxKey])
		ustcID := strings.TrimSpace(rec[idxUSTC])
		shortTitleCurrent := strings.TrimSpace(rec[idxShortTitle])

		// Only fetch if ustc_id exists and short_title is currently empty
		if ustcID != "" && ustcID != "-" && shortTitleCurrent == "" {
			log.Printf("Row %d (%s): fetching USTC %s", rowNum, key, ustcID)
			title, err := fetchUSTCShortTitle(client, ustcID)
			if err != nil {
				log.Printf("  -> error fetching USTC %s: %v", ustcID, err)
			} else if title != "" {
				log.Printf("  -> found title: %q", title)
				rec[idxShortTitle] = title
				rec[idxShortTitleSource] = "Provided by catalog"
				// Be a tiny bit polite to their server
				time.Sleep(300 * time.Millisecond)
			} else {
				log.Printf("  -> no title extracted for USTC %s", ustcID)
			}
		}

		rows = append(rows, rec)
	}

	// Write back to same file
	if err := writeCSV(itemsPrintCSV, rows); err != nil {
		return fmt.Errorf("write updated CSV: %w", err)
	}

	log.Printf("Done. Updated file: %s", itemsPrintCSV)
	return nil
}

func writeCSV(path string, rows [][]string) error {
	tmpPath := path + ".tmp"

	out, err := os.Create(tmpPath)
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	defer out.Close()

	// Optional: BOM for friendlier Excel behavior
	if _, err := out.Write([]byte{0xEF, 0xBB, 0xBF}); err != nil {
		return fmt.Errorf("write BOM: %w", err)
	}

	w := csv.NewWriter(out)
	for _, row := range rows {
		if err := w.Write(row); err != nil {
			return fmt.Errorf("write row: %w", err)
		}
	}
	w.Flush()
	if err := w.Error(); err != nil {
		return fmt.Errorf("flush: %w", err)
	}

	// Replace original atomically
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("rename temp to original: %w", err)
	}

	return nil
}

func indexOf(slice []string, target string) int {
	for i, s := range slice {
		if s == target {
			return i
		}
	}
	return -1
}

// fetchUSTCShortTitle fetches the edition page and tries to extract a short title.
func fetchUSTCShortTitle(client *http.Client, ustcID string) (string, error) {
	url := ustcBaseURL + ustcID

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("new request: %w", err)
	}
	req.Header.Set("User-Agent", "Mia-UET-USTC-ShortTitle-Fetcher/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return "", fmt.Errorf("read response body: %w", err)
		}
		return "", fmt.Errorf("status %d, body [%s]", resp.StatusCode, body)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read body: %w", err)
	}
	s := string(body)

	title := extractStdTitleFromDataPage(s)
	if title != "" {
		return title, nil
	}

	// Fallback to old heuristics if you still want them
	// return fallbackExtractTitle(s), nil

	return "", nil
}

// extractStdTitleFromDataPage finds the data-page="...json..." attribute and
// returns props.edition.std_title from that JSON.
func extractStdTitleFromDataPage(htmlStr string) string {
	const attr = `data-page="`

	i := strings.Index(htmlStr, attr)
	if i == -1 {
		return ""
	}
	start := i + len(attr)

	rest := htmlStr[start:]
	j := strings.Index(rest, `">`)
	if j == -1 {
		return ""
	}
	rawAttr := rest[:j]

	// Unescape &quot; etc
	jsonStr := html.UnescapeString(rawAttr)

	// Minimal struct for the bits we care about
	type editionStruct struct {
		StdTitle string `json:"std_title"`
	}
	type propsStruct struct {
		Edition editionStruct `json:"edition"`
	}
	type pageStruct struct {
		Props propsStruct `json:"props"`
	}

	var page pageStruct
	if err := json.Unmarshal([]byte(jsonStr), &page); err != nil {
		// If you want debug:
		// log.Printf("json unmarshal error: %v", err)
		return ""
	}

	return strings.TrimSpace(page.Props.Edition.StdTitle)
}
