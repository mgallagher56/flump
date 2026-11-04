import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import { type FC, useState } from "react";
import { Helmet } from "react-helmet-async";
import { FiCheckCircle, FiEyeOff, FiLock, FiMail, FiSend, FiShield, FiX } from "react-icons/fi";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";

const containerStyle = css({
  maxWidth: "5xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const sectionCardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  p: { base: "6", md: "8" },
  boxShadow: { base: "0 4px 16px rgba(0,0,0,0.03)", _dark: "0 4px 16px rgba(0,0,0,0.2)" },
  mb: "8",
});

const modalOverlayStyle = css({
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(15, 23, 42, 0.6)",
  backdropFilter: "blur(4px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50,
  p: "4",
});

const modalContentStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "2xl",
  maxWidth: "500px",
  width: "100%",
  p: "6",
  boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
  position: "relative",
});

const securityTitleStyle = css({
  fontSize: "1.25rem",
  fontWeight: "700",
  color: { base: "slate.900", _dark: "#ffffff" },
  marginBottom: "8px",
});

const securityDescStyle = css({
  fontSize: "14px",
  color: { base: "slate.600", _dark: "slate.300" },
  lineHeight: "1.7",
});

export const SecurityPage: FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquirySubject, setInquirySubject] = useState("Security Question");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setModalOpen(false);
      setInquiryMessage("");
    }, 2500);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Trust, Security & FCA AISP Compliance | Flump</title>
        <meta
          name="description"
          content="Learn how Flump protects your data with FCA-regulated read-only Open Banking, 256-bit encryption, strict UK GDPR compliance, and manual privacy mode."
        />
        <link rel="canonical" href="https://flump.co.uk/security" />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#10b981",
              }}
            >
              Trust & Transparency Hub
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "8px",
              }}
            >
              Security Built Into the Architecture
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#64748b",
                maxWidth: "620px",
                margin: "12px auto 0",
              }}
            >
              Flump is designed around the principle of minimal data access, bank-grade encryption,
              and absolute user ownership.
            </p>

            <div style={{ marginTop: "20px" }}>
              <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                <FiMail style={{ marginRight: "6px" }} /> Contact Security & Support
              </Button>
            </div>
          </div>

          {/* Core Guarantees Grid */}
          <div className={grid({ columns: { base: 1, md: 2 }, gap: "6", mb: "8" })}>
            {/* Guarantee 1 */}
            <div className={sectionCardStyle}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiShield />
              </div>
              <h3 className={securityTitleStyle}>FCA Open Banking Read-Only AISP Scope</h3>
              <p className={securityDescStyle}>
                Flump operates strictly under Account Information Service Provider (AISP)
                regulations. We do not have Payment Initiation Service (PISP) permissions. Flump can
                never move money, make transfers, or touch your balances.
              </p>
            </div>

            {/* Guarantee 2 */}
            <div className={sectionCardStyle}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiLock />
              </div>
              <h3 className={securityTitleStyle}>Bank-Grade 256-bit AES & TLS 1.3</h3>
              <p className={securityDescStyle}>
                All sensitive personal financial records are encrypted using 256-bit Advanced
                Encryption Standard (AES-GCM) at rest. In transit, all network traffic is forced
                over TLS 1.3 with HSTS preloading.
              </p>
            </div>

            {/* Guarantee 3 */}
            <div className={sectionCardStyle}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiEyeOff />
              </div>
              <h3 className={securityTitleStyle}>Manual-Only Air-Gapped Privacy Mode</h3>
              <p className={securityDescStyle}>
                If you prefer not to connect your bank feeds, you don't have to. Flump is 100%
                usable with manual balance entries and CSV imports, giving you the same advanced tax
                and wealth projections with zero 3rd-party bank ties.
              </p>
            </div>

            {/* Guarantee 4 */}
            <div className={sectionCardStyle}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "#fce7f3",
                  color: "#db2777",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiCheckCircle />
              </div>
              <h3 className={securityTitleStyle}>UK GDPR Compliance & One-Click Deletion</h3>
              <p className={securityDescStyle}>
                We never monetize your data or sell transaction history to loan brokers. You retain
                the right to one-click permanent erasure: deleting your account permanently purges
                all historical data from our storage.
              </p>
            </div>
          </div>
        </section>

        {/* Lightweight Support / Security Modal */}
        {modalOpen && (
          <div className={modalOverlayStyle}>
            <button
              type="button"
              aria-label="Close modal backdrop"
              onClick={() => setModalOpen(false)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="security-modal-title"
              className={modalContentStyle}
              style={{ position: "relative", zIndex: 1 }}
            >
              <div className={flex({ justify: "space-between", align: "center", mb: "4" })}>
                <h3
                  id="security-modal-title"
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "700",
                    color: "var(--colors-text-primary, #0f172a)",
                    margin: 0,
                  }}
                >
                  Security & Compliance Inquiry
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <FiX size={20} />
                </button>
              </div>

              {submitted ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#059669" }}>
                  <FiCheckCircle size={40} style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontWeight: "700", fontSize: "1.1rem" }}>Inquiry Dispatched</p>
                  <p style={{ fontSize: "13px", color: "var(--colors-text-muted, #64748b)" }}>
                    Our compliance team will respond within 1 business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitInquiry} className={stack({ gap: "3" })}>
                  <label style={{ display: "block" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--colors-text-muted, #475569)",
                        display: "block",
                      }}
                    >
                      Your Name
                    </span>
                    <input
                      type="text"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder="Jane Doe"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border, #cbd5e1)",
                        backgroundColor: "var(--colors-background, #ffffff)",
                        color: "var(--colors-text-primary, #0f172a)",
                        marginTop: "4px",
                      }}
                    />
                  </label>
                  <label style={{ display: "block" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--colors-text-muted, #475569)",
                        display: "block",
                      }}
                    >
                      Your Email
                    </span>
                    <input
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder="jane@example.co.uk"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border, #cbd5e1)",
                        backgroundColor: "var(--colors-background, #ffffff)",
                        color: "var(--colors-text-primary, #0f172a)",
                        marginTop: "4px",
                      }}
                    />
                  </label>
                  <label style={{ display: "block" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--colors-text-muted, #475569)",
                        display: "block",
                      }}
                    >
                      Inquiry Type
                    </span>
                    <select
                      value={inquirySubject}
                      onChange={(e) => setInquirySubject(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border, #cbd5e1)",
                        backgroundColor: "var(--colors-background, #ffffff)",
                        color: "var(--colors-text-primary, #0f172a)",
                        marginTop: "4px",
                      }}
                    >
                      <option value="Security Question">Security & Encryption Details</option>
                      <option value="FCA Scope">Open Banking / AISP Clarification</option>
                      <option value="GDPR Data Request">UK GDPR / Data Subject Request</option>
                      <option value="General Support">General Support Inquiry</option>
                    </select>
                  </label>
                  <label style={{ display: "block" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "var(--colors-text-muted, #475569)",
                        display: "block",
                      }}
                    >
                      Message
                    </span>
                    <textarea
                      required
                      rows={3}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="How can our compliance team assist?"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--colors-border, #cbd5e1)",
                        backgroundColor: "var(--colors-background, #ffffff)",
                        color: "var(--colors-text-primary, #0f172a)",
                        marginTop: "4px",
                      }}
                    />
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    style={{ marginTop: "12px", justifyContent: "center" }}
                  >
                    <FiSend style={{ marginRight: "6px" }} /> Submit Inquiry
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
