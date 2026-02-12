import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import _ from 'lodash';
import { replyNotificationPostbackTemp } from '@/utils/apiLineReply';
import moment from 'moment';

type Data = {
    message: string;
    data?: any;
};

export default async function handle(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method === 'PUT' || req.method === 'POST') {
        try {
            const body = req.body;

            if (!body.uId || !body.takecare_id || !body.temperature_value) {
                return res.status(400).json({ message: 'error', data: 'Missing parameter: uId, takecare_id, temperature_value' });
            }

            if (_.isNaN(Number(body.uId)) || _.isNaN(Number(body.takecare_id)) || _.isNaN(Number(body.status))) {
                return res.status(400).json({ message: 'error', data: 'uId, takecare_id, status must be numeric' });
            }

            const user = await prisma.users.findFirst({
                where: { users_id: Number(body.uId) },
                include: {
                    users_status_id: {
                        select: { status_name: true }
                    }
                }
            });

            const takecareperson = await prisma.takecareperson.findFirst({
                where: {
                    takecare_id: Number(body.takecare_id),
                    takecare_status: 1
                }
            });

            if (!user || !takecareperson) {
                return res.status(200).json({ message: 'error', data: 'User or takecareperson not found' });
            }

            const settingTemp = await prisma.temperature_settings.findFirst({
                where: {
                    takecare_id: takecareperson.takecare_id,
                    users_id: user.users_id
                }
            });

            const temperatureValue = Number(body.temperature_value);
            let calculatedStatus = Number(body.status);

            if (settingTemp && temperatureValue > settingTemp.max_temperature) {
                calculatedStatus = 1;
            } else {
                calculatedStatus = 0;
            }

            const status = calculatedStatus;

            const temp = await prisma.temperature_records.findFirst({
                where: {
                    users_id: user.users_id,
                    takecare_id: takecareperson.takecare_id
                },
                orderBy: {
                    noti_time: 'desc'
                }
            });

            // Keep previous notification state by default, then override only when needed.
            let noti_time: Date | null = temp?.noti_time ?? null;
            let noti_status: number | null = temp?.noti_status ?? 0;

            const minutesSinceLastNoti = temp?.noti_time
                ? moment().diff(moment(temp.noti_time), 'minutes')
                : null;

            const shouldNotify =
                status === 1 && (
                    !temp ||
                    temp.noti_status !== 1 ||
                    !temp.noti_time ||
                    (minutesSinceLastNoti !== null && minutesSinceLastNoti >= 5)
                );

            if (shouldNotify) {
                const message = `Patient ${takecareperson.takecare_fname} ${takecareperson.takecare_sname}\nBody temperature is above threshold`;

                const replyToken = user.users_line_id || '';
                if (replyToken) {
                    await replyNotificationPostbackTemp({
                        replyToken,
                        userId: user.users_id,
                        takecarepersonId: takecareperson.takecare_id,
                        type: 'temperature',
                        message
                    });
                }

                noti_status = 1;
                noti_time = new Date();
                console.log('Temperature notification sent');
            } else if (status === 1) {
                console.log(`Skip temperature notification: still in cooldown (${minutesSinceLastNoti ?? 0} minute(s))`);
            }

            if (status === 0) {
                noti_status = 0;
                noti_time = null;
                console.log('Temperature is in normal range');
            }

            if (temp) {
                await prisma.temperature_records.update({
                    where: {
                        temperature_id: temp.temperature_id
                    },
                    data: {
                        temperature_value: temperatureValue,
                        record_date: new Date(),
                        status: status,
                        noti_time: noti_time,
                        noti_status: noti_status
                    }
                });
            } else {
                await prisma.temperature_records.create({
                    data: {
                        users_id: user.users_id,
                        takecare_id: takecareperson.takecare_id,
                        temperature_value: temperatureValue,
                        record_date: new Date(),
                        status: status,
                        noti_time: noti_time,
                        noti_status: noti_status
                    }
                });
            }

            return res.status(200).json({ message: 'success', data: 'Data saved successfully' });

        } catch (error) {
            console.error('API /temperature error:', error);
            return res.status(400).json({ message: 'error', data: error });
        }
    } else {
        res.setHeader('Allow', ['PUT', 'POST']);
        return res.status(405).json({ message: 'error', data: `Method ${req.method} not allowed` });
    }
}
