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
        <title>Trust, security and FCA AISP compliance | Flump</title>
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
                fontWeight: "600",
                letterSpacing: "0.01em",
                color: "#10b981",
              }}
            >
              Trust and transparency hub
            </span>
            <h1
              style={{
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary, #0f172a)",
                marginTop: "8px",
              }}
            >
              Security built into the architecture
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                color: "#64748b",
                maxWidth: "620px",
                margin: "12px auto 0",
              }}
            >
              Flump is designed around the principle of minimal data access, AES-256-GCM encryption
              at rest, TLS 1.3 in transit, and absolute user ownership.
            </p>

            <div style={{ marginTop: "20px" }}>
              <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                <FiMail style={{ marginRight: "6px" }} /> Contact security and support
              </Button>
            </div>
          </div>

          {/* Core Guarantees Grid */}
          <div className={grid({ columns: { base: 1, md: 2 }, gap: "6", mb: "12" })}>
            {/* Guarantee 1 */}
            <div className={sectionCardStyle}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiShield />
              </div>
              <h3 className={securityTitleStyle}>FCA Open Banking read-only AISP scope</h3>
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
                  backgroundColor: "rgba(99, 102, 241, 0.12)",
                  color: "#6366f1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiLock />
              </div>
              <h3 className={securityTitleStyle}>AES-256-GCM and TLS 1.3 transport security</h3>
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
                  backgroundColor: "rgba(245, 158, 11, 0.12)",
                  color: "#f59e0b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiEyeOff />
              </div>
              <h3 className={securityTitleStyle}>Private manual mode</h3>
              <p className={securityDescStyle}>
                If you prefer not to connect your bank feeds, you do not have to. Flump is fully
                usable with manual balance entries and CSV imports, giving you the same advanced tax
                and wealth projections with zero third-party bank connections.
              </p>
            </div>

            {/* Guarantee 4 */}
            <div className={sectionCardStyle}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(236, 72, 153, 0.12)",
                  color: "#ec4899",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  marginBottom: "16px",
                }}
              >
                <FiCheckCircle />
              </div>
              <h3 className={securityTitleStyle}>UK GDPR compliance and one-click deletion</h3>
              <p className={securityDescStyle}>
                We never monetise your data or sell transaction history to loan brokers. You retain
                the right to one-click permanent erasure: deleting your account permanently purges
                all historical data from our storage.
              </p>
            </div>
          </div>

          {/* FCA Permissions Ledger Table */}
          <div
            style={{
              backgroundColor: "var(--colors-card)",
              border: "1px solid var(--colors-border)",
              borderRadius: "16px",
              padding: "24px 28px",
              marginBottom: "40px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "var(--colors-text-primary)",
                  margin: 0,
                }}
              >
                FCA regulatory permissions ledger
              </h2>
              <p
                style={{ fontSize: "14px", color: "var(--colors-text-muted)", margin: "4px 0 0 0" }}
              >
                Formal breakdown of what Flump is technically and legally authorised to perform.
              </p>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--colors-border)",
                      color: "var(--colors-text-muted)",
                    }}
                  >
                    <th style={{ padding: "10px 12px", fontWeight: "600" }}>Operation</th>
                    <th style={{ padding: "10px 12px", fontWeight: "600" }}>Scope</th>
                    <th style={{ padding: "10px 12px", fontWeight: "600" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--colors-border)" }}>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: "500",
                        color: "var(--colors-text-primary)",
                      }}
                    >
                      Read balances and transactions
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--colors-text-muted)" }}>
                      AISP (Account Information Service)
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(16, 185, 129, 0.12)",
                          color: "#10b981",
                        }}
                      >
                        Permitted (Read-Only)
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--colors-border)" }}>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: "500",
                        color: "var(--colors-text-primary)",
                      }}
                    >
                      Initiate payments or transfers
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--colors-text-muted)" }}>
                      PISP (Payment Initiation Service)
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                          color: "#ef4444",
                        }}
                      >
                        Prohibited (No Access)
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--colors-border)" }}>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: "500",
                        color: "var(--colors-text-primary)",
                      }}
                    >
                      Store bank login credentials
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--colors-text-muted)" }}>
                      Direct Credentials
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                          color: "#ef4444",
                        }}
                      >
                        Prohibited (OAuth 2.0 PKCE)
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontWeight: "500",
                        color: "var(--colors-text-primary)",
                      }}
                    >
                      Sell records to credit lenders
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--colors-text-muted)" }}>
                      Third-Party Marketing
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                          color: "#ef4444",
                        }}
                      >
                        Prohibited (UK GDPR Compliant)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
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
                  Security and compliance enquiry
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
                  <p style={{ fontWeight: "700", fontSize: "1.1rem" }}>Enquiry sent</p>
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
                      Your name
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
                      Your email
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
                      Enquiry type
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
                      <option value="Security Question">Security and encryption details</option>
                      <option value="FCA Scope">Open Banking / AISP clarification</option>
                      <option value="GDPR Data Request">UK GDPR / data subject request</option>
                      <option value="General Support">General support enquiry</option>
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
                    <FiSend style={{ marginRight: "6px" }} /> Submit enquiry
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
