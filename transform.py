import csv


def main():
    input_file = 'public/docs/EiP-secondary.csv'
    output_file = 'public/docs/title_page.csv'
    write_header = True

    try:
        counter = 0
        with open(input_file, 'r', encoding='utf-8') as infile:
            reader = csv.DictReader(infile)

            # Define output columns according to mapping
            output_columns = [
                'key', 'base_content', 'editor_name', 'editor_description',
                'description_of_Euclid', 'edition_details', 'audience',
                'content_description', 'additional_content', 'references_to_Euclid',
                'educational_authorities_references', 'dedicatee_name', 'printing_privilege',
                'action_verbs', 'origin_language', 'destination_language', 'Greek_text',
                'references_to_innovation', 'institutions', 'enriched_with', 'bound_with',
                'Elements_designation', 'editor', 'printer_device', 'font_types',
                'calligraphic_features', 'other_names_classification', 'illustration',
                'publisher', 'red_ink', 'print_technique', 'number_of_types',
                'frame_type', 'engraving', 'date_in_imprint', 'publisher_in_imprint',
                'location_in_imprint', 'printing_privilege_in_imprint', 'dedication_in_imprint',
                'editor_in_imprint', 'editor_description_in_imprint', 'tagger'
            ]

            with open(output_file, 'a', encoding='utf-8', newline='') as outfile:
                writer = csv.DictWriter(outfile, fieldnames=output_columns, quoting=csv.QUOTE_MINIMAL)
                if write_header:
                    writer.writeheader()

                for row in reader:
                    # Create new row according to mapping
                    new_row = {}

                    # Direct mappings
                    new_row['key'] = row.get('key', '')
                    new_row['base_content'] = row.get('BASE CONTENT', '')
                    new_row['description_of_Euclid'] = combine_fields(row, 'EUCLID DESCRIPTION', 'EUCLID DESCRIPTION 2')
                    new_row['edition_details'] = combine_fields(row, 'EDITION INFO', 'EDITION INFO 2')
                    new_row['audience'] = combine_fields(row, 'EXPLICIT RECIPIENT', 'EXPLICIT RECIPIENT 2')
                    new_row['content_description'] = combine_fields(row, 'CONTENT DESC', 'CONTENT DESC 2')
                    new_row['additional_content'] = combine_fields(row, 'ADDITIONAL CONTENT', 'ADDITIONAL CONTENT 2')
                    new_row['references_to_Euclid'] = row.get('EUCLID REF', '')
                    new_row['educational_authorities_references'] = row.get('OTHER NAMES', '')
                    new_row['dedicatee_name'] = row.get('PATRON REF', '')
                    new_row['printing_privilege'] = row.get('PRIVILEGES', '')
                    new_row['action_verbs'] = row.get('VERBS', '')
                    new_row['origin_language'] = row.get('EXPLICITLY STATED: TRANSLATED FROM', '')
                    new_row['destination_language'] = row.get('EXPLICITLY STATED: TRANSLATED TO', '')
                    new_row['Greek_text'] = row.get('GREEK IN NON GREEK BOOKS', '')
                    new_row['references_to_innovation'] = row.get('INNOVATION', '')
                    new_row['institutions'] = row.get('INSTITUTIONS', '')
                    new_row['enriched_with'] = row.get('ENRICHED WITH', '')
                    new_row['bound_with'] = row.get('BOUND WITH', '')
                    new_row['Elements_designation'] = row.get('ELEMENTS DESIGNATION', '')
                    new_row['editor'] = row.get('author (orig)', '')
                    new_row['printer_device'] = row.get('printer_device', '')
                    new_row['font_types'] = row.get('font_types', '')
                    new_row['calligraphic_features'] = row.get('calligraphic_features', '')
                    new_row['other_names_classification'] = row.get('other_names_classification', '')
                    new_row['illustration'] = row.get('tp_illustration', '')
                    new_row['publisher'] = row.get('publisher (orig)', '')
                    new_row['red_ink'] = row.get('has_red', '')
                    new_row['print_technique'] = row.get('tp_design', '')
                    new_row['number_of_types'] = row.get('num_of_types', '')
                    new_row['frame_type'] = row.get('frame_type', '')
                    new_row['engraving'] = row.get('engraving', '')
                    new_row['date_in_imprint'] = row.get('IMPRINT DATE', '')
                    new_row['publisher_in_imprint'] = row.get('IMPRINT PUBLISHER', '')
                    new_row['location_in_imprint'] = row.get('IMPRINT PLACE', '')
                    new_row['printing_privilege_in_imprint'] = row.get('IMPRINT PRIVILEGES', '')
                    new_row['dedication_in_imprint'] = row.get('IMPRINT DEDICATION', '')
                    new_row['editor_in_imprint'] = row.get('IMPRINT AUTHOR NAME', '')
                    new_row['editor_description_in_imprint'] = row.get('IMPRINT AUTHOR DESCRIPTION', '')
                    new_row['tagger'] = row.get('tagger', '')

                    # Special handling for fields that need ":" separation due to comma conflicts
                    new_row['editor_name'] = combine_fields_with_colon(row, 'AUTHOR NAME', 'AUTHOR NAME 2')
                    new_row['editor_description'] = combine_fields_with_colon(row, 'AUTHOR DESCRIPTION', 'AUTHOR DESCRIPTION 2')

                    writer.writerow(new_row)
                    counter += 1

        print(f"Successfully transformed {input_file} to {output_file} - with {counter} records.")

    except FileNotFoundError:
        print(f"Error: Could not find input file {input_file}")
        raise
    except Exception as e:
        print(f"Error processing file: {e}")
        raise


def combine_fields(row, field1, field2):
    """Combine two fields with comma separation"""
    parts = []
    if row.get(field1):
        parts.append(row[field1].strip())
    if row.get(field2):
        parts.append(row[field2].strip())
    return ', '.join(parts)


def combine_fields_with_colon(row, field1, field2):
    """Combine two fields with colon separation (when comma separation won't work)"""
    parts = []
    if row.get(field1):
        parts.append(row[field1].strip())
    if row.get(field2):
        parts.append(row[field2].strip())
    return ':: '.join(parts)


if __name__ == '__main__':
    main()