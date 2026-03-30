import { useTranslation } from "react-i18next";

export default function About() {
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  return (
    <div className="container py-4">
      <h2>{isRO ? "Despre club" : "About the club"}</h2>
      <p style={{ maxWidth: 700 }}>
        {isRO
          ? "CSC Moșnița este un club sportiv dedicat promovării activităților sportive pentru copii și tineri din comunitatea noastră. Oferim o gamă largă de discipline sportive și antrenamente gratuite."
          : "CSC Moșnița is a sports club dedicated to promoting sports activities for children and youth in our community. We offer a wide range of sports disciplines and free training sessions."}
      </p>
    </div>
  );
}
