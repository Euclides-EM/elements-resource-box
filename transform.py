import csv


def main():
    input_file = 'public/docs/EiP-secondary.csv'
    output_file = 'public/docs/metadata_elements_print.csv'
    write_header = False

    try:
        counter = 0
        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)

            # Define output columns according to mapping
            output_columns = [
                'key','elements_books','additional_content','wardhaugh_classification'
            ]

            with open(output_file, 'a', encoding='utf-8', newline='') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=output_columns, )
                if write_header:
                    writer.writeheader()

                for row in reader:
                    # Create new row according to mapping
                    new_row = {}

                    new_row['key'] = row.get('key', '')
                    if not row['books'] and not row['wClass']:
                        continue
                    books_content = row.get('books', '')
                    new_row["elements_books"] = books_content.replace("Elements ", '').split(";")[0]

                    # Handle additional content - if there's a semicolon, take everything after the first one
                    if ';' in books_content:
                        new_row["additional_content"] = ", ".join(books_content.split(";", 1)[1:]).strip()
                    else:
                        new_row["additional_content"] = ''
                    new_row["wardhaugh_classification"] = row.get('wClass', '')

                    writer.writerow(new_row)
                    counter += 1

        print(f"Successfully transformed {input_file} to {output_file} - with {counter} records.")

    except FileNotFoundError:
        print(f"Error: Could not find input file {input_file}")
        raise
    except Exception as e:
        print(f"Error processing file: {e}")
        raise


if __name__ == '__main__':
    main()
