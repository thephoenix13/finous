import { useTranslation } from "react-i18next";
import { useMemberData } from "../../api/memberContext";
import { LoadError, LoadingCard } from "../../components/DataState";
import FormPage from "../../components/forms/FormPage";
import { useMemberRead } from "../../components/forms/useMemberRead";
import { PROFILE_SPECS } from "../../lib/memberForms";

/** The member's name and city. The name is what the greeting uses. */
export default function ProfileForm() {
  const { t } = useTranslation();
  const data = useMemberData()!;
  const read = useMemberRead();

  if (read.status === "loading") return <LoadingCard />;
  if (read.status === "error") return <LoadError onRetry={read.retry} />;

  const { profile } = read.input;
  return (
    <FormPage
      title={t("forms.profile.title")}
      intro={t("forms.profile.intro")}
      backTo="/you/profile"
      doneTo="/you/profile"
      specs={PROFILE_SPECS}
      // Until they give a name it is their email, which is not a name to put in a form.
      initial={{ fullName: profile.name === profile.email ? "" : profile.name, city: profile.city }}
      onSave={(values) => data.saveProfile({ fullName: values.fullName as string, city: (values.city as string | undefined) ?? "" })}
    />
  );
}
