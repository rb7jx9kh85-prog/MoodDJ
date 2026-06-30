"use client";

/** Blurred green orbs that drift slowly behind the content. */
export default function FloatingOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="floating-orb"
        style={{
          top: "-6rem",
          left: "-4rem",
          width: "28rem",
          height: "28rem",
          background: "rgba(29, 185, 84, 0.22)",
          animationDelay: "0s",
        }}
      />
      <span
        className="floating-orb"
        style={{
          top: "20%",
          right: "-6rem",
          width: "24rem",
          height: "24rem",
          background: "rgba(30, 215, 96, 0.16)",
          animationDelay: "-4s",
        }}
      />
      <span
        className="floating-orb"
        style={{
          bottom: "-8rem",
          left: "30%",
          width: "30rem",
          height: "30rem",
          background: "rgba(16, 185, 129, 0.12)",
          animationDelay: "-8s",
        }}
      />
    </div>
  );
}
