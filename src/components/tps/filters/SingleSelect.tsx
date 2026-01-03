import Select from "react-select";
import CreatableSelect from "react-select/creatable";

type SingleSelectProps = {
  name: string;
  options: Array<{ value: string | number; label: string }>;
  value: string | number | null;
  onBlur?: () => void;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
  isCreatable?: boolean;
};

const SingleSelect = ({
  name,
  options,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  isCreatable,
}: SingleSelectProps) => {
  const SelectComponent = isCreatable ? CreatableSelect : Select;
  return (
    <SelectComponent
      name={name}
      value={options.find((option) => option.value === value) || null}
      options={options}
      className={`basic-single-select ${className}`}
      classNamePrefix="select"
      onBlur={onBlur}
      onChange={(selected) => onChange(selected?.value || null)}
      placeholder={placeholder || `Select ${name}`}
      isClearable
      styles={{
        menu: (base) => ({
          ...base,
          zIndex: 9999,
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999,
        }),
        option: (base) => ({
          ...base,
          color: "black",
        }),
        singleValue: (base) => ({
          ...base,
          color: "black",
        }),
      }}
      menuPortalTarget={document.body}
    />
  );
};

export default SingleSelect;
