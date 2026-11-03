import { css } from "@repo/ui/styled-system/css";
import type { FC } from "react";
import { useState } from "react";
import { FaArrowRight, FaCog, FaEyeSlash, FaGripVertical } from "react-icons/fa";
import { Link } from "react-router";
import FLPCard from "~/components/core/cards/FLPCard";
import FLPHeading from "~/components/core/typography/FLPHeading";
import { DASHBOARD_WIDGET_METAS, type DashboardWidgetKey } from "~/utils/pageConfig";

export interface DashboardWidgetCardProps {
  widgetKey: DashboardWidgetKey;
  editMode: boolean;
  size: "normal" | "wide";
  onToggleSize?: () => void;
  onHide?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  hideOpenLink?: boolean;
  children: React.ReactNode;
  renderSettings?: (isOpen: boolean, onClose: () => void) => React.ReactNode;
  dragProps?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    isDragging?: boolean;
  };
}

export const DashboardWidgetCard: FC<DashboardWidgetCardProps> = ({
  widgetKey,
  editMode,
  size,
  onToggleSize,
  onHide,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  hideOpenLink,
  children,
  renderSettings,
  dragProps,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isDragging, ...domDragProps } = dragProps || {};
  const page = DASHBOARD_WIDGET_METAS[widgetKey] || {
    label: widgetKey,
    route: "/app",
    badgeColor: "#6363f1",
  };

  return (
    <div
      {...domDragProps}
      className={css({
        gridColumn: size === "wide" ? "1 / -1" : "span 1",
        contentVisibility: "auto",
        containIntrinsicSize: "auto 280px",
        transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
        borderRadius: "xl",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        cursor: editMode ? (isDragging ? "grabbing" : "grab") : undefined,
        opacity: isDragging ? 0.45 : 1,
        transform: isDragging ? "scale(0.98)" : undefined,
        boxShadow: isDragging ? "0 10px 25px -5px rgba(0, 0, 0, 0.2)" : undefined,
        _active: editMode ? { cursor: "grabbing" } : undefined,
      })}
    >
      <FLPCard
        className={css({
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          cursor: editMode ? (isDragging ? "grabbing" : "grab") : undefined,
          _active: editMode ? { cursor: "grabbing" } : undefined,
        })}
      >
        <div>
          {/* Widget Header */}
          <div
            className={css({
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: { base: "10px", md: "16px" },
              paddingBottom: { base: "8px", md: "12px" },
              borderBottom: "1px solid",
              borderColor: "border",
              gap: { base: "4px", md: "8px" },
              cursor: editMode ? (isDragging ? "grabbing" : "grab") : undefined,
              _active: editMode ? { cursor: "grabbing" } : undefined,
            })}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}
            >
              {editMode && (
                <span
                  role="img"
                  aria-label="Drag to reorder"
                  className={css({
                    cursor: isDragging ? "grabbing" : "grab",
                    color: "primary",
                    display: "inline-flex",
                    alignItems: "center",
                    flexShrink: 0,
                    _active: { cursor: "grabbing" },
                  })}
                >
                  <FaGripVertical size={13} />
                </span>
              )}
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: page.badgeColor,
                  flexShrink: 0,
                }}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <FLPHeading
                  as="h3"
                  className={css({
                    fontSize: { base: "xs", sm: "sm" },
                    fontWeight: "semibold",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  })}
                >
                  {page.label}
                </FLPHeading>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              {/* Widget specific customization button */}
              {renderSettings && (
                <button
                  aria-label={`Customize ${page.label} widget`}
                  title="Customize widget"
                  className={css({
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: { base: "24px", md: "28px" },
                    height: { base: "24px", md: "28px" },
                    borderRadius: "md",
                    border: "1px solid",
                    borderColor: "border",
                    background: "transparent",
                    color: "text.muted",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    _hover: {
                      color: "primary",
                      borderColor: "primary",
                      backgroundColor: "rgba(99, 99, 241, 0.08)",
                    },
                  })}
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <FaCog size={12} />
                </button>
              )}

              {/* Edit controls */}
              {editMode && (
                <>
                  {onMoveUp && !isFirst && (
                    <button
                      aria-label="Move widget up"
                      title="Move up"
                      className={css({
                        width: { base: "24px", md: "28px" },
                        height: { base: "24px", md: "28px" },
                        borderRadius: "md",
                        border: "1px solid",
                        borderColor: "border",
                        background: "transparent",
                        color: "text.muted",
                        cursor: "pointer",
                        _hover: { color: "primary", borderColor: "primary" },
                      })}
                      type="button"
                      onClick={onMoveUp}
                    >
                      ↑
                    </button>
                  )}
                  {onMoveDown && !isLast && (
                    <button
                      aria-label="Move widget down"
                      title="Move down"
                      className={css({
                        width: { base: "24px", md: "28px" },
                        height: { base: "24px", md: "28px" },
                        borderRadius: "md",
                        border: "1px solid",
                        borderColor: "border",
                        background: "transparent",
                        color: "text.muted",
                        cursor: "pointer",
                        _hover: { color: "primary", borderColor: "primary" },
                      })}
                      type="button"
                      onClick={onMoveDown}
                    >
                      ↓
                    </button>
                  )}
                  {onToggleSize && (
                    <button
                      aria-label={`Switch to ${size === "wide" ? "standard" : "wide"} width`}
                      title={size === "wide" ? "Make 1 column" : "Make 2 columns"}
                      className={css({
                        fontSize: "10px",
                        fontWeight: "bold",
                        padding: { base: "2px 4px", md: "4px 8px" },
                        borderRadius: "md",
                        border: "1px solid",
                        borderColor: "border",
                        background: "transparent",
                        color: "text.muted",
                        cursor: "pointer",
                        _hover: { color: "primary", borderColor: "primary" },
                      })}
                      type="button"
                      onClick={onToggleSize}
                    >
                      {size === "wide" ? "2x" : "1x"}
                    </button>
                  )}
                  {onHide && (
                    <button
                      aria-label={`Hide ${page.label} widget`}
                      title="Hide widget"
                      className={css({
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { base: "24px", md: "28px" },
                        height: { base: "24px", md: "28px" },
                        borderRadius: "md",
                        border: "1px solid",
                        borderColor: "border",
                        background: "transparent",
                        color: "text.muted",
                        cursor: "pointer",
                        _hover: { color: "destructive", borderColor: "destructive" },
                      })}
                      type="button"
                      onClick={onHide}
                    >
                      <FaEyeSlash size={12} />
                    </button>
                  )}
                </>
              )}

              {!hideOpenLink && widgetKey !== "financialHealth" && Boolean(page.route) && (
                <Link
                  to={page.route}
                  className={css({
                    display: editMode ? { base: "none", md: "inline-flex" } : "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: { base: "11px", md: "xs" },
                    fontWeight: "semibold",
                    color: "primary",
                    textDecoration: "none",
                    padding: { base: "4px 6px", sm: "4px 8px" },
                    borderRadius: "md",
                    transition: "background 0.15s ease",
                    _hover: { backgroundColor: "rgba(99, 99, 241, 0.08)" },
                  })}
                >
                  <span className={css({ display: { base: "none", sm: "inline" } })}>Open </span>
                  <FaArrowRight size={10} />
                </Link>
              )}
            </div>
          </div>

          {/* Content */}
          {children}
        </div>

        {/* Settings Modal */}
        {renderSettings?.(isSettingsOpen, () => setIsSettingsOpen(false))}
      </FLPCard>
    </div>
  );
};
