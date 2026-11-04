import * as Dialog from "@radix-ui/react-dialog";
import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import {
  FaArrowRight,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import { Link } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { AppPageKey } from "~/utils/pageConfig";

export interface ScoringCriterion {
  id: string;
  module: AppPageKey;
  moduleLabel: string;
  badgeColor?: string;
  title: string;
  earnedPoints: number;
  maxPoints: number;
  isPassed: boolean;
  whatHelps: string;
  whatHurts: string;
  howToImprove: string;
  actionRoute: string;
}

export interface ScoreMethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  rating: string;
  ratingColor: string;
  earnedPoints: number;
  maxPoints: number;
  criteria: ScoringCriterion[];
  enabledCount: number;
}

const backdropStyle = css({
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  backdropFilter: "blur(4px)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: { base: "10px", sm: "20px" },
});

const modalStyle = css({
  backgroundColor: "surface",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  width: "100%",
  maxWidth: "680px",
  maxHeight: { base: "94vh", md: "90vh" },
  overflowY: "auto",
  padding: { base: "20px 16px", sm: "24px" },
  position: "relative",
  outline: "none",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const ScoreMethodologyModal: FC<ScoreMethodologyModalProps> = ({
  isOpen,
  onClose,
  score,
  rating,
  ratingColor,
  earnedPoints,
  maxPoints,
  criteria,
  enabledCount,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={backdropStyle}>
          <Dialog.Content className={modalStyle}>
            {/* Header */}
            <div
              className={css({
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingBottom: "12px",
                borderBottom: "1px solid",
                borderColor: "border",
              })}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaInfoCircle className={css({ color: "primary", fontSize: "16px" })} />
                  <Dialog.Title asChild>
                    <FLPHeading as="h2" size="md">
                      How Your Health Score Is Created
                    </FLPHeading>
                  </Dialog.Title>
                </div>
                <Dialog.Description asChild>
                  <FLPText color="text.muted" fontSize="xs" style={{ marginTop: "4px" }}>
                    A transparent breakdown of how your score is calculated across your{" "}
                    {enabledCount} active sections.
                  </FLPText>
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close score methodology modal"
                  className={css({
                    border: "none",
                    background: "transparent",
                    color: "text.muted",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "md",
                    transition: "all 0.15s ease",
                    _hover: { color: "text.primary", backgroundColor: "rgba(255, 255, 255, 0.08)" },
                  })}
                >
                  <FaTimes size={16} />
                </button>
              </Dialog.Close>
            </div>

            {/* Current Score Summary Card */}
            <div
              className={css({
                padding: "14px 16px",
                borderRadius: "lg",
                backgroundColor: "background",
                border: "1px solid",
                borderColor: "border",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              })}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  className={css({
                    width: "48px",
                    height: "48px",
                    borderRadius: "full",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid",
                    flexShrink: 0,
                  })}
                  style={{
                    borderColor: ratingColor,
                    backgroundColor: `${ratingColor}18`,
                  }}
                >
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: ratingColor }}>
                    {score}
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: ratingColor,
                        textTransform: "uppercase",
                      }}
                    >
                      {rating} Health
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--colors-text-muted)" }}>•</span>
                    <span style={{ fontSize: "12px", fontWeight: 600 }}>
                      {earnedPoints} / {maxPoints} Total Points
                    </span>
                  </div>
                  <FLPText color="text.muted" fontSize="11px" style={{ marginTop: "2px" }}>
                    Score is derived proportionally from the maximum points of your enabled sections
                    only.
                  </FLPText>
                </div>
              </div>

              <div
                className={css({
                  display: "flex",
                  gap: "6px",
                  flexWrap: "wrap",
                  fontSize: "10px",
                })}
              >
                {[
                  { label: "85–100", name: "Excellent", color: "#10b981" },
                  { label: "70–84", name: "Strong", color: "#3b82f6" },
                  { label: "50–69", name: "Fair", color: "#f59e0b" },
                  { label: "<50", name: "Needs Focus", color: "#ef4444" },
                ].map((tier) => {
                  const isCurrent = rating.toLowerCase() === tier.name.toLowerCase();
                  return (
                    <div
                      key={tier.name}
                      className={css({
                        padding: "3px 8px",
                        borderRadius: "md",
                        border: "1px solid",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      })}
                      style={{
                        borderColor: isCurrent ? tier.color : "var(--colors-border)",
                        backgroundColor: isCurrent ? `${tier.color}20` : "transparent",
                        color: isCurrent ? tier.color : "var(--colors-text-muted)",
                        fontWeight: isCurrent ? 700 : 500,
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: tier.color,
                        }}
                      />
                      {tier.name} ({tier.label})
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Scoring Criteria List */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "8px",
                }}
              >
                <FLPHeading as="h3" size="sm">
                  Scoring Factors & What Counts
                </FLPHeading>
                <FLPText color="text.muted" fontSize="xs">
                  {criteria.filter((c) => c.isPassed).length} of {criteria.length} criteria met
                </FLPText>
              </div>

              <div className={css({ display: "flex", flexDirection: "column", gap: "10px" })}>
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    className={css({
                      padding: { base: "10px 12px", sm: "12px 14px" },
                      borderRadius: "lg",
                      backgroundColor: "surface",
                      border: "1px solid",
                      borderColor: item.isPassed ? "rgba(16, 185, 129, 0.25)" : "border",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    })}
                  >
                    {/* Title & Points row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}
                      >
                        {item.isPassed ? (
                          <FaCheckCircle
                            className={css({
                              color: "emerald.500",
                              fontSize: "14px",
                              flexShrink: 0,
                            })}
                          />
                        ) : (
                          <FaExclamationTriangle
                            className={css({
                              color: "warning.500",
                              fontSize: "13px",
                              flexShrink: 0,
                            })}
                          />
                        )}
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.title}
                        </span>
                        <span
                          className={css({
                            fontSize: "9px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: "full",
                            backgroundColor: "background",
                            color: "text.muted",
                            textTransform: "uppercase",
                          })}
                        >
                          {item.moduleLabel}
                        </span>
                      </div>

                      <span
                        className={css({
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "md",
                          flexShrink: 0,
                        })}
                        style={{
                          backgroundColor: item.isPassed
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(245, 158, 11, 0.12)",
                          color: item.isPassed
                            ? "var(--colors-emerald-500)"
                            : "var(--colors-warning-500)",
                        }}
                      >
                        {item.earnedPoints} / {item.maxPoints} pts
                      </span>
                    </div>

                    {/* What Counts Towards Good vs Bad */}
                    <div
                      className={css({
                        display: "grid",
                        gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
                        gap: "8px",
                        marginTop: "2px",
                        padding: "8px 10px",
                        borderRadius: "md",
                        backgroundColor: "background",
                        fontSize: "11px",
                      })}
                    >
                      <div>
                        <div
                          style={{
                            color: "var(--colors-emerald-500)",
                            fontWeight: 700,
                            marginBottom: "2px",
                          }}
                        >
                          ✓ What boosts score:
                        </div>
                        <div style={{ color: "var(--colors-text-muted)", lineHeight: 1.35 }}>
                          {item.whatHelps}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "var(--colors-warning-500)",
                            fontWeight: 700,
                            marginBottom: "2px",
                          }}
                        >
                          ✗ What hurts score:
                        </div>
                        <div style={{ color: "var(--colors-text-muted)", lineHeight: 1.35 }}>
                          {item.whatHurts}
                        </div>
                      </div>
                    </div>

                    {/* Actionable Improvement Tip */}
                    {!item.isPassed && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          marginTop: "2px",
                          paddingTop: "6px",
                          borderTop: "1px dashed var(--colors-border)",
                        }}
                      >
                        <FLPText fontSize="11px" color="text.muted" style={{ lineHeight: 1.3 }}>
                          <strong>How to improve:</strong> {item.howToImprove}
                        </FLPText>
                        <Link
                          to={item.actionRoute}
                          onClick={onClose}
                          className={css({
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "primary",
                            textDecoration: "none",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            flexShrink: 0,
                            _hover: { textDecoration: "underline" },
                          })}
                        >
                          Open {item.moduleLabel} <FaArrowRight size={9} />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "8px" }}>
              <Dialog.Close asChild>
                <FLPButton size="sm" variant="primary">
                  Done
                </FLPButton>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
