import { encrypt, parseQueryString } from "@/utils/helpers";
import * as api from "@/lib/listAPI";
import axios from "axios";

import { replyNotification, replyNoti } from "@/utils/apiLineGroup";

interface PostbackSafezoneProps {
  userLineId: string;
  takecarepersonId: number;
  extenId?: number; // เพิ่ม extenId เพื่อใช้เช็คสถานะจากปุ่มเดิม
}

const getLocation = async (
  takecare_id: number,
  users_id: number,
  safezone_id: number
) => {
  const response = await axios.get(
    `${process.env.WEB_DOMAIN}/api/location/getLocation?takecare_id=${takecare_id}&users_id=${users_id}&safezone_id=${safezone_id}`
  );
  if (response.data?.data) {
    return response.data.data;
  } else {
    return null;
  }
};

// --- (ฟังก์ชัน postbackHeartRate, postbackFall, postbackTemp ปล่อยไว้เหมือนเดิม หรือแก้ตาม Logic เดียวกันถ้าต้องการ) ---
// เพื่อความกระชับ ผมจะขอแสดงเฉพาะ postbackSafezone ที่เป็นหัวใจหลักของการแก้ไขนี้ครับ
// ส่วน HeartRate, Fall, Temp สามารถใช้ Logic แบบเดียวกับ Safezone ด้านล่างได้เลย

export const postbackSafezone = async ({
  userLineId,
  takecarepersonId,
  extenId,
}: PostbackSafezoneProps) => {
  try {
    const resUser = await api.getUser(userLineId);
    const resTakecareperson = await api.getTakecareperson(
      takecarepersonId.toString()
    );

    if (resUser && resTakecareperson) {
      
      // 1. ตรวจสอบกรณีมีการส่ง extenId มา (กดจากปุ่ม Flex Message เดิม)
      if (extenId) {
        const currentCase = await api.getExtendedHelpById(extenId);
        if (currentCase) {
          // ถ้าเคสถูกปิดไปแล้ว -> ห้ามกดซ้ำ
          if (currentCase.exted_closed_date) {
            return "case_closed";
          }
          // ถ้ามีคนรับเคสแล้ว -> ห้ามกดซ้ำ
          if (currentCase.exten_received_date || currentCase.exten_received_user_id) {
            return "case_received";
          }
          // ถ้าเคสยังเปิดอยู่และยังไม่ได้รับ (กำลังรอ) -> ห้ามกดซ้ำ
          return "already_sent";
        }
      }

      // 2. ตรวจสอบกรณีทั่วไป (กดจากเมนู หรือไม่มี extenId)
      // เช็คว่ามีเคสค้างอยู่ในระบบหรือไม่
      const resSafezone = await api.getSafezone(
        resTakecareperson.takecare_id,
        resUser.users_id
      );

      if (resSafezone) {
        const resExtendedHelp = await api.getExtendedHelp(
          resTakecareperson.takecare_id,
          resUser.users_id
        );

        // เช็คว่ามีเคสที่ยังไม่ปิดอยู่
        if (
          resExtendedHelp &&
          !resExtendedHelp.exted_closed_date
        ) {
           // ถ้ามีคนรับไปแล้ว (แต่ยังไม่ปิด)
           if (resExtendedHelp.exten_received_date || resExtendedHelp.exten_received_user_id) {
             return "case_received";
           }
           
           console.log(
            `Safezone case still open. exten_id: ${resExtendedHelp.exten_id}`
          );
          return "already_sent";
        }

        // 3. สร้างเคสใหม่ (เมื่อไม่มีเคสค้าง หรือเคสเก่าปิดไปแล้ว)
        let extendedHelpId = null;
        const data = {
          takecareId: resTakecareperson.takecare_id,
          usersId: resUser.users_id,
          typeStatus: "save",
          safezLatitude: resSafezone.safez_latitude,
          safezLongitude: resSafezone.safez_longitude,
        };
        const resExtendedHelpId = await api.saveExtendedHelp(data);
        extendedHelpId = resExtendedHelpId;

        const responeLocation = await getLocation(
          resTakecareperson.takecare_id,
          resUser.users_id,
          resSafezone.safezone_id
        );

        // *** สำคัญ: ในฟังก์ชัน replyNotification ต้องแน่ใจว่าปุ่มที่สร้างขึ้น
        // มีการแนบ data: `...&extenId=${extendedHelpId}` ไปด้วย
        await replyNotification({
          resUser,
          resTakecareperson,
          resSafezone,
          extendedHelpId,
          locationData: responeLocation,
        });
        
        // ส่ง Line ID กลับเพื่อบอกว่าสำเร็จ
        return resUser.users_line_id;
      } else {
        console.log(
          `NO SAFEZONE FOUND for takecare_id: ${resTakecareperson.takecare_id}, users_id: ${resUser.users_id}`
        );
      }
    } else {
      console.log(
        `USER or TAKECAREPERSON NOT FOUND. userLineId: ${userLineId}, takecarepersonId: ${takecarepersonId}`
      );
    }
    return null;
  } catch (error) {
    console.log("🚀 ~ postbackSafezone ~ error:", error);
    return null;
  }
};

// --- ฟังก์ชันอื่นๆ (Accept, Close) คงเดิมตามที่คุณมี ---

export const postbackAccept = async (data: any) => {
  try {
    const resUser = await api.getUser(data.userIdAccept);
    if (!resUser) {
      await replyNoti({
        replyToken: data.groupId,
        userIdAccept: data.userIdAccept,
        message: "ไม่พบข้อมูลของคุณไม่สามารถรับเคสได้",
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
            title: "สถานะเคส",
            titleColor: "#1976D2",
            message: "มีผู้รับเคสช่วยเหลือแล้ว",
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
            title: "สถานะเคส",
            titleColor: "#1976D2",
            message: "รับเคสช่วยเหลือแล้ว",
            buttons: [
              {
                type: "postback",
                label: "ปิดเคสช่วยเหลือ",
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
        message: "ไม่พบข้อมูลของคุณไม่สามารถปิดเคสได้",
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
            title: "สถานะเคส",
            titleColor: "#1976D2",
            message: "มีผู้ปิดเคสช่วยเหลือแล้ว",
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
            message: "ไม่สามารถปิดเคสได้ เนื่องจากยังไม่ได้ตอบรับการช่วยเหลือ",
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
            title: "สถานะเคส",
            titleColor: "#1976D2",
            message: "ปิดเคสช่วยเหลือแล้ว",
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