import csv
import sys


def main():
    input_file = 'public/docs/EiP.csv'
    output_file = 'public/docs/shelfmarks.csv'

    try:
        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)

            # Define output columns according to mapping
            output_columns = [
                'key', 'volume', 'scan', 'title_page', 'frontispiece', 'annotations', 'shelf_mark', 'copyright'
            ]

            with open(output_file, 'a', encoding='utf-8', newline='') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=output_columns)
                writer.writeheader()

                for row in reader:
                    # Create new row according to mapping
                    new_row = {}

                    new_row['key'] = row.get('key', '')
                    new_row['scan'] = row.get('scan_url', '')
                    new_row['title_page'] = row.get('title_page_url', '')
                    new_row['frontispiece'] = row.get('frontispiece_url', '')
                    new_row['annotations'] = row.get('annotations', '')

                    writer.writerow(new_row)

        print(f"Successfully transformed {input_file} to {output_file}")

    except FileNotFoundError:
        print(f"Error: Could not find input file {input_file}")
        raise
    except Exception as e:
        print(f"Error processing file: {e}")
        raise


if __name__ == '__main__':
    main()
