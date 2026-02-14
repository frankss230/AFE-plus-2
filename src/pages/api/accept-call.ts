import type { NextApiRequest, NextApiResponse } from 'next';
import { postbackAccept } from '@/lib/lineFunction';

type Data = {
    message: string;
    tel?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { extenId, takecareId, userLineId, groupId, operatorLineId, tel } = req.body || {};

        if (!extenId || !takecareId || !userLineId || !groupId || !operatorLineId || !tel) {
            return res.status(400).json({ message: 'missing params' });
        }

        const acceptedReplyToken = await postbackAccept({
            type: 'accept',
            acceptMode: 'accept_call',
            extenId: Number(extenId),
            takecareId: Number(takecareId),
            userLineId: String(userLineId),
            groupId: String(groupId),
            userIdAccept: String(operatorLineId),
        });

        if (!acceptedReplyToken) {
            return res.status(409).json({ message: 'case is not available' });
        }

        return res.status(200).json({
            message: 'success',
            tel: String(tel),
        });
    } catch (error) {
        console.error('accept-call error:', error);
        return res.status(500).json({ message: 'error' });
    }
}
