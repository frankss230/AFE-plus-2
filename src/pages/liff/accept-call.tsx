import { useEffect, useState } from 'react';
import type { Liff } from '@line/liff';

declare global {
    interface Window {
        liff: Liff | undefined;
    }
}

interface QueryParams {
    extenId: string;
    takecareId: string;
    userLineId: string;
    groupId: string;
    tel: string;
}

export default function AcceptCallPage() {
    const [status, setStatus] = useState('กำลังเตรียมข้อมูล...');
    const [error, setError] = useState<string | null>(null);
    const [telNumber, setTelNumber] = useState<string>('');

    useEffect(() => {
        const initializeLiff = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
                
                if (!liffId) {
                    throw new Error('ไม่พบ LIFF ID ในการตั้งค่า');
                }

                // โหลด LIFF SDK
                setStatus('กำลังเชื่อมต่อกับ LINE...');
                const liff = (await import('@line/liff')).default;
                
                // เริ่มต้น LIFF
                await liff.init({ liffId });

                // ตรวจสอบการ login
                if (!liff.isLoggedIn()) {
                    setStatus('กำลังเข้าสู่ระบบ LINE...');
                    liff.login();
                    return;
                }

                // ดึง URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const params: QueryParams = {
                    extenId: urlParams.get('extenId') || '',
                    takecareId: urlParams.get('takecareId') || '',
                    userLineId: urlParams.get('userLineId') || '',
                    groupId: urlParams.get('groupId') || '',
                    tel: urlParams.get('tel') || '',
                };

                // Validate parameters
                if (!params.extenId || !params.takecareId || !params.userLineId || 
                    !params.groupId || !params.tel) {
                    throw new Error('ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง');
                }

                setTelNumber(params.tel);

                // ดึงข้อมูลผู้ใช้
                const profile = await liff.getProfile();
                setStatus('กำลังรับเคส...');

                // เรียก API เพื่อรับเคส
                const response = await fetch('/api/accept-call', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                        extenId: params.extenId,
                        takecareId: params.takecareId,
                        userLineId: params.userLineId,
                        groupId: params.groupId,
                        tel: params.tel,
                        operatorLineId: profile.userId,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'ไม่สามารถรับเคสได้');
                }

                setStatus('เปิดแอปโทรศัพท์...');
                
                // เปิดแอปโทรศัพท์
                setTimeout(() => {
                    window.location.href = `tel:${params.tel}`;
                }, 500);

            } catch (err) {
                console.error('LIFF Error:', err);
                const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
                setError(errorMessage);
                setStatus('เกิดข้อผิดพลาด');
            }
        };

        initializeLiff();
    }, []);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h1 style={styles.title}>รับเคสและโทร</h1>
                
                <div style={styles.statusSection}>
                    {error ? (
                        <>
                            <div style={styles.errorIcon}>⚠️</div>
                            <p style={styles.errorText}>{error}</p>
                        </>
                    ) : (
                        <>
                            <div style={styles.loadingIcon}>⏳</div>
                            <p style={styles.statusText}>{status}</p>
                        </>
                    )}
                </div>

                {telNumber && (
                    <div style={styles.callSection}>
                        <p style={styles.instructionText}>
                            หากไม่มีการเปิดแอปโทรศัพท์อัตโนมัติ
                        </p>
                        <a 
                            href={`tel:${telNumber}`} 
                            style={styles.callButton}
                            onClick={() => setStatus('กำลังเปิดแอปโทรศัพท์...')}
                        >
                            📞 กดที่นี่เพื่อโทร
                        </a>
                        <p style={styles.phoneNumber}>เบอร์: {telNumber}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    },
    title: {
        color: '#ff0000',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '24px',
        textAlign: 'center',
    },
    statusSection: {
        textAlign: 'center',
        marginBottom: '24px',
    },
    loadingIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    errorIcon: {
        fontSize: '48px',
        marginBottom: '16px',
    },
    statusText: {
        color: '#555',
        fontSize: '16px',
        margin: 0,
    },
    errorText: {
        color: '#ff0000',
        fontSize: '16px',
        margin: 0,
    },
    callSection: {
        borderTop: '1px solid #eee',
        paddingTop: '24px',
        textAlign: 'center',
    },
    instructionText: {
        color: '#777',
        fontSize: '14px',
        marginBottom: '16px',
    },
    callButton: {
        display: 'inline-block',
        backgroundColor: '#ff0000',
        color: 'white',
        padding: '14px 28px',
        borderRadius: '8px',
        textDecoration: 'none',
        fontSize: '16px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    },
    phoneNumber: {
        color: '#999',
        fontSize: '14px',
        marginTop: '12px',
    },
};