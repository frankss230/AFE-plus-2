import * as api from "@/lib/listAPI";
import axios from "axios";
import prisma from "@/lib/prisma";
import { replyNotification, replyNoti } from "@/utils/apiLineGroup";
import { replyNotificationSOS } from "@/utils/apiLineReply";

interface PostbackSafezoneProps {
    userLineId: string;
    takecarepersonId: number;
}

const getLocation = async (
    takecare_id: number,
    users_id: number,
    safezone_id: number
) => {
    const response = await axios.get(
        `${process.env.WEB_DOMAIN}/api/location/getLocation?takecare_id=${takecare_id}&users_id=${users_id}&safezone_id=${safezone_id}`
    );
    return response.data?.data || null;
};

const blockByRuleMessage = {
    inside: "⚠️ ไม่สามารถส่งขอความช่วยเหลือเพิ่มเติมได้ เนื่องจากยังอยู่ในเขตปลอดภัย",
    active: "⚠️ ไม่สามารถส่งขอความช่วยเหลือซ้ำได้ เนื่องจากมีเคสค้างที่ยังไม่ปิด",
} as const;

const prepareEscalationData = async ({
    userLineId,
    takecarepersonId,
}: PostbackSafezoneProps) => {
    const resUser = await api.getUser(userLineId);
    const resTakecareperson = await api.getTakecareperson(takecarepersonId.toString());

    if (!resUser || !resTakecareperson) {
        return { ok: false as const, reason: "ไม่พบข้อมูลผู้ดูแลหรือผู้ที่มีภาวะพึ่งพิง" };
    }

    const resSafezone = await api.getSafezone(resTakecareperson.takecare_id, resUser.users_id);
    if (!resSafezone) {
        return { ok: false as const, reason: "ไม่พบข้อมูล Safezone" };
    }

    const responseLocation = await getLocation(
        resTakecareperson.takecare_id,
        resUser.users_id,
        resSafezone.safezone_id
    );

    if (!responseLocation) {
        return { ok: false as const, reason: "ไม่พบข้อมูลตำแหน่งล่าสุด" };
    }

    const distance = Number(responseLocation.locat_distance);
    const radiusLv2 = Number(resSafezone.safez_radiuslv2);

    if (Number.isNaN(distance) || Number.isNaN(radiusLv2)) {
        return { ok: false as const, reason: "ไม่สามารถคำนวณระยะ Safezone ได้" };
    }

    if (distance <= radiusLv2) {
        return { ok: false as const, blocked: true as const, reason: blockByRuleMessage.inside };
    }

    const activeCase = await prisma.extendedhelp.findFirst({
        where: {
            user_id: resUser.users_id,
            takecare_id: resTakecareperson.takecare_id,
            exted_closed_date: null,
        },
        orderBy: { exten_date: "desc" },
    });

    if (activeCase) {
        return { ok: false as const, blocked: true as const, reason: blockByRuleMessage.active };
    }

    return {
        ok: true as const,
        resUser,
        resTakecareperson,
        resSafezone,
        responseLocation,
    };
};

const executeEscalation = async ({
    userLineId,
    takecarepersonId,
}: PostbackSafezoneProps): Promise<string | null> => {
    try {
        const prepared = await prepareEscalationData({ userLineId, takecarepersonId });

        if (!prepared.ok) {
            if (prepared.reason && userLineId) {
                await replyNotificationSOS({
                    replyToken: userLineId,
                    message: prepared.reason,
                });
            }
            return null;
        }

        const { resUser, resTakecareperson, resSafezone, responseLocation } = prepared;
        const extendedHelpId = await api.saveExtendedHelp({
            takecareId: resTakecareperson.takecare_id,
            usersId: resUser.users_id,
            typeStatus: "save",
            safezLatitude: resSafezone.safez_latitude,
            safezLongitude: resSafezone.safez_longitude,
        });

        if (!extendedHelpId) {
            if (userLineId) {
                await replyNotificationSOS({
                    replyToken: userLineId,
                    message: "ไม่สามารถสร้างเคสขอความช่วยเหลือได้",
                });
            }
            return null;
        }

        await replyNotification({
            resUser,
            resTakecareperson,
            resSafezone,
            extendedHelpId,
            locationData: responseLocation,
        });

        return resUser.users_line_id || null;
    } catch (error) {
        console.log("postback escalation error:", error);
        if (userLineId) {
            await replyNotificationSOS({
                replyToken: userLineId,
                message: "ระบบไม่สามารถส่งคำขอได้ในขณะนี้",
            });
        }
        return null;
    }
};

export const postbackHeartRate = async ({
    userLineId,
    takecarepersonId,
}: PostbackSafezoneProps): Promise<string | null> => {
    return executeEscalation({ userLineId, takecarepersonId });
};

export const postbackFall = async ({
    userLineId,
    takecarepersonId,
}: PostbackSafezoneProps): Promise<string | null> => {
    return executeEscalation({ userLineId, takecarepersonId });
};

export const postbackTemp = async ({
    userLineId,
    takecarepersonId,
}: PostbackSafezoneProps): Promise<string | null> => {
    return executeEscalation({ userLineId, takecarepersonId });
};

export const postbackSafezone = async ({
    userLineId,
    takecarepersonId,
}: PostbackSafezoneProps): Promise<string | null> => {
    return executeEscalation({ userLineId, takecarepersonId });
};

export const postbackAccept = async (data: any) => {
    try {
        const resUser = await api.getUser(data.userIdAccept);
        if (!resUser) {
            await replyNoti({
                replyToken: data.groupId,
                userIdAccept: data.userIdAccept,
                message: "à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‚à¸­à¸‡à¸„à¸¸à¸“à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸£à¸±à¸šà¹€à¸„à¸ªà¹„à¸”à¹‰",
            });
            return null;
        } else {
            const resExtendedHelp = await api.getExtendedHelpById(data.extenId);
            if (resExtendedHelp) {
                if (
                    resExtendedHelp.exten_received_date &&
                    resExtendedHelp.exten_received_user_id
                ) {
                    await replyNoti({
                        replyToken: data.groupId,
                        userIdAccept: data.userIdAccept,
                        title: "à¸ªà¸–à¸²à¸™à¸°à¹€à¸„à¸ª",
                        titleColor: "#1976D2",
                        message: "à¸¡à¸µà¸œà¸¹à¹‰à¸£à¸±à¸šà¹€à¸„à¸ªà¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­à¹à¸¥à¹‰à¸§",
                    });
                    return null;
                } else {
                    await api.updateExtendedHelp({
                        extenId: data.extenId,
                        typeStatus: "received",
                        extenReceivedUserId: resUser.users_id,
                    });
                    await replyNoti({
                        replyToken: data.groupId,
                        userIdAccept: data.userIdAccept,
                        title: "à¸ªà¸–à¸²à¸™à¸°à¹€à¸„à¸ª",
                        titleColor: "#1976D2",
                        message: "à¸£à¸±à¸šà¹€à¸„à¸ªà¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­à¹à¸¥à¹‰à¸§",
                        buttons: [
                            {
                                type: 'postback',
                                label: 'à¸›à¸´à¸”à¹€à¸„à¸ªà¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­',
                                data: `type=close&takecareId=${data.takecareId}&extenId=${data.extenId}&userLineId=${data.userLineId}`,
                            },
                        ],
                    });
                    return data.userLineId;
                }
            }
        }
        return null;
    } catch (error) {
        return error;
    }
};

export const postbackClose = async (data: any) => {
    try {
        const resUser = await api.getUser(data.userIdAccept);
        if (!resUser) {
            await replyNoti({
                replyToken: data.groupId,
                userIdAccept: data.userIdAccept,
                message: "à¹„à¸¡à¹ˆà¸žà¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸‚à¸­à¸‡à¸„à¸¸à¸“à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸›à¸´à¸”à¹€à¸„à¸ªà¹„à¸”à¹‰",
            });
            return null;
        } else {
            const resExtendedHelp = await api.getExtendedHelpById(data.extenId);
            if (resExtendedHelp) {
                if (
                    resExtendedHelp.exted_closed_date &&
                    resExtendedHelp.exten_closed_user_id
                ) {
                    await replyNoti({
                        replyToken: data.groupId,
                        userIdAccept: data.userIdAccept,
                        title: "à¸ªà¸–à¸²à¸™à¸°à¹€à¸„à¸ª",
                        titleColor: "#1976D2",
                        message: "à¸¡à¸µà¸œà¸¹à¹‰à¸›à¸´à¸”à¹€à¸„à¸ªà¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­à¹à¸¥à¹‰à¸§",
                    });
                    return null;
                }
                if (
                    !resExtendedHelp.exten_received_date &&
                    !resExtendedHelp.exten_received_user_id
                ) {
                    await replyNoti({
                        replyToken: data.groupId,
                        userIdAccept: data.userIdAccept,
                        message:
                            "à¹„à¸¡à¹ˆà¸ªà¸²à¸¡à¸²à¸£à¸–à¸›à¸´à¸”à¹€à¸„à¸ªà¹„à¸”à¹‰ à¹€à¸™à¸·à¹ˆà¸­à¸‡à¸ˆà¸²à¸à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸•à¸­à¸šà¸£à¸±à¸šà¸à¸²à¸£à¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­",
                    });
                    return null;
                } else {
                    await api.updateExtendedHelp({
                        extenId: data.extenId,
                        typeStatus: "close",
                        extenClosedUserId: resUser.users_id,
                    });
                    await replyNoti({
                        replyToken: data.groupId,
                        userIdAccept: data.userIdAccept,
                        title: "à¸ªà¸–à¸²à¸™à¸°à¹€à¸„à¸ª",
                        titleColor: "#1976D2",
                        message: "à¸›à¸´à¸”à¹€à¸„à¸ªà¸Šà¹ˆà¸§à¸¢à¹€à¸«à¸¥à¸·à¸­à¹à¸¥à¹‰à¸§",
                    });
                    return data.userLineId;
                }
            }
        }
        return null;
    } catch (error) {
        return error;
    }
};

