import "server-only";

import { escapeHtml, sendMail } from "@/lib/mail";

type PasswordEmail = {
  to: string;
  name: string;
  url: string;
  kind: "invite" | "reset";
};

const copy = {
  invite: {
    subject: "CEWM idarə panelinə dəvət",
    lead: "Sizi CEWM saytının idarə panelinə dəvət etdilər. Daxil olmaq üçün şifrənizi təyin edin.",
    action: "Şifrəni təyin et",
  },
  reset: {
    subject: "CEWM idarə paneli: şifrənin bərpası",
    lead: "Şifrəni bərpa etmək üçün sorğu göndərilib. Yeni şifrə təyin etmək üçün linkə keçin.",
    action: "Yeni şifrə təyin et",
  },
} as const;

const footer =
  "Link 24 saat etibarlıdır. Bu sorğunu siz göndərməmisinizsə, məktuba məhəl qoymayın.";

export async function passwordEmail({ to, name, url, kind }: PasswordEmail): Promise<void> {
  const text = copy[kind];
  await sendMail({
    to,
    subject: text.subject,
    text: `Salam, ${name}.\n\n${text.lead}\n\n${url}\n\n${footer}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#303030">
<p>Salam, ${escapeHtml(name)}.</p>
<p>${text.lead}</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 24px;border-radius:999px;background:#54565a;color:#ffffff;text-decoration:none">${text.action}</a></p>
<p style="color:#767676;font-size:13px">${footer}</p>
</div>`,
  });
}
