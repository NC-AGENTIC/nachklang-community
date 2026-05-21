import { useTranslations } from "next-intl";

type Props = {
  recoveryCode: string;
  email: string;
  vaultId: string;
};

export function RecoveryPrintView({ recoveryCode, email, vaultId }: Props) {
  const t = useTranslations("onboarding.recoveryPrint");
  return (
    <article className="recovery-print">
      <h1>{t("heading")}</h1>
      <dl>
        <dt>{t("labelEmail")}</dt>
        <dd>{email}</dd>
        <dt>{t("labelVaultId")}</dt>
        <dd>{vaultId}</dd>
        <dt>{t("labelCreatedAt")}</dt>
        <dd>{new Date().toLocaleString("de-DE")}</dd>
        <dt>{t("labelCode")}</dt>
        <dd className="recovery-print__code">{recoveryCode}</dd>
      </dl>
      <p>{t("note")}</p>
    </article>
  );
}
