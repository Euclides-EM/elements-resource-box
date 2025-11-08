import Select from "react-select";

type SingleSelectProps = {
  name: string;
  options: Array<{ value: string | number; label: string }>;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
};

const SingleSelect = ({
  name,
  options,
  value,
  onChange,
  placeholder,
  className,
}: SingleSelectProps) => (
  <Select
    name={name}
    value={options.find(option => option.value === value) || null}
    options={options}
    className={`basic-single-select ${className}`}
    classNamePrefix="select"
    onChange={(selected) => onChange(selected?.value || null)}
    placeholder={placeholder || `Select ${name}`}
    isClearable={false}
    styles={{
      menu: (base) => ({
        ...base,
        zIndex: 9999,
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
      }),
    }}
    menuPortalTarget={document.body}
  />
);

export default SingleSelect;