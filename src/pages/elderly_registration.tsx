import React, { useEffect, useState } from 'react'
import { GetServerSideProps } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import Container from 'react-bootstrap/Container';

import withCommonData from '@/lib/withCommonData';

import styles from '@/styles/page.module.css'

import Form from 'react-bootstrap/Form';

import InputLabel from '@/components/Form/InputLabel'
import SelectAddress from '@/components/Form/SelectAddress';
import ModalAlert from '@/components/Modals/ModalAlert'
import ButtonState from '@/components/Button/ButtonState';
import DatePickerX from '@/components/DatePicker/DatePickerX';
import { encrypt } from '@/utils/helpers'

// 🔥 Import Validation
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { elderlyRegistrationSchema, ElderlyRegistrationFormData } from '@/components/validations/elderlyRegistrationSchema';

// 🔥 Import Hook
import { useThaiAddress } from '@/hooks/useThaiAddress';

import axios from 'axios';


interface UserTakecareData {
    isLogin: boolean;
    data:{
        users_id         ?: number;
        takecare_fname   ?: string;
        takecare_sname   ?: string;
        takecare_birthday?: string;
        gender_id        ?: number;
        marry_id         ?: number;
        takecare_number  ?: string;
        takecare_moo     ?: string;
        takecare_road    ?: string;
        takecare_tubon   ?: string;
        takecare_amphur  ?: string;
        takecare_province?: string;
        takecare_postcode?: string;
        takecare_tel1    ?: string;
        takecare_disease ?: string;
        takecare_drug    ?: string;
        takecare_status  ?: number;
    } | null;
    users_id: number | null;
}

const ElderlyRegistration = () => {
    const router = useRouter();

    const [alert, setAlert] = useState({ show: false, message: '' });
    const [displayName, setDisplayName] = useState<string>("");
    const [dataUser, setDataUser] = useState<UserTakecareData>({ isLogin: true, data: null, users_id: null });
    const [masterGender, setMasterGender] = useState<[]>([]);
    const [masterMarry, setMasterMarry] = useState<[]>([]);

    // 🔥 เรียกใช้ Thai Address Hook
    const { data, status, selected, actions, getNames, getLabel } = useThaiAddress();

    // 🔥 ใช้ React Hook Form
    const { 
        register, 
        handleSubmit, 
        reset, 
        watch,
        setValue,
        control,
        formState: { errors, isSubmitting } 
    } = useForm<ElderlyRegistrationFormData>({
        resolver: zodResolver(elderlyRegistrationSchema),
        mode: "onChange",
        defaultValues: {
            takecare_birthday: new Date(),
            gender_id: 1,
            marry_id: 1,
        }
    });

    // 🔥 Sync ค่าจาก dropdown ไปยัง form
    useEffect(() => {
        if (selected.provinceId) {
            setValue('takecare_province', getNames.getProvinceName(selected.provinceId));
        }
        if (selected.districtId) {
            setValue('takecare_amphur', getNames.getDistrictName(selected.districtId));
        }
        if (selected.subDistrictId) {
            setValue('takecare_tubon', getNames.getSubDistrictName(selected.subDistrictId));
        }
        if (selected.zipCode) {
            setValue('takecare_postcode', selected.zipCode);
        }
    }, [selected, setValue, getNames]);

    // 🔥 ฟังก์ชันเช็คว่าควรขึ้น "สีเขียว" หรือไม่
    const isFieldValid = (name: keyof ElderlyRegistrationFormData) => {
        const value = watch(name);
        if (name === 'takecare_birthday' || name === 'gender_id' || name === 'marry_id') {
            return !errors[name] && !!value;
        }
        return !errors[name] && !!value && value.toString().trim() !== "";
    };

    useEffect(() => {
        getMasterData()
        const auToken = router.query.auToken

        if (auToken && typeof auToken === 'string') {
            onGetUserProfile(auToken)
            
            // เรียกใช้ตรงๆ แทนการพึ่ง function
            const fetchUserData = async () => {
                try {
                    const responseUser = await axios.get(`${process.env.WEB_DOMAIN}/api/user/getUser/${auToken}`);
                    if(responseUser.data?.data){
                        const encodedUsersId = encrypt(responseUser.data?.data.users_id.toString());
                        
                        const responseTakecareperson = await axios.get(`${process.env.WEB_DOMAIN}/api/user/getUserTakecareperson/${encodedUsersId}`);
                        const takecareData = responseTakecareperson.data?.data;
                        
                        if(takecareData){
                            // 🔥 ใช้ reset เพื่อกำหนดค่าเริ่มต้นให้กับ form
                            reset({
                                takecare_fname: takecareData.takecare_fname,
                                takecare_sname: takecareData.takecare_sname,
                                takecare_birthday: new Date(takecareData.takecare_birthday),
                                gender_id: takecareData.gender_id,
                                marry_id: takecareData.marry_id,
                                takecare_number: takecareData.takecare_number,
                                takecare_moo: takecareData.takecare_moo,
                                takecare_road: takecareData.takecare_road,
                                takecare_tubon: takecareData.takecare_tubon,
                                takecare_amphur: takecareData.takecare_amphur,
                                takecare_province: takecareData.takecare_province,
                                takecare_postcode: takecareData.takecare_postcode,
                                takecare_tel1: takecareData.takecare_tel1,
                                takecare_disease: takecareData.takecare_disease,
                                takecare_drug: takecareData.takecare_drug,
                            });
                        }
                        
                        setDataUser({ 
                            isLogin: false, 
                            data: takecareData, 
                            users_id: responseUser.data?.data.users_id 
                        });
                    }else{
                        setDataUser({ isLogin: false, data: null, users_id: null })
                    }
                } catch (error) {
                    console.log("🚀 ~ file: elderly-registration.tsx ~ fetchUserData ~ error:", error)
                    setDataUser({ isLogin: false, data: null, users_id: null })
                    setAlert({ show: true, message: 'ระบบไม่สามารถดึงข้อมูลของท่านได้ กรุณาลองใหม่อีกครั้ง' })
                }
            };
            
            fetchUserData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.query.auToken])

    // 🔥 useEffect แยกสำหรับ set dropdown เมื่อข้อมูลจังหวัดโหลดเสร็จแล้ว
    useEffect(() => {
        if (dataUser.data && data.provinces.length > 0) {
            const takecareData = dataUser.data;
            // Set initial address values for dropdown
            if (takecareData.takecare_province && takecareData.takecare_amphur && takecareData.takecare_tubon) {
                actions.setInitialValues(
                    takecareData.takecare_province,
                    takecareData.takecare_amphur,
                    takecareData.takecare_tubon,
                    takecareData.takecare_postcode
                );
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataUser.data, data.provinces.length])

    const getMasterData = async () => {
        try {
            const response1 = await axios.get(`${process.env.WEB_DOMAIN}/api/master/getGender`);
            const response2 = await axios.get(`${process.env.WEB_DOMAIN}/api/master/getMarry`);
            if (response1.data) {
                setMasterGender(response1.data.data)
            }
            if (response2.data) {
                setMasterMarry(response2.data.data)
            }
        } catch (error) {
            setAlert({ show: true, message: 'ไม่สามารถดึงข้อมูล Master ได้' })
        }
    }

    const onGetUserProfile = async (auToken: string) => {
        try {
            const response = await axios.get(`${process.env.WEB_DOMAIN}/api/getProfile?id=${auToken}`);
            if (response.data) {
                setDisplayName(response.data.data?.displayName)
            }
        } catch (error) {
            setAlert({ show: true, message: 'ระบบไม่สามารถดึงข้อมูล LINE ของท่านได้ กรุณาลองใหม่อีกครั้ง' })
        }
    }

    const onSubmit = async (formData: ElderlyRegistrationFormData) => {
        try {
            if(!dataUser.users_id){
                setAlert({ show: true, message: 'ไม่พบข้อมูลผู้ใช้' })
                return;
            }

            const data = {
                users_id         : dataUser.users_id,
                takecare_fname   : formData.takecare_fname,
                takecare_sname   : formData.takecare_sname,
                takecare_birthday: formData.takecare_birthday,
                gender_id        : formData.gender_id,
                marry_id         : formData.marry_id,
                takecare_number  : formData.takecare_number,
                takecare_moo     : formData.takecare_moo,
                takecare_road    : formData.takecare_road,
                takecare_tubon   : formData.takecare_tubon,
                takecare_amphur  : formData.takecare_amphur,
                takecare_province: formData.takecare_province,
                takecare_postcode: formData.takecare_postcode,
                takecare_tel1    : formData.takecare_tel1,
                takecare_disease : formData.takecare_disease,
                takecare_drug    : formData.takecare_drug,
            }

            await axios.post(`${process.env.WEB_DOMAIN}/api/registration/takecareperson`, data)
            
            // Reload data
            if (router.query.auToken && typeof router.query.auToken === 'string') {
                const responseUser = await axios.get(`${process.env.WEB_DOMAIN}/api/user/getUser/${router.query.auToken}`);
                if(responseUser.data?.data){
                    const encodedUsersId = encrypt(responseUser.data?.data.users_id.toString());
                    const responseTakecareperson = await axios.get(`${process.env.WEB_DOMAIN}/api/user/getUserTakecareperson/${encodedUsersId}`);
                    setDataUser({ 
                        isLogin: false, 
                        data: responseTakecareperson.data?.data, 
                        users_id: responseUser.data?.data.users_id 
                    });
                }
            }
            
            setAlert({ show: true, message: 'บันทึกข้อมูลสำเร็จ' })

        } catch (error) {
            setAlert({ show: true, message: 'ไม่สามารถบันทึกข้อมูลได้' })
        }
    };

    if (dataUser.isLogin) return null;

    return (
        <Container>
            <div className={styles.main}>
                <Image src={'/images/Logo.png'} width={100} height={100} alt="Logo" priority />
                <h1 className="py-2">ลงทะเบียนผู้สูงอายุ</h1>
            </div>
            <div className="px-5">
                <Form noValidate onSubmit={handleSubmit(onSubmit)}>
                    <Form.Group>
                        <InputLabel label="LINE-USER" id="lineUser" defaultValue={displayName} disabled required />
                    </Form.Group>
                    
                    <InputLabel 
                        label="ชื่อ" 
                        id="takecare_fname" 
                        placeholder="กรอกชื่อ" 
                        disabled={!!dataUser.data}
                        {...register("takecare_fname")}
                        isInvalid={!!errors.takecare_fname}
                        errorMessage={errors.takecare_fname?.message}
                        isValid={isFieldValid("takecare_fname")}
                        required
                    />

                    <InputLabel 
                        label="นามสกุล" 
                        id="takecare_sname" 
                        placeholder="กรอกนามสกุล" 
                        disabled={!!dataUser.data}
                        {...register("takecare_sname")}
                        isInvalid={!!errors.takecare_sname}
                        errorMessage={errors.takecare_sname?.message}
                        isValid={isFieldValid("takecare_sname")}
                        required
                    />

                    <Form.Group className="mb-3">
                        <Form.Label>วันเดือนปีเกิด <span className="text-danger">*</span></Form.Label>
                        <Controller
                            name="takecare_birthday"
                            control={control}
                            render={({ field }) => (
                                <DatePickerX 
                                    selected={field.value} 
                                    onChange={(date) => field.onChange(date)} 
                                    disabled={!!dataUser.data} 
                                />
                            )}
                        />
                        {errors.takecare_birthday && (
                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                {errors.takecare_birthday.message}
                            </Form.Control.Feedback>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>เพศ <span className="text-danger">*</span></Form.Label>
                        <div className="d-flex justify-content-around">
                            {
                                masterGender.length > 0 && masterGender.map((item: any) => {
                                    const genderId = Number(item.gender_id);
                                    return (
                                        <Form.Check
                                            key={`gender-${genderId}`}
                                            label={item.gender_describe}
                                            type="radio"
                                            id={`gender-${genderId}`}
                                            value={genderId}
                                            disabled={!!dataUser.data}
                                            {...register("gender_id")}
                                            onChange={(e) => {
                                                setValue("gender_id", Number(e.target.value)); // 🔥 แปลงเป็น number
                                            }}
                                        />
                                    )
                                })
                            }
                        </div>
                        {errors.gender_id && (
                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                {errors.gender_id.message}
                            </Form.Control.Feedback>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>สถานะการสมรส <span className="text-danger">*</span></Form.Label>
                        <div className="px-4">
                            {
                                masterMarry.length > 0 && masterMarry.map((item: any) => {
                                    const marryId = Number(item.marry_id);
                                    return (
                                        <Form.Check
                                            key={`marry-${marryId}`}
                                            className="py-1"
                                            label={item.marry_describe}
                                            type="radio"
                                            id={`marry-${marryId}`}
                                            value={marryId}
                                            disabled={!!dataUser.data}
                                            {...register("marry_id")}
                                            onChange={(e) => {
                                                setValue("marry_id", Number(e.target.value)); // 🔥 แปลงเป็น number
                                            }}
                                        />
                                    )
                                })
                            }
                        </div>
                        {errors.marry_id && (
                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                {errors.marry_id.message}
                            </Form.Control.Feedback>
                        )}
                    </Form.Group>

                    <InputLabel 
                        label="เลขที่บ้าน" 
                        id="takecare_number" 
                        placeholder="123/12" 
                        max={10}
                        disabled={!!dataUser.data}
                        {...register("takecare_number")}
                        isValid={isFieldValid("takecare_number")}
                    />

                    <InputLabel 
                        label="หมู่" 
                        id="takecare_moo" 
                        placeholder="1" 
                        max={5}
                        disabled={!!dataUser.data}
                        {...register("takecare_moo")}
                        isValid={isFieldValid("takecare_moo")}
                    />

                    <InputLabel 
                        label="ถนน" 
                        id="takecare_road" 
                        placeholder="-"
                        disabled={!!dataUser.data}
                        {...register("takecare_road")}
                        isValid={isFieldValid("takecare_road")}
                    />

                    {/* 🔥 Dropdown สำหรับที่อยู่ */}
                    {status.loading ? (
                        <p className="text-muted">กำลังโหลดข้อมูลจังหวัด...</p>
                    ) : (
                        <>
                            <input type="hidden" {...register("takecare_province")} />
                            <input type="hidden" {...register("takecare_amphur")} />
                            <input type="hidden" {...register("takecare_tubon")} />
                            
                            <SelectAddress
                                label="จังหวัด"
                                id="takecare_province"
                                value={selected.provinceId}
                                options={data.provinces}
                                onChange={actions.setProvince}
                                disabled={!!dataUser.data || status.loading || !!status.error}
                                placeholder="เลือกจังหวัด"
                                isInvalid={!!errors.takecare_province}
                                errorMessage={errors.takecare_province?.message}
                                isValid={isFieldValid("takecare_province")}
                                required
                                getLabel={getLabel}
                            />

                            <SelectAddress
                                label="อำเภอ"
                                id="takecare_amphur"
                                value={selected.districtId}
                                options={data.districts}
                                onChange={actions.setDistrict}
                                disabled={!!dataUser.data || !selected.provinceId}
                                placeholder={!selected.provinceId ? "เลือกจังหวัดก่อน" : "เลือกอำเภอ"}
                                isInvalid={!!errors.takecare_amphur}
                                errorMessage={errors.takecare_amphur?.message}
                                isValid={isFieldValid("takecare_amphur")}
                                required
                                getLabel={getLabel}
                            />

                            <SelectAddress
                                label="ตำบล"
                                id="takecare_tubon"
                                value={selected.subDistrictId}
                                options={data.subDistricts}
                                onChange={actions.setSubDistrict}
                                disabled={!!dataUser.data || !selected.districtId}
                                placeholder={!selected.districtId ? "เลือกอำเภอก่อน" : "เลือกตำบล"}
                                isInvalid={!!errors.takecare_tubon}
                                errorMessage={errors.takecare_tubon?.message}
                                isValid={isFieldValid("takecare_tubon")}
                                required
                                getLabel={getLabel}
                            />
                        </>
                    )}

                    <InputLabel 
                        label="รหัสไปรษณีย์" 
                        id="takecare_postcode" 
                        placeholder="รหัสไปรษณีย์จะถูกกรอกอัตโนมัติ" 
                        type="tel"
                        max={5}
                        disabled={!!dataUser.data}
                        {...register("takecare_postcode")}
                        isInvalid={!!errors.takecare_postcode}
                        errorMessage={errors.takecare_postcode?.message}
                        isValid={isFieldValid("takecare_postcode")}
                        readOnly
                        required
                    />

                    <InputLabel 
                        label="เบอร์โทรศัพท์" 
                        id="takecare_tel1" 
                        placeholder="กรอกเบอร์โทรศัพท์" 
                        type="tel"
                        max={10}
                        disabled={!!dataUser.data}
                        {...register("takecare_tel1")}
                        isInvalid={!!errors.takecare_tel1}
                        errorMessage={errors.takecare_tel1?.message}
                        isValid={isFieldValid("takecare_tel1")}
                        required
                    />

                    <InputLabel 
                        label="โรคประจำตัว" 
                        id="takecare_disease" 
                        placeholder="กรอกโรคประจำตัว"
                        disabled={!!dataUser.data}
                        {...register("takecare_disease")}
                        isValid={isFieldValid("takecare_disease")}
                    />

                    <InputLabel 
                        label="ยาที่ใช้ประจำ" 
                        id="takecare_drug" 
                        placeholder="กรอกยาที่ใช้ประจำ"
                        disabled={!!dataUser.data}
                        {...register("takecare_drug")}
                        isValid={isFieldValid("takecare_drug")}
                    />

                    {
                        !dataUser.data && (
                            <Form.Group className="d-flex justify-content-center py-3">
                                <ButtonState 
                                    type="submit" 
                                    className={styles.button} 
                                    text={'บันทึก'} 
                                    icon="fas fa-save" 
                                    isLoading={isSubmitting} 
                                />
                            </Form.Group>
                        )
                    }
                    
                </Form>
            </div>
            <ModalAlert show={alert.show} message={alert.message} handleClose={() => setAlert({ show: false, message: '' })} />
        </Container>
    )
}

export const getServerSideProps: GetServerSideProps = withCommonData({
    title: 'ลงทะเบียนผู้สูงอายุ',
    description: 'ลงทะเบียนผู้สูงอายุ',
    slug: '',
    titleBar: 'ลงทะเบียนผู้สูงอายุ'
});

export default ElderlyRegistration