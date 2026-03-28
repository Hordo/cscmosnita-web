import React from "react";
import "../styles/HomePage.css";
import logo from "../assets/CSCMosnita.png";

const features = [
  {
    title: "Performanță și Pasiune",
    desc: "Dezvoltăm tineri sportivi cu valori, disciplină și spirit de echipă în inima comunității din Moșnița.",
  },
  {
    title: "Echipă și Comunitate",
    desc: "Suntem o familie unită, cu antrenori dedicați și suporteri entuziaști. Fiecare membru contează!",
  },
  {
    title: "Infrastructură Modernă",
    desc: "Terenuri de calitate, echipamente moderne și un mediu sigur pentru antrenamente și competiții.",
  },
  {
    title: "Progres și Educație",
    desc: "Susținem educația și progresul personal al fiecărui jucător, pe teren și în afara lui.",
  },
];

export default function Home() {
  return (
    <>
      <div className="csc-home-hero">
        <img src={logo} alt="CSC Moșnița Logo" className="csc-home-logo" />
        <div className="csc-home-title">CSC Moșnița Nouă</div>
        <div className="csc-home-subtitle">
          Club sportiv de elită pentru tineri, performanță și comunitate.
        </div>
      </div>

      <div className="csc-home-section">
        <div className="csc-home-section-title">
          De ce să alegi CSC Moșnița?
        </div>
        <div className="csc-home-features">
          {features.map((f, i) => (
            <div className="csc-home-feature" key={i}>
              <div className="csc-home-feature-title">{f.title}</div>
              <div className="csc-home-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="csc-home-footer">
        &copy; {new Date().getFullYear()} CSC Moșnița Nouă &mdash; Toate
        drepturile rezervate
      </footer>
    </>
  );
}
