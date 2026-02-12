import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import _ from 'lodash';
import { replyNotificationPostbackfall } from '@/utils/apiLineReply';
import axios from 'axios';
import moment from 'moment'; // 

const LINE_PUSH_MESSAGING_API = 'https://api.line.me/v2/bot/message/push';
const LINE_HEADER = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN_LINE}`,
};

type Data = {
    message: string;
    data?: any;
};

export default async function handle(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method === 'PUT' || req.method === 'POST') {
        try {
            const body = req.body;

            // ตรวจสอบพารามิเตอร์เดิมจากไฟล์ที่ 1
            if (
                body.users_id === undefined || body.users_id === null ||
                body.takecare_id === undefined || body.takecare_id === null ||
                body.x_axis === undefined ||
                body.y_axis === undefined ||
                body.z_axis === undefined ||
                body.fall_status === undefined ||
                body.latitude === undefined ||
                body.longitude === undefined
            ) {
                return res.status(400).json({ message: 'error', data: 'Missing parameter' });
            }

            const user = await prisma.users.findFirst({
                where: { users_id: Number(body.users_id) }
            });

            const takecareperson = await prisma.takecareperson.findFirst({
                where: { takecare_id: Number(body.takecare_id), takecare_status: 1 }
            });

            if (!user || !takecareperson) {
                return res.status(200).json({ message: 'error', data: 'ไม่พบข้อมูล user หรือ takecareperson' });
            }

            // --- เริ่ม Logic การกันแจ้งเตือนถี่ (ดึงมาจากไฟล์ที่ 2) ---
            
            // 1. หาข้อมูลการล้มล่าสุด [cite: 12]
            const latest = await prisma.fall_records.findFirst({
                where: {
                    users_id: user.users_id,
                    takecare_id: takecareperson.takecare_id
                },
                orderBy: { noti_time: 'desc' }
            });

            const fallStatus = Number(body.fall_status);
            const previousStatus = latest ? Number(latest.fall_status) : null; // [cite: 14]
            const lastNotiTime = latest?.noti_time ? moment(latest.noti_time) : null;

            // 2. ตั้งค่าเงื่อนไข: จะแจ้งเตือนเมื่อ (สถานะเปลี่ยน) หรือ (สถานะเดิมแต่เกิน 5 นาที) 
            const isCriticalStatus = (fallStatus === 2 || fallStatus === 3);
            const isStatusChanged = previousStatus !== fallStatus; // 
            const isTimeElapsed = !lastNotiTime || moment().diff(lastNotiTime, 'minutes') >= 5;

            let noti_time: Date | null = null;
            let noti_status: number = 0;

            // 3. ตรวจสอบเงื่อนไขก่อนส่ง LINE
            if (isCriticalStatus && (isStatusChanged || isTimeElapsed)) {
                const message = fallStatus === 2
                    ? `คุณ ${takecareperson.takecare_fname} ${takecareperson.takecare_sname} กด "ไม่โอเค" ขอความช่วยเหลือ`
                    : `คุณ ${takecareperson.takecare_fname} ${takecareperson.takecare_sname} ไม่มีการตอบสนองภายใน 30 วินาที`;

                const replyToken = user.users_line_id || '';
                if (replyToken) {
                    // ส่งแจ้งเตือน Flex Message
                    await replyNotificationPostbackfall({
                        replyToken,
                        userId: user.users_id,
                        takecarepersonId: takecareperson.takecare_id,
                        type: 'fall',
                        message
                    });

                    // ส่งตำแหน่ง Location
                    const locationRequest = {
                        to: replyToken,
                        messages: [{
                            type: "location",
                            title: `ตำแหน่งที่ล้มล่าสุด`,
                            address: `ตำแหน่งที่ล้มของ ${takecareperson.takecare_fname} ${takecareperson.takecare_sname}`,
                            latitude: Number(body.latitude),
                            longitude: Number(body.longitude)
                        }]
                    };
                    await axios.post(LINE_PUSH_MESSAGING_API, locationRequest, { headers: LINE_HEADER });

                    noti_status = 1; // บันทึกว่าแจ้งเตือนแล้ว [cite: 14]
                    noti_time = new Date(); // [cite: 13]
                }
            }
            // --- จบ Logic การกันแจ้งเตือนถี่ ---

            // 4. บันทึกข้อมูลลง Database (ใช้ตัวแปรเดิมทั้งหมด)
            await prisma.fall_records.create({
                data: {
                    users_id: user.users_id,
                    takecare_id: takecareperson.takecare_id,
                    x_axis: Number(body.x_axis),
                    y_axis: Number(body.y_axis),
                    z_axis: Number(body.z_axis),
                    fall_latitude: String(body.latitude),
                    fall_longitude: String(body.longitude),
                    fall_status: fallStatus,
                    noti_time: noti_time,
                    noti_status: noti_status
                }
            });

            return res.status(200).json({ message: 'success', data: 'บันทึกข้อมูลเรียบร้อย' });

        } catch (error) {
            console.error("API Error:", error);
            return res.status(400).json({ message: 'error', data: error });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'POST']);
        return res.status(405).json({ message: 'error', data: `วิธี ${req.method} ไม่อนุญาต` });
    }
}