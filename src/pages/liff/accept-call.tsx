import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

declare global {
    interface Window {
        liff?: {
            init: (params: { liffId: string }) => Promise<void>;
            isLoggedIn: () => boolean;
            login: () => void;
            getProfile: () => Promise<{ userId: string }>;
        };
    }
}

const LIFF_SCRIPT = 'https://static.line-scdn.net/liff/edge/2/sdk.js';

const loadLiffScript = async () => {
    if (window.liff) return;

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = LIFF_SCRIPT;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load LIFF SDK'));
        document.body.appendChild(script);
    });
};

export default function AcceptCallPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Preparing...');

    const query = useMemo(() => {
        const { extenId, takecareId, userLineId, groupId, tel } = router.query;
        return {
            extenId: String(extenId || ''),
            takecareId: String(takecareId || ''),
            userLineId: String(userLineId || ''),
            groupId: String(groupId || ''),
            tel: String(tel || ''),
        };
    }, [router.query]);

    useEffect(() => {
        if (!router.isReady) return;

        const run = async () => {
            try {
                if (!query.extenId || !query.takecareId || !query.userLineId || !query.groupId || !query.tel) {
                    setStatus('Missing parameters');
                    return;
                }

                const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
                if (!liffId) {
                    setStatus('Missing NEXT_PUBLIC_LIFF_ID');
                    return;
                }

                setStatus('Loading LINE session...');
                await loadLiffScript();
                if (!window.liff) {
                    setStatus('LIFF unavailable');
                    return;
                }

                await window.liff.init({ liffId });
                if (!window.liff.isLoggedIn()) {
                    window.liff.login();
                    return;
                }

                const profile = await window.liff.getProfile();
                setStatus('Accepting case...');

                const response = await fetch('/api/accept-call', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        extenId: query.extenId,
                        takecareId: query.takecareId,
                        userLineId: query.userLineId,
                        groupId: query.groupId,
                        tel: query.tel,
                        operatorLineId: profile.userId,
                    }),
                });

                if (!response.ok) {
                    setStatus('Failed to accept case');
                    return;
                }

                setStatus('Opening phone...');
                window.location.href = `tel:${query.tel}`;
            } catch (error) {
                console.error('accept-call liff error:', error);
                setStatus('Unexpected error');
            }
        };

        run();
    }, [query.extenId, query.groupId, query.takecareId, query.tel, query.userLineId, router.isReady]);

    return (
        <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
            <h3>Accept and Call</h3>
            <p>{status}</p>
            <p>
                If phone does not open automatically,{' '}
                <a href={`tel:${query.tel}`}>tap here to call</a>.
            </p>
        </main>
    );
}

