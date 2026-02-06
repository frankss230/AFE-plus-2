import React, { useEffect, useMemo, useState } from "react";
import Form from "react-bootstrap/Form";
import CreatableSelect from "react-select/creatable";
import { components, MenuListProps } from "react-select";

type Option = {
  label: string;
  value: string;
};

export type ChronicDiseaseSelectProps = {
  initialValue?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const STATIC_DISEASES: Option[] = [
  // --- 1. กลุ่มยอดฮิต & NCDs ---
  { label: "เบาหวาน (Diabetes Mellitus)", value: "เบาหวาน" },
  { label: "ความดันโลหิตสูง (Hypertension)", value: "ความดันโลหิตสูง" },
  { label: "ไขมันในเลือดสูง (Dyslipidemia)", value: "ไขมันในเลือดสูง" },
  { label: "โรคอ้วน (Obesity)", value: "โรคอ้วน" },
  { label: "กรดยูริกในเลือดสูง (Hyperuricemia)", value: "กรดยูริกสูง" },

  // --- 2. ระบบหัวใจและหลอดเลือด ---
  { label: "หัวใจขาดเลือด (IHD/CAD)", value: "หัวใจขาดเลือด" },
  { label: "หัวใจล้มเหลว (Heart Failure)", value: "หัวใจล้มเหลว" },
  { label: "หัวใจเต้นผิดจังหวะ (Arrhythmia)", value: "หัวใจเต้นผิดจังหวะ" },
  { label: "ลิ้นหัวใจรั่ว/ตีบ (Valvular Heart Disease)", value: "โรคลิ้นหัวใจ" },
  { label: "กล้ามเนื้อหัวใจอักเสบ (Myocarditis)", value: "กล้ามเนื้อหัวใจอักเสบ" },
  { label: "หลอดเลือดส่วนปลายตีบ (PAD)", value: "หลอดเลือดส่วนปลายตีบ" },
  { label: "เส้นเลือดขอด (Varicose Veins)", value: "เส้นเลือดขอด" },
  { label: "หัวใจโต (Cardiomegaly)", value: "หัวใจโต" },

  // --- 3. ระบบทางเดินหายใจ ---
  { label: "หอบหืด (Asthma)", value: "หอบหืด" },
  { label: "ถุงลมโป่งพอง (COPD)", value: "ถุงลมโป่งพอง" },
  { label: "ภูมิแพ้อากาศ (Allergic Rhinitis)", value: "ภูมิแพ้อากาศ" },
  { label: "ไซนัสอักเสบ (Sinusitis)", value: "ไซนัสอักเสบ" },
  { label: "หยุดหายใจขณะหลับ (Sleep Apnea)", value: "หยุดหายใจขณะหลับ" },
  { label: "วัณโรค (Tuberculosis)", value: "วัณโรค" },
  { label: "พังผืดในปอด (Pulmonary Fibrosis)", value: "พังผืดในปอด" },
  { label: "หลอดลมอักเสบ (Bronchitis)", value: "หลอดลมอักเสบ" },
  { label: "ปอดอักเสบ/ปอดบวม (Pneumonia)", value: "ปอดอักเสบ" },

  // --- 4. ระบบประสาทและสมอง ---
  { label: "หลอดเลือดสมอง (Stroke)", value: "หลอดเลือดสมอง" },
  { label: "ไมเกรน (Migraine)", value: "ไมเกรน" },
  { label: "ลมชัก (Epilepsy)", value: "ลมชัก" },
  { label: "พาร์กินสัน (Parkinson's)", value: "พาร์กินสัน" },
  { label: "อัลไซเมอร์ (Alzheimer's)", value: "อัลไซเมอร์" },
  { label: "สมองเสื่อม (Dementia)", value: "สมองเสื่อม" },
  { label: "กล้ามเนื้ออ่อนแรง (MG/ALS)", value: "กล้ามเนื้ออ่อนแรง" },
  { label: "ปลายประสาทอักเสบ (Neuropathy)", value: "ปลายประสาทอักเสบ" },
  { label: "น้ำในโพรงสมองมาก (Hydrocephalus)", value: "น้ำในโพรงสมองมาก" },

  // --- 5. ระบบทางเดินอาหารและตับ ---
  { label: "กรดไหลย้อน (GERD)", value: "กรดไหลย้อน" },
  { label: "กระเพาะอาหารอักเสบ (Gastritis)", value: "กระเพาะอาหาร" },
  { label: "ลำไส้แปรปรวน (IBS)", value: "ลำไส้แปรปรวน" },
  { label: "ลำไส้อักเสบเรื้อรัง (IBD)", value: "ลำไส้อักเสบเรื้อรัง" },
  { label: "นิ่วในถุงน้ำดี (Gallstone)", value: "นิ่วในถุงน้ำดี" },
  { label: "ไขมันพอกตับ (Fatty Liver)", value: "ไขมันพอกตับ" },
  { label: "ตับอักเสบบี (Hepatitis B)", value: "ตับอักเสบบี" },
  { label: "ตับอักเสบซี (Hepatitis C)", value: "ตับอักเสบซี" },
  { label: "ตับแข็ง (Cirrhosis)", value: "ตับแข็ง" },
  { label: "ริดสีดวงทวาร (Hemorrhoid)", value: "ริดสีดวงทวาร" },
  { label: "ไส้เลื่อน (Hernia)", value: "ไส้เลื่อน" },

  // --- 6. ระบบไตและทางเดินปัสสาวะ ---
  { label: "ไตเรื้อรัง (CKD)", value: "โรคไตเรื้อรัง" },
  { label: "นิ่วในไต (Kidney Stone)", value: "นิ่วในไต" },
  { label: "กระเพาะปัสสาวะอักเสบ (Cystitis)", value: "กระเพาะปัสสาวะอักเสบ" },
  { label: "ต่อมลูกหมากโต (BPH)", value: "ต่อมลูกหมากโต" },
  { label: "โปรตีนรั่วในปัสสาวะ (Nephrotic Syndrome)", value: "โปรตีนรั่วในปัสสาวะ" },

  // --- 7. ระบบกระดูกและข้อ ---
  { label: "ข้อเข่าเสื่อม (Osteoarthritis)", value: "ข้อเข่าเสื่อม" },
  { label: "กระดูกพรุน (Osteoporosis)", value: "กระดูกพรุน" },
  { label: "หมอนรองกระดูกทับเส้น (HNP)", value: "หมอนรองกระดูกทับเส้น" },
  { label: "เก๊าท์ (Gout)", value: "เก๊าท์" },
  { label: "รูมาตอยด์ (Rheumatoid Arthritis)", value: "รูมาตอยด์" },
  { label: "ออฟฟิศซินโดรม (Office Syndrome)", value: "ออฟฟิศซินโดรม" },
  { label: "นิ้วล็อก (Trigger Finger)", value: "นิ้วล็อก" },
  { label: "พังผืดข้อมือทับเส้นประสาท (CTS)", value: "พังผืดข้อมือ" },
  { label: "ไหล่ติด (Frozen Shoulder)", value: "ไหล่ติด" },

  // --- 8. ระบบต่อมไร้ท่อและภูมิคุ้มกัน ---
  { label: "ไทรอยด์เป็นพิษ (Hyperthyroid)", value: "ไทรอยด์เป็นพิษ" },
  { label: "ไทรอยด์ต่ำ (Hypothyroid)", value: "ไทรอยด์ต่ำ" },
  { label: "เอสแอลอี/พุ่มพวง (SLE)", value: "เอสแอลอี" },
  { label: "สะเก็ดเงิน (Psoriasis)", value: "สะเก็ดเงิน" },
  { label: "ผิวหนังอักเสบ (Eczema)", value: "ผิวหนังอักเสบ" },
  { label: "ด่างขาว (Vitiligo)", value: "ด่างขาว" },

  // --- 9. สุขภาพจิต ---
  { label: "ซึมเศร้า (Depression)", value: "ซึมเศร้า" },
  { label: "วิตกกังวล (Anxiety)", value: "วิตกกังวล" },
  { label: "ไบโพลาร์ (Bipolar)", value: "ไบโพลาร์" },
  { label: "นอนไม่หลับ (Insomnia)", value: "นอนไม่หลับ" },
  { label: "แพนิค (Panic Disorder)", value: "แพนิค" },
  { label: "ย้ำคิดย้ำทำ (OCD)", value: "ย้ำคิดย้ำทำ" },

  // --- 10. เลือดและมะเร็ง ---
  { label: "โลหิตจาง (Anemia)", value: "โลหิตจาง" },
  { label: "ธาลัสซีเมีย (Thalassemia)", value: "ธาลัสซีเมีย" },
  { label: "จีซิกพีดี (G6PD deficiency)", value: "G6PD" },
  { label: "มะเร็งตับ", value: "มะเร็งตับ" },
  { label: "มะเร็งปอด", value: "มะเร็งปอด" },
  { label: "มะเร็งเต้านม", value: "มะเร็งเต้านม" },
  { label: "มะเร็งลำไส้ใหญ่", value: "มะเร็งลำไส้ใหญ่" },
  { label: "มะเร็งปากมดลูก", value: "มะเร็งปากมดลูก" },
  { label: "ลูคีเมีย (Leukemia)", value: "ลูคีเมีย" },

  // --- 11. ตา หู คอ จมูก ---
  { label: "ต้อกระจก (Cataract)", value: "ต้อกระจก" },
  { label: "ต้อหิน (Glaucoma)", value: "ต้อหิน" },
  { label: "วุ้นในตาเสื่อม", value: "วุ้นในตาเสื่อม" },
  { label: "ประสาทหูเสื่อม", value: "ประสาทหูเสื่อม" },
  { label: "น้ำในหูไม่เท่ากัน", value: "น้ำในหูไม่เท่ากัน" },

  // --- 12. นรีเวชและทางเดินปัสสาวะชาย ---
  { label: "ถุงน้ำในรังไข่ (PCOS)", value: "PCOS" },
  { label: "เนื้องอกมดลูก (Myoma)", value: "เนื้องอกมดลูก" },
  { label: "ช็อกโกแลตซีสต์ (Endometriosis)", value: "เยื่อบุโพรงมดลูกเจริญผิดที่" },
  { label: "หย่อนสมรรถภาพทางเพศ (ED)", value: "หย่อนสมรรถภาพทางเพศ" },

  // --- 13. โรคติดเชื้อและอื่นๆ ---
  { label: "HIV/AIDS", value: "HIV" },
  { label: "ไวรัสตับอักเสบ", value: "ไวรัสตับอักเสบ" },
  { label: "ซิฟิลิส (Syphilis)", value: "ซิฟิลิส" },
  { label: "เลือดไหลหยุดยาก (Hemophilia)", value: "ฮีโมฟีเลีย" },
  { label: "ดักแด้ (Ichthyosis)", value: "โรคดักแด้" },
  { label: "ตับอ่อนอักเสบ", value: "ตับอ่อนอักเสบ" },
  { label: "ถุงน้ำในไต (Polycystic Kidney)", value: "ถุงน้ำในไต" },
  { label: "ผนังลำไส้อักเสบ (Diverticulitis)", value: "ผนังลำไส้อักเสบ" },
  { label: "อื่นๆ", value: "อื่นๆ" },
];

const parseInitialValue = (value?: string): Option[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => ({ label: item, value: item }));
};

const toCommaString = (options: Option[] | null): string => {
  if (!options || options.length === 0) return "";
  return options.map((opt) => opt.value).join(", ");
};

const mergeOptions = (base: Option[], extra: Option[]): Option[] => {
  const map = new Map<string, Option>();
  base.forEach((opt) => map.set(opt.value, opt));
  extra.forEach((opt) => {
    if (!map.has(opt.value)) {
      map.set(opt.value, opt);
    }
  });
  const list = Array.from(map.values());
  const otherIndex = list.findIndex((opt) => opt.value === "อื่นๆ");
  if (otherIndex > 0) {
    const [other] = list.splice(otherIndex, 1);
    list.unshift(other);
  }
  return list;
};

const STATIC_VALUES = new Set(STATIC_DISEASES.map((item) => item.value));

const ChronicDiseaseSelect: React.FC<ChronicDiseaseSelectProps> = ({
  initialValue,
  onChange,
  label = "โรคประจำตัว",
  placeholder = "กรอกโรคประจำตัว",
  disabled = false,
  className,
}) => {
  const initialSelected = useMemo(
    () => parseInitialValue(initialValue),
    [initialValue]
  );

  const [options, setOptions] = useState<Option[]>(
    mergeOptions(STATIC_DISEASES, initialSelected)
  );
  const [selected, setSelected] = useState<Option[]>(initialSelected);
  const [allowCustom, setAllowCustom] = useState(
    initialSelected.some((opt) => opt.value === "อื่นๆ")
  );
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setSelected(initialSelected);
    setOptions((prev) => mergeOptions(prev, initialSelected));
    setAllowCustom(initialSelected.some((opt) => opt.value === "อื่นๆ"));
  }, [initialSelected]);

  const trimmedInput = inputValue.trim();
  const canCreate =
    allowCustom &&
    trimmedInput.length > 0 &&
    !options.some((opt) => opt.value === trimmedInput);

  const addCustomOption = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (options.some((opt) => opt.value === trimmed)) return;

    const newOption: Option = { label: trimmed, value: trimmed };
    const nextSelected = [
      ...selected.filter((opt) => opt.value !== "อื่นๆ"),
      newOption,
    ];

    setAllowCustom(true);
    setSelected(nextSelected);
    setOptions((prev) => mergeOptions(prev, [newOption]));
    onChange(toCommaString(nextSelected));
    setInputValue("");
  };
  return (
    <div className={className}>
      {label ? <Form.Label>{label}</Form.Label> : null}
      <CreatableSelect
        isMulti
        isSearchable
        isDisabled={disabled}
        value={selected}
<<<<<<< HEAD
        options={allowCustom ? options.filter(opt => opt.value !== "อื่นๆ") : options}
        placeholder={placeholder}
        filterOption={(candidate, input) => {
          const term = input.trim();
          if (!term) return true;
          if (term.includes("อื่น")) {
            return candidate.value === "อื่นๆ";
          }
          return candidate.label.includes(term) || candidate.value.includes(term);
        }}
=======
        options={options}
        placeholder={placeholder}
>>>>>>> 267c196 (แก้แบบฟอร์มโรคประจำตัว)
        inputValue={inputValue}
        onInputChange={(value) => {
          setInputValue(value);
          return value;
        }}
        onCreateOption={(value) => {
          if (!allowCustom) return;
          addCustomOption(value);
        }}
        isValidNewOption={(inputValue, _, selectOptions) => {
          if (!allowCustom) return false;
          const trimmed = inputValue.trim();
          if (!trimmed) return false;
          return !selectOptions.some(
            (opt) => (opt as Option).value === trimmed
          );
        }}
        formatCreateLabel={(inputValue) =>
          `\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e42\u0e23\u0e04: "${inputValue.trim()}"`
        }
        formatOptionLabel={(option, { context }) => {
          if (option.value === "อื่นๆ") {
            return context === "menu" ? (
              <span className="btn btn-outline-secondary btn-sm">
                อื่นๆ
              </span>
            ) : (
              <span className="badge text-bg-secondary">อื่นๆ</span>
            );
          }
          return option.label;
        }}
        components={{
          MenuList: (props: MenuListProps<Option, true>) => (
            <components.MenuList {...props}>
              {props.children}
              {canCreate ? (
                <div className="border-top px-2 py-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addCustomOption(trimmedInput)}
                  >
                    {"\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19"}
                  </button>
                </div>
              ) : null}
            </components.MenuList>
          ),
        }}
        onChange={(newValue) => {
          const list = (newValue as Option[]) ?? [];
          const hasCustom = list.some(
            (opt) => !STATIC_VALUES.has(opt.value) && opt.value !== "อื่นๆ"
          );
          const nextAllowCustom =
            list.some((opt) => opt.value === "อื่นๆ") || hasCustom;

          const nextSelected =
            hasCustom && list.some((opt) => opt.value === "อื่นๆ")
              ? list.filter((opt) => opt.value !== "อื่นๆ")
              : list;

          const saveList = list.filter((opt) => opt.value !== "อื่นๆ");

          setAllowCustom(nextAllowCustom);
          setSelected(nextSelected);
          setOptions((prev) => mergeOptions(prev, list));
          onChange(toCommaString(saveList));
        }}
        styles={{
          control: (provided: any, state: any) => ({
            ...provided,
            borderColor: "#dee2e6",
            borderWidth: "1px",
            boxShadow: state.isFocused
              ? "0 0 0 0.25rem rgba(13, 110, 253, 0.25)"
              : "none",
            "&:hover": {
              borderColor: "#dee2e6",
            },
            minHeight: "38px",
            backgroundColor: disabled ? "#e9ecef" : "white",
          }),
          placeholder: (provided: any) => ({
            ...provided,
            color: "#6c757d",
          }),
          menu: (provided: any) => ({
            ...provided,
            zIndex: 9999,
          }),
          menuPortal: (provided: any) => ({
            ...provided,
            zIndex: 9999,
          }),
        }}
        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      />
      {allowCustom ? (
        <p className="mt-2 text-xs text-slate-500">
          {"\u0e2b\u0e32\u0e01\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e0a\u0e37\u0e48\u0e2d\u0e42\u0e23\u0e04\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e43\u0e19\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23 \u0e42\u0e1b\u0e23\u0e14\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e0a\u0e37\u0e48\u0e2d\u0e42\u0e23\u0e04 \u0e41\u0e25\u0e49\u0e27\u0e01\u0e14\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19"}
        </p>
      ) : null}
    </div>
  );
};

<<<<<<< HEAD
export default ChronicDiseaseSelect;
=======
export default ChronicDiseaseSelect;
>>>>>>> 267c196 (แก้แบบฟอร์มโรคประจำตัว)
