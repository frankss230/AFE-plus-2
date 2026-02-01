import { useEffect, useMemo, useState } from 'react';

// --- Utility Functions ---
const sortByName = (list = []) =>
  [...list].sort((a, b) =>
    (a.name_th || "").localeCompare(b.name_th || "", "th")
  );

const getLabel = (item) => {
  if (!item) return "";
  const { name_th, name_en } = item;
  return name_th && name_en ? `${name_th} — ${name_en}` : name_th || name_en;
};

// --- Custom Hook (Logic Layer) ---
export const useThaiAddress = () => {
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState({
    provinceId: "",
    districtId: "",
    subDistrictId: "",
    zipCode: "",
  });

  // Fetch Data
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    fetch(
      "https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province_with_district_and_sub_district.json",
      { signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setProvinces(sortByName(data)))
      .catch((e) => {
        if (e.name !== "AbortError") setError("Failed to load data.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  // Derived Lists
  const districts = useMemo(() => {
    const prov = provinces.find((p) => p.id === Number(selected.provinceId));
    return sortByName(prov?.districts);
  }, [provinces, selected.provinceId]);

  const subDistricts = useMemo(() => {
    const dist = districts.find((d) => d.id === Number(selected.districtId));
    return sortByName(dist?.sub_districts);
  }, [districts, selected.districtId]);

  // Get names by ID
  const getProvinceName = (id) => {
    const prov = provinces.find((p) => p.id === Number(id));
    return prov?.name_th || "";
  };

  const getDistrictName = (id) => {
    const dist = districts.find((d) => d.id === Number(id));
    return dist?.name_th || "";
  };

  const getSubDistrictName = (id) => {
    const subDist = subDistricts.find((s) => s.id === Number(id));
    return subDist?.name_th || "";
  };

  // Handlers
  const setProvince = (id) => {
    setSelected({
      provinceId: id,
      districtId: "",
      subDistrictId: "",
      zipCode: "",
    });
  };

  const setDistrict = (id) => {
    setSelected((prev) => ({
      ...prev,
      districtId: id,
      subDistrictId: "",
      zipCode: "",
    }));
  };

  const setSubDistrict = (id) => {
    const subDist = subDistricts.find((s) => s.id === Number(id));
    setSelected((prev) => ({
      ...prev,
      subDistrictId: id,
      zipCode: subDist?.zip_code || "",
    }));
  };

  const reset = () =>
    setSelected({
      provinceId: "",
      districtId: "",
      subDistrictId: "",
      zipCode: "",
    });

  // Set initial values (for editing existing data)
  const setInitialValues = (province, district, subDistrict, zipCode) => {
    // Find province ID by name
    const prov = provinces.find((p) => p.name_th === province);
    if (!prov) return;

    setSelected({
      provinceId: String(prov.id),
      districtId: "",
      subDistrictId: "",
      zipCode: zipCode || "",
    });

    // Wait for districts to load, then find district
    setTimeout(() => {
      const dist = prov.districts?.find((d) => d.name_th === district);
      if (!dist) return;

      setSelected(prev => ({
        ...prev,
        districtId: String(dist.id),
      }));

      // Wait for sub-districts to load, then find sub-district
      setTimeout(() => {
        const subDist = dist.sub_districts?.find((s) => s.name_th === subDistrict);
        if (!subDist) return;

        setSelected(prev => ({
          ...prev,
          subDistrictId: String(subDist.id),
          zipCode: subDist.zip_code || zipCode || "",
        }));
      }, 100);
    }, 100);
  };

  return {
    data: { provinces, districts, subDistricts },
    status: { loading, error },
    selected,
    actions: { 
      setProvince, 
      setDistrict, 
      setSubDistrict, 
      reset,
      setInitialValues 
    },
    getNames: {
      getProvinceName,
      getDistrictName,
      getSubDistrictName
    },
    getLabel
  };
};