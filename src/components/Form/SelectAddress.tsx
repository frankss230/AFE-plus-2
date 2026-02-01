import React from 'react';
import Form from 'react-bootstrap/Form';

interface SelectAddressProps {
  label: string;
  id: string;
  value: string;
  options: any[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  isValid?: boolean;
  required?: boolean;
  getLabel: (item: any) => string;
}

const SelectAddress: React.FC<SelectAddressProps> = ({
  label,
  id,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "เลือก...",
  isInvalid = false,
  errorMessage,
  isValid = false,
  required = false,
  getLabel
}) => {
  return (
    <Form.Group className="mb-3">
      <Form.Label htmlFor={id}>
        {label} {required && <span className="text-danger">*</span>}
      </Form.Label>
      <Form.Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        isInvalid={isInvalid}
        isValid={isValid}
      >
        <option value="">— {placeholder} —</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {getLabel(item)}
          </option>
        ))}
      </Form.Select>
      {isInvalid && errorMessage && (
        <Form.Control.Feedback type="invalid">
          {errorMessage}
        </Form.Control.Feedback>
      )}
    </Form.Group>
  );
};

export default SelectAddress;