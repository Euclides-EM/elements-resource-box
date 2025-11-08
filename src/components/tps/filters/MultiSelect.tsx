import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { TOOLTIP_FEATURES_HIGHLIGHT } from "../../map/MapTooltips.tsx";

type OptionLabelProps = {
  option: string;
  tooltip: string;
};

const OptionLabel = ({ option, tooltip }: OptionLabelProps) => (
  <span
    data-tooltip-id={TOOLTIP_FEATURES_HIGHLIGHT}
    data-tooltip-content={tooltip}
  >
    {option}
  </span>
);

type MultiSelectProps = {
  name: string;
  options: string[];
  onChange: (values: string[]) => void;
  defaultValues?: string[];
  colors?: Record<string, string>;
  tooltips?: Record<string, string>;
  labelFn?: (opt: string) => string;
  value?: string[];
  className?: string;
  isCreatable?: boolean;
  placeholder?: string;
};

const MultiSelect = ({
  name,
  options,
  onChange,
  defaultValues,
  colors,
  tooltips,
  labelFn,
  value,
  className,
  isCreatable = false,
  placeholder,
}: MultiSelectProps) => {
  const SelectComponent = isCreatable ? CreatableSelect : Select;

  return (
    <SelectComponent
      isMulti
      name={name}
      value={value?.map((v) => ({
        value: v,
        label: tooltips ? (
          <OptionLabel option={v} tooltip={tooltips[v]} />
        ) : labelFn ? (
          labelFn(v)
        ) : (
          v
        ),
      }))}
      defaultValue={defaultValues?.map((v) => ({
        value: v,
        label: tooltips ? (
          <OptionLabel option={v} tooltip={tooltips[v]} />
        ) : labelFn ? (
          labelFn(v)
        ) : (
          v
        ),
      }))}
      options={options.map((option) => ({
        value: option,
        label: tooltips ? (
          <OptionLabel option={option} tooltip={tooltips[option]} />
        ) : labelFn ? (
          labelFn(option)
        ) : (
          option
        ),
      }))}
      className={`basic-multi-select ${className}`}
      classNamePrefix="select"
      onChange={(selected) => onChange(selected.map((option) => option.value))}
      placeholder={placeholder || `Select ${name}`}
      styles={{
        menu: (base) => ({
          ...base,
          zIndex: 9999,
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999,
        }),
        option: (base, { data }) => ({
          ...base,
          color: "black",
          backgroundColor: colors?.[data.value] || base.backgroundColor,
        }),
        multiValue: (base, { data }) => ({
          ...base,
          backgroundColor: colors?.[data.value] || base.backgroundColor,
        }),
        multiValueLabel: (base) => ({
          ...base,
          color: "black",
        }),
      }}
      menuPortalTarget={document.body}
    />
  );
};

export default MultiSelect;
