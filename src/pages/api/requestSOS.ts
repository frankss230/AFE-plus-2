import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { replyNotificationSOS } from '@/utils/apiLineReply';

type SosDecisionType =
  | 'UNKNOWN'
  | 'INSIDE_SAFEZONE_R2'
  | 'OUTSIDE_SAFEZONE_R2_WITH_ACTIVE_CASE'
  | 'OUTSIDE_SAFEZONE_R2_NO_ACTIVE_CASE';

type Data = {
  message: string;
  data?: any;
  canEscalate?: boolean | null;
  blockReason?: string | null;
  sosDecision?: {
    decision: SosDecisionType;
    distance: number | null;
    safez_radiuslv2: number | null;
    isOutsideSafezoneLv2: boolean | null;
    hasActiveCase: boolean | null;
  };
};

export default async function handle(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'error', data: `Method ${req.method} not allowed` });
  }

  if (req.headers['content-type'] !== 'application/json') {
    return res.status(400).json({ message: 'error', data: 'Content-Type must be application/json' });
  }

  const body = req.body;
  const uid = Number(body?.uid);

  if (!body?.uid) {
    return res.status(400).json({ message: 'error', data: 'Missing parameter uid' });
  }

  if (Number.isNaN(uid)) {
    return res.status(400).json({ message: 'error', data: 'uid must be a number' });
  }

  try {
    const user = await prisma.users.findFirst({
      where: { users_id: uid },
    });

    const takecareperson = await prisma.takecareperson.findFirst({
      where: {
        users_id: user?.users_id,
        takecare_status: 1,
      },
    });

    if (!user || !takecareperson) {
      return res.status(400).json({ message: 'error', data: 'User or takecareperson not found' });
    }

    const safezone = await prisma.safezone.findFirst({
      where: {
        users_id: user.users_id,
        takecare_id: takecareperson.takecare_id,
      },
    });

    const latestLocation = await prisma.location.findFirst({
      where: {
        users_id: user.users_id,
        takecare_id: takecareperson.takecare_id,
      },
      orderBy: { locat_timestamp: 'desc' },
    });

    const safezRadiusLv2 = safezone ? Number(safezone.safez_radiuslv2) : null;
    const distance = latestLocation ? Number(latestLocation.locat_distance) : null;

    const hasValidDistance = distance !== null && !Number.isNaN(distance);
    const hasValidRadiusLv2 = safezRadiusLv2 !== null && !Number.isNaN(safezRadiusLv2);

    const isOutsideSafezoneLv2 =
      hasValidDistance && hasValidRadiusLv2 ? distance > safezRadiusLv2 : null;

    let hasActiveCase: boolean | null = null;
    let decision: SosDecisionType = 'UNKNOWN';
    let canEscalate: boolean | null = null;
    let blockReason: string | null = null;

    if (isOutsideSafezoneLv2 === false) {
      decision = 'INSIDE_SAFEZONE_R2';
      hasActiveCase = false;
      canEscalate = false;
      blockReason = 'อยู่ในเขตปลอดภัยชั้น 2';
    } else if (isOutsideSafezoneLv2 === true) {
      const activeCase = await prisma.extendedhelp.findFirst({
        where: {
          user_id: user.users_id,
          takecare_id: takecareperson.takecare_id,
          exted_closed_date: null,
        },
        orderBy: { exten_date: 'desc' },
      });

      hasActiveCase = Boolean(activeCase);
      decision = hasActiveCase
        ? 'OUTSIDE_SAFEZONE_R2_WITH_ACTIVE_CASE'
        : 'OUTSIDE_SAFEZONE_R2_NO_ACTIVE_CASE';
      canEscalate = !hasActiveCase;
      blockReason = hasActiveCase ? 'มีเคสค้างที่ยังไม่ปิด' : null;
    }

    if (decision === 'UNKNOWN') {
      return res.status(400).json({
        message: 'error',
        data: 'Safezone or location data is missing',
        sosDecision: {
          decision,
          distance,
          safez_radiuslv2: safezRadiusLv2,
          isOutsideSafezoneLv2,
          hasActiveCase,
        },
        canEscalate,
        blockReason,
      });
    }

    let message = '';
    let shouldNotifyCaretaker = false;
    if (decision === 'INSIDE_SAFEZONE_R2') {
      message = '⚠️ มีการกด SOS จากภายในบ้าน (ระบบระงับการแจ้งเหตุถึงเทศบาล)';
      shouldNotifyCaretaker = true;
    } else if (decision === 'OUTSIDE_SAFEZONE_R2_WITH_ACTIVE_CASE') {
      message = '⚠️ คุณกดขอความช่วยเหลือซ้ำ แต่ขณะนี้เจ้าหน้าที่กำลังดำเนินการอยู่ (ยังไม่ปิดเคสเดิม)';
      shouldNotifyCaretaker = true;
    }

    const replyToken = user.users_line_id || '';
    if (shouldNotifyCaretaker && replyToken) {
      await replyNotificationSOS({ replyToken, message });
    }

    if (canEscalate === false) {
      return res.status(409).json({
        message: 'blocked',
        data: user,
        canEscalate,
        blockReason,
        sosDecision: {
          decision,
          distance,
          safez_radiuslv2: safezRadiusLv2,
          isOutsideSafezoneLv2,
          hasActiveCase,
        },
      });
    }

    return res.status(200).json({
      message: 'success',
      data: user,
      canEscalate,
      blockReason,
      sosDecision: {
        decision,
        distance,
        safez_radiuslv2: safezRadiusLv2,
        isOutsideSafezoneLv2,
        hasActiveCase,
      },
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'error', data: 'Internal server error' });
  }
}
