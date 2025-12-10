package main

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strings"
)

const (
	basePath = "/Users/mia/dev/personal/elements-title-pages/public/docs/"

	corpusesCSV    = basePath + "corpuses.csv"
	dottedLinesCSV = basePath + "dotted_lines.csv"
	shelfmarksCSV  = basePath + "shelfmarks.csv"
	itemsPrintCSV  = basePath + "items_print.csv"
	paratextCSV    = basePath + "paratext_transcriptions.csv"

	citationsOutCSV = "citations_dotted_not_origin_eip.csv"
	tableOutCSV     = "dotted_facsimile_table.csv"
)

func mustOpen(path string) *os.File {
	f, err := os.Open(path)
	if err != nil {
		panic(fmt.Errorf("open %s: %w", path, err))
	}
	return f
}

func loadParatextTitles(path string) map[string]string {
	f := mustOpen(path)
	defer f.Close()

	r := csv.NewReader(f)
	headers, err := r.Read()
	if err != nil {
		panic(err)
	}

	idxKey := indexOf(headers, "key")
	idxTitle := indexOf(headers, "title")
	if idxKey == -1 || idxTitle == -1 {
		panic("paratext_transcriptions.csv missing key or title column")
	}

	result := make(map[string]string)
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			panic(err)
		}
		key := strings.TrimSpace(rec[idxKey])
		if key == "" {
			continue
		}
		result[key] = strings.TrimSpace(rec[idxTitle])
	}
	return result
}

func loadOriginEIPKeys(path string) map[string]struct{} {
	f := mustOpen(path)
	defer f.Close()

	r := csv.NewReader(f)
	headers, err := r.Read()
	if err != nil {
		panic(err)
	}

	idxKey := indexOf(headers, "key")
	idxStudy := indexOf(headers, "study")
	if idxKey == -1 || idxStudy == -1 {
		panic("corpuses.csv missing key or study column")
	}

	origin := make(map[string]struct{})

	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			panic(err)
		}
		key := strings.TrimSpace(rec[idxKey])
		study := strings.TrimSpace(rec[idxStudy])
		if key == "" {
			continue
		}
		parts := strings.Split(study, ",")
		for _, p := range parts {
			if strings.TrimSpace(p) == "origin_eip_csv" {
				origin[key] = struct{}{}
				break
			}
		}
	}
	return origin
}

func loadDottedLines(path string) (map[string][]string, []string) {
	f := mustOpen(path)
	defer f.Close()

	r := csv.NewReader(f)
	headers, err := r.Read()
	if err != nil {
		panic(err)
	}

	idxKey := indexOf(headers, "key")
	if idxKey == -1 {
		panic("dotted_lines.csv missing key column")
	}

	rows := make(map[string][]string)

	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			panic(err)
		}
		key := strings.TrimSpace(rec[idxKey])
		if key == "" {
			continue
		}
		rows[key] = rec
	}

	return rows, headers
}

func loadShelfmarks(path string) map[string]string {
	f := mustOpen(path)
	defer f.Close()

	r := csv.NewReader(f)
	headers, err := r.Read()
	if err != nil {
		panic(err)
	}

	idxKey := indexOf(headers, "key")
	idxScan := indexOf(headers, "scan")
	if idxKey == -1 || idxScan == -1 {
		panic("shelfmarks.csv missing key or scan column")
	}

	result := make(map[string]string)
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			panic(err)
		}
		key := strings.TrimSpace(rec[idxKey])
		if key == "" {
			continue
		}
		result[key] = strings.TrimSpace(rec[idxScan])
	}
	return result
}

type ItemRow struct {
	Key        string
	Year       string
	ShortTitle string // still kept as backup
	Title      string // new: from paratext_transcriptions.csv
	AuthorOrEd string
	Publisher  string
	Raw        []string
}

func loadFilteredItems(
	path string,
	dotted map[string][]string,
	originEIP map[string]struct{},
	titles map[string]string,
) ([]ItemRow, []string) {
	f := mustOpen(path)
	defer f.Close()

	br := bufio.NewReader(f)
	// check for UTF-8 BOM
	b, err := br.Peek(3)
	if err == nil && len(b) >= 3 && b[0] == 0xEF && b[1] == 0xBB && b[2] == 0xBF {
		_, _ = br.Discard(3)
	}
	r := csv.NewReader(br)

	headers, err := r.Read()
	if err != nil {
		panic(err)
	}
	for i := range headers {
		headers[i] = strings.ToLower(strings.TrimSpace(headers[i]))
	}

	idxKey := indexOf(headers, "key")
	idxYear := indexOf(headers, "year")
	idxShortTitle := indexOf(headers, "short_title")
	idxAuthorOrEd := indexOf(headers, "author_or_editor")
	idxPublisher := indexOf(headers, "publisher")

	if idxKey == -1 {
		panic("items_print.csv missing key column")
	}

	var out []ItemRow
	for {
		rec, err := r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			panic(err)
		}
		key := strings.TrimSpace(rec[idxKey])
		if key == "" {
			continue
		}
		// filter: has dotted lines + not in origin_eip_csv
		if _, ok := dotted[key]; !ok {
			continue
		}
		if _, inOrigin := originEIP[key]; inOrigin {
			continue
		}

		row := ItemRow{
			Key: key,
			Raw: rec,
		}
		if idxYear >= 0 {
			row.Year = strings.TrimSpace(rec[idxYear])
		}
		if idxShortTitle >= 0 {
			row.ShortTitle = strings.TrimSpace(rec[idxShortTitle])
		}
		if idxAuthorOrEd >= 0 {
			row.AuthorOrEd = strings.TrimSpace(rec[idxAuthorOrEd])
		}
		if idxPublisher >= 0 {
			row.Publisher = strings.TrimSpace(rec[idxPublisher])
		}

		// use paratext title
		if t, ok := titles[key]; ok {
			row.Title = t
		}

		out = append(out, row)
	}
	return out, headers
}

// --- Chicago author formatting ---

type Author struct {
	First string
	Last  string
}

func parseAuthors(s string) []Author {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var authors []Author
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		toks := strings.Fields(p)
		if len(toks) == 1 {
			authors = append(authors, Author{Last: toks[0]})
		} else {
			authors = append(authors, Author{
				First: strings.Join(toks[:len(toks)-1], " "),
				Last:  toks[len(toks)-1],
			})
		}
	}
	return authors
}

func chicagoAuthorString(authors []Author) string {
	n := len(authors)
	if n == 0 {
		return ""
	}

	// first author: Last, First
	first := authors[0]
	firstBlock := first.Last
	if first.First != "" {
		firstBlock = fmt.Sprintf("%s, %s", first.Last, first.First)
	}

	if n == 1 {
		return firstBlock + "."
	}
	if n == 2 {
		a2 := fmt.Sprintf("%s %s", authors[1].First, authors[1].Last)
		a2 = strings.TrimSpace(a2)
		return fmt.Sprintf("%s and %s.", firstBlock, a2)
	}

	var middle []string
	for _, a := range authors[1 : n-1] {
		name := strings.TrimSpace(strings.Join([]string{a.First, a.Last}, " "))
		middle = append(middle, name)
	}
	last := authors[n-1]
	lastName := strings.TrimSpace(strings.Join([]string{last.First, last.Last}, " "))

	if len(middle) > 0 {
		return fmt.Sprintf("%s, %s and %s.", firstBlock, strings.Join(middle, ", "), lastName)
	}
	return fmt.Sprintf("%s and %s.", firstBlock, lastName)
}

func chicagoCitation(item ItemRow) string {
	authors := parseAuthors(item.AuthorOrEd)
	authorPart := chicagoAuthorString(authors)

	title := strings.TrimSpace(item.ShortTitle)
	if title != "" {
		fmt.Printf("Using SHORT TITLE for key %s\n", item.Key)
	} else if item.Title != "" {
		fmt.Printf("Falling back to PARATEXT TITLE for key %s\n", item.Key)
		title = item.Title
	} else {
		title = "[MISSING TITLE]"
	}

	var parts []string
	if authorPart != "" {
		parts = append(parts, authorPart)
	}
	parts = append(parts, title+".")

	var py []string
	if item.Publisher != "" {
		py = append(py, item.Publisher)
	}
	if item.Year != "" {
		py = append(py, item.Year)
	}
	if len(py) > 0 {
		parts = append(parts, strings.Join(py, ", ")+".")
	}

	return strings.Join(parts, " ")
}

// --- helpers ---

func indexOf(slice []string, target string) int {
	for i, s := range slice {
		if s == target {
			return i
		}
	}
	return -1
}

func main() {
	originEIP := loadOriginEIPKeys(corpusesCSV)
	dottedRows, dottedHeaders := loadDottedLines(dottedLinesCSV)
	shelfFacs := loadShelfmarks(shelfmarksCSV)
	titles := loadParatextTitles(paratextCSV)

	items, _ := loadFilteredItems(itemsPrintCSV, dottedRows, originEIP, titles)

	// Task 1: citations
	citFile, err := os.Create(citationsOutCSV)
	if err != nil {
		panic(err)
	}
	defer citFile.Close()

	// Write UTF-8 BOM so Excel / Numbers detect encoding correctly
	if _, err := citFile.Write([]byte{0xEF, 0xBB, 0xBF}); err != nil {
		panic(err)
	}

	cw := csv.NewWriter(citFile)
	_ = cw.Write([]string{"key", "citation"})
	for _, item := range items {
		citation := chicagoCitation(item)
		_ = cw.Write([]string{item.Key, citation})
	}
	cw.Flush()
	if err := cw.Error(); err != nil {
		panic(err)
	}

	// Task 2: facsimile + dotted_lines columns (unchanged)
	tableFile, err := os.Create(tableOutCSV)
	if err != nil {
		panic(err)
	}
	defer tableFile.Close()

	tw := csv.NewWriter(tableFile)
	outHeaders := []string{"key", "facsimile_url"}
	for _, h := range dottedHeaders {
		if h == "key" {
			continue
		}
		outHeaders = append(outHeaders, h)
	}
	_ = tw.Write(outHeaders)

	for _, item := range items {
		dottedRec, ok := dottedRows[item.Key]
		row := make([]string, len(outHeaders))
		row[0] = item.Key
		row[1] = shelfFacs[item.Key]

		if ok {
			col := 2
			for i, h := range dottedHeaders {
				if h == "key" {
					continue
				}
				if i < len(dottedRec) {
					row[col] = dottedRec[i]
				}
				col++
			}
		}
		_ = tw.Write(row)
	}

	tw.Flush()
	if err := tw.Error(); err != nil {
		panic(err)
	}
}
