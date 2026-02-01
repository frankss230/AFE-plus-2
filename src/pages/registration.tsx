import withCommonData from '@/lib/withCommonData';
import { GetServerSideProps } from 'next';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import ButtonState from '@/components/Button/ButtonState';
import InputLabel from '@/components/Form/InputLabel';
import SelectAddress from '@/components/Form/SelectAddress'; // 🔥 Import component ใหม่
import ModalAlert from '@/components/Modals/ModalAlert';
import axios from 'axios';
import md5 from 'md5';

// Import Validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registrationSchema, RegistrationFormData } from '@/components/validations/registrationSchema'; 

// 🔥 Import Hook ใหม่
import { useThaiAddress } from '@/hooks/useThaiAddress';

import styles from '@/styles/page.module.css';

interface UserData {
    isLogin: boolean;
    data: any | null
}

const Registration = () => {
    const router = useRouter();
    const [alert, setAlert] = useState({ show: false, message: '' });
    const [displayName, setDisplayName] = useState<string>("");
    const [dataUser, setDataUser] = useState<UserData>({ isLogin: true, data: null });

    // 🔥 เรียกใช้ Thai Address Hook
    const { data, status, selected, actions, getNames, getLabel } = useThaiAddress();

    const { 
        register, 
        handleSubmit, 
        reset, 
        watch,
        setValue, // 🔥 เพื่อ sync ค่ากับ form
        formState: { errors, isSubmitting } 
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        mode: "onChange",
        defaultValues: {
            users_pin: "",
            users_tel1: "",
            users_postcode: ""
        }
    });

    // 🔥 Sync ค่าจาก dropdown ไปยัง form
    useEffect(() => {
        if (selected.provinceId) {
            setValue('users_province', getNames.getProvinceName(selected.provinceId));
        }
        if (selected.districtId) {
            setValue('users_amphur', getNames.getDistrictName(selected.districtId));
        }
        if (selected.subDistrictId) {
            setValue('users_tubon', getNames.getSubDistrictName(selected.subDistrictId));
        }
        if (selected.zipCode) {
            setValue('users_postcode', selected.zipCode);
        }
    }, [selected, setValue, getNames]);

    const isFieldValid = (name: keyof RegistrationFormData) => {
        const value = watch(name);
        return !errors[name] && !!value && value.toString().trim() !== "";
    };

    useEffect(() => {
        const auToken = router.query.auToken
        if (auToken) {
            onGetUserProfile(auToken as string)
            onGetUserData(auToken as string)
        }
    }, [router.query.auToken])

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

    const onGetUserData = async (auToken: string) => {
        try {
            const responseUser = await axios.get(`${process.env.WEB_DOMAIN}/api/user/getUser/${auToken}`);
            if (responseUser.data?.data) {
                const userData = responseUser.data.data;
                setDataUser({ isLogin: false, data: userData });
                
                reset({
                    users_fname: userData.users_fname,
                    users_sname: userData.users_sname,
                    users_pin: userData.users_pin,
                    users_number: userData.users_number,
                    users_moo: userData.users_moo,
                    users_road: userData.users_road,
                    users_tubon: userData.users_tubon,
                    users_amphur: userData.users_amphur,
                    users_province: userData.users_province,
                    users_postcode: userData.users_postcode,
                    users_tel1: userData.users_tel1,
                });

                // 🔥 Set initial address values for dropdown
                if (userData.users_province && userData.users_amphur && userData.users_tubon) {
                    actions.setInitialValues(
                        userData.users_province,
                        userData.users_amphur,
                        userData.users_tubon,
                        userData.users_postcode
                    );
                }

            } else {
                setDataUser({ isLogin: false, data: null })
            }
        } catch (error) {
            setDataUser({ isLogin: false, data: null })
            setAlert({ show: true, message: 'ระบบไม่สามารถดึงข้อมูลของท่านได้ กรุณาลองใหม่อีกครั้ง' })
        }
    }

    const onSubmit = async (formData: RegistrationFormData) => {
        try {
            if (!dataUser.data && (!formData.users_passwd || !formData.users_passwd_comfirm)) {
                setAlert({ show: true, message: 'กรุณากรอกรหัสผ่าน' });
                return;
            }

            const data = {
                users_line_id: router.query.auToken,
                users_fname: formData.users_fname,
                users_passwd: formData.users_passwd ? md5(formData.users_passwd) : undefined,
                users_pin: formData.users_pin,
                status_id: 1,
                users_sname: formData.users_sname,
                users_number: formData.users_number,
                users_moo: formData.users_moo,
                users_road: formData.users_road,
                users_tubon: formData.users_tubon,
                users_amphur: formData.users_amphur,
                users_province: formData.users_province,
                users_postcode: formData.users_postcode,
                users_tel1: formData.users_tel1,
            }

            await axios.post(`${process.env.WEB_DOMAIN}/api/registration/create`, data)
            
            if (typeof router.query.auToken === 'string') {
                onGetUserData(router.query.auToken);
            }
            setAlert({ show: true, message: 'บันทึกข้อมูลสำเร็จ' })

        } catch (error) {
            setAlert({ show: true, message: 'ไม่สามารถบันทึกข้อมูลได้' })
        }
    };

    return (
        <Container>
            <div className={styles.main}>
                <Image src={'/images/Logo.png'} width={100} height={100} alt="Logo" priority />
                <h1 className="py-2">ลงทะเบียน</h1>
            </div>
            <div className="px-5">
                <Form noValidate onSubmit={handleSubmit(onSubmit)}>
                    
                    <Form.Group>
                        <InputLabel label="LINE-USER" id="lineUser" defaultValue={displayName} disabled required />
                    </Form.Group>
                    
                    <InputLabel 
                        label="ชื่อ" 
                        id="users_fname" 
                        placeholder="กรอกชื่อ" 
                        disabled={!!dataUser.data}
                        {...register("users_fname")}
                        isInvalid={!!errors.users_fname}
                        errorMessage={errors.users_fname?.message}
                        isValid={isFieldValid("users_fname")}
                    />

                    <InputLabel 
                        label="นามสกุล" 
                        id="users_sname" 
                        placeholder="กรอกนามสกุล" 
                        disabled={!!dataUser.data}
                        {...register("users_sname")}
                        isInvalid={!!errors.users_sname}
                        errorMessage={errors.users_sname?.message}
                        isValid={isFieldValid("users_sname")}
                    />

                    {
                        !dataUser.data && (
                            <>
                                <InputLabel 
                                    label="รหัสผ่าน" 
                                    id="users_passwd" 
                                    placeholder="กรอกรหัสผ่าน" 
                                    type="password" 
                                    {...register("users_passwd")}
                                    isInvalid={!!errors.users_passwd}
                                    errorMessage={errors.users_passwd?.message}
                                    isValid={isFieldValid("users_passwd")}
                                />
                                <InputLabel 
                                    label="รหัสผ่าน (อีกครั้ง)" 
                                    id="users_passwd_comfirm" 
                                    type="password" 
                                    placeholder="ยืนยันรหัสผ่าน" 
                                    {...register("users_passwd_comfirm")}
                                    isInvalid={!!errors.users_passwd_comfirm}
                                    errorMessage={errors.users_passwd_comfirm?.message}
                                    isValid={isFieldValid("users_passwd_comfirm")}
                                />
                            </>
                        )
                    }

                    <InputLabel 
                        label="Pin 4 หลัก" 
                        id="users_pin" 
                        placeholder="1234" 
                        type="tel" 
                        max={4}
                        disabled={!!dataUser.data}
                        {...register("users_pin")}
                        isInvalid={!!errors.users_pin}
                        errorMessage={errors.users_pin?.message}
                        isValid={isFieldValid("users_pin")}
                    />

                    <InputLabel 
                        label="เลขที่บ้าน" 
                        id="users_number" 
                        placeholder="123/12" 
                        disabled={!!dataUser.data} 
                        {...register("users_number")} 
                        isValid={isFieldValid("users_number")}
                    />
                    <InputLabel 
                        label="หมู่" 
                        id="users_moo" 
                        placeholder="1" 
                        disabled={!!dataUser.data} 
                        {...register("users_moo")}
                        isValid={isFieldValid("users_moo")}
                    />
                    <InputLabel 
                        label="ถนน" 
                        id="users_road" 
                        placeholder="-" 
                        disabled={!!dataUser.data} 
                        {...register("users_road")}
                        isValid={isFieldValid("users_road")}
                    />
                    
                    {/* 🔥 เปลี่ยนจาก Input เป็น Dropdown */}
                    {status.loading ? (
                        <p className="text-muted">กำลังโหลดข้อมูลจังหวัด...</p>
                    ) : (
                        <>
                            <SelectAddress
                                label="จังหวัด"
                                id="users_province"
                                value={selected.provinceId}
                                options={data.provinces}
                                onChange={actions.setProvince}
                                disabled={!!dataUser.data || status.loading || !!status.error}
                                placeholder="เลือกจังหวัด"
                                isInvalid={!!errors.users_province}
                                errorMessage={errors.users_province?.message}
                                isValid={isFieldValid("users_province")}
                                required
                                getLabel={getLabel}
                            />

                            <SelectAddress
                                label="อำเภอ"
                                id="users_amphur"
                                value={selected.districtId}
                                options={data.districts}
                                onChange={actions.setDistrict}
                                disabled={!!dataUser.data || !selected.provinceId}
                                placeholder={!selected.provinceId ? "เลือกจังหวัดก่อน" : "เลือกอำเภอ"}
                                isInvalid={!!errors.users_amphur}
                                errorMessage={errors.users_amphur?.message}
                                isValid={isFieldValid("users_amphur")}
                                required
                                getLabel={getLabel}
                            />

                            <SelectAddress
                                label="ตำบล"
                                id="users_tubon"
                                value={selected.subDistrictId}
                                options={data.subDistricts}
                                onChange={actions.setSubDistrict}
                                disabled={!!dataUser.data || !selected.districtId}
                                placeholder={!selected.districtId ? "เลือกอำเภอก่อน" : "เลือกตำบล"}
                                isInvalid={!!errors.users_tubon}
                                errorMessage={errors.users_tubon?.message}
                                isValid={isFieldValid("users_tubon")}
                                required
                                getLabel={getLabel}
                            />
                        </>
                    )}
                    
                    <InputLabel 
                        label="รหัสไปรษณีย์" 
                        id="users_postcode" 
                        placeholder="กรอกรหัสไปรษณีย์" 
                        type="tel" 
                        max={5}
                        disabled={!!dataUser.data}
                        {...register("users_postcode")}
                        isInvalid={!!errors.users_postcode}
                        errorMessage={errors.users_postcode?.message}
                        isValid={isFieldValid("users_postcode")}
                        readOnly // 🔥 ทำให้เป็น read-only เพราะจะถูกกรอกอัตโนมัติ
                    />
                    
                    <InputLabel 
                        label="เบอร์โทรศัพท์" 
                        id="users_tel1" 
                        placeholder="กรอกเบอร์โทรศัพท์" 
                        type="tel" 
                        max={10}
                        disabled={!!dataUser.data} 
                        {...register("users_tel1")}
                        isInvalid={!!errors.users_tel1}
                        errorMessage={errors.users_tel1?.message}
                        isValid={isFieldValid("users_tel1")}
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
    title: 'ลงทะเบียน',
    description: 'ลงทะเบียน',
    slug: '',
    titleBar: 'ลงทะเบียน'
});

export default Registration