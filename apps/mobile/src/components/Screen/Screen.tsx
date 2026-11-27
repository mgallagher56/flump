import {
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  type ScrollViewInstance,
  TextInput,
  View,
} from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollFieldIntoView,
  scrollToShowField,
  useKeyboardInset,
} from "../../device/keyboardInset";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles } from "./Screen.styles";

export interface ScreenProps {
  children: ReactNode;
  /**
   * Scrolls by default, so content at 200% text or on a 320 point screen is never cut off. Turn it
   * off only for a screen that manages its own scrolling (a list).
   */
  scroll?: boolean;
  /** Centres short content vertically, as on the first screen. */
  centred?: boolean;
  /**
   * Which safe-area edges to pad. Defaults to all four; a screen under a stack header leaves out
   * `top`, because the header already clears it.
   */
  edges?: readonly Edge[];
  /**
   * Pull to refresh: the platform's own control, which spins until the promise settles. The figures
   * stay on screen while it runs. Only on a screen that scrolls.
   */
  onRefresh?: () => Promise<unknown>;
  /**
   * A form: while the keyboard is open the keyboard's height is added below the content, so every
   * field and button can be scrolled above it, and the field being typed in is scrolled into view.
   * A tap on a button while the keyboard is open presses it.
   */
  keyboardAware?: boolean;
  /** The scroll view, for a screen that opens at one of its groups (Settings' net worth choices). */
  scrollRef?: Ref<ScrollViewInstance>;
  /** Rendered over the page outside the scroll view so status notices never shift scroll content. */
  overlay?: ReactNode;
  testID?: string;
}

const ALL_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

/** How many frames a scroll to a field is followed up for: about a third of a second. */
const FOLLOW_FRAMES = 20;

/** The page around every screen: the canvas colour, safe areas, the phone gutter and spacing. */
export function Screen({
  children,
  scroll = true,
  centred = false,
  edges = ALL_EDGES,
  onRefresh,
  keyboardAware = false,
  scrollRef,
  overlay,
  testID,
}: ScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const overlayEdges = useMemo(() => edges.filter((edge) => edge !== "top"), [edges]);
  const content = [styles.content, centred ? styles.centred : null];
  const [refreshing, setRefreshing] = useState(false);
  const own = useRef<ScrollViewInstance | null>(null);
  const setScroller = useCallback(
    (node: ScrollViewInstance | null) => {
      own.current = node;
      if (typeof scrollRef === "function") scrollRef(node);
      else if (scrollRef) (scrollRef as RefObject<ScrollViewInstance | null>).current = node;
    },
    [scrollRef],
  );
  const inset = useKeyboardInset();
  const room = keyboardAware ? inset : 0;
  const [overlayHeight, setOverlayHeight] = useState(0);
  useEffect(() => {
    if (!overlay) setOverlayHeight(0);
  }, [overlay]);
  const overlayRoom = overlay ? overlayHeight : 0;
  const scrollY = useRef(0);
  const viewport = useRef(0);
  const margin = theme.spacing["density.gap"];
  // A scroll to a field, followed up on the next frames until the scroll view gets there. The
  // content-size event reaches JS from layout before the phone's scroll view holds the taller
  // content, so a scroll sent then stops at the old end, and nothing says when the phone catches
  // up (device trace, 27 November 2026: 6 tries in 12 stopped at 115.8 for 212.6).
  const wanted = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const stopFollowing = useCallback(() => {
    wanted.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const scrollUntilThere = useCallback(
    (to: number) => {
      stopFollowing();
      wanted.current = to;
      own.current?.scrollTo({ y: to, animated: false });
      let frames = 0;
      const check = () => {
        frame.current = null;
        const target = wanted.current;
        if (target === null) return;
        // There (to the pixel), or given up after about a third of a second: stop.
        if (scrollY.current >= target - 1 || frames >= FOLLOW_FRAMES) {
          wanted.current = null;
          return;
        }
        frames += 1;
        own.current?.scrollTo({ y: target, animated: false });
        frame.current = requestAnimationFrame(check);
      };
      frame.current = requestAnimationFrame(check);
    },
    [stopFollowing],
  );
  useEffect(() => stopFollowing, [stopFollowing]);
  const showFocusedField = useCallback(() => {
    if (!keyboardAware || room === 0) return;
    const field = TextInput.State.currentlyFocusedInput();
    const scroller = own.current;
    const content = scroller?.getInnerViewRef?.();
    if (!field || !scroller || !content) return;
    field.measureLayout(
      content as never,
      (_x, y, _w, height) => {
        const to = scrollToShowField({
          fieldY: y,
          fieldHeight: height,
          scrollY: scrollY.current,
          viewport: viewport.current,
          inset: room,
          margin,
        });
        if (to !== null) scrollUntilThere(to);
      },
      () => {},
    );
  }, [keyboardAware, room, margin, scrollUntilThere]);
  // When the keyboard opens, the field that opened it comes into view: now, and again on every
  // content-size change while it is open. Until the keyboard's room below the content is laid out, a
  // field near the end cannot be scrolled far enough: the scroll view stops at its old end (device
  // re-check, 27 Nov 2026). The second try used to be a one-shot flag set here, which a size change
  // arriving before this effect, or another size change, could spend, leaving the field behind the
  // keyboard 2 times in 4 (device check after PR 973). Each try scrolls only when the field is
  // hidden, so trying on every size change is safe.
  useEffect(() => {
    if (room === 0) {
      stopFollowing();
      return;
    }
    showFocusedField();
  }, [room, showFocusedField, stopFollowing]);
  const refresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      // A failed refresh keeps what is on screen; the screen's own state says what failed.
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const keyboardProps = keyboardAware
    ? {
        scrollEventThrottle: 16,
        onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        },
        onLayout: (e: LayoutChangeEvent) => {
          viewport.current = e.nativeEvent.layout.height;
        },
        onContentSizeChange: () => showFocusedField(),
      }
    : {};
  const page = scroll ? (
    <ScrollView
      ref={setScroller}
      // Persist taps on every Screen so buttons on non-form screens and inside nested modal sheets
      // act on the first tap while a keyboard is open.
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        content,
        // Below the content: the page's own space, plus keyboard height and any bottom overlay height.
        keyboardAware || overlayRoom > 0
          ? { paddingBottom: theme.spacing["page.top.sm"] + room + overlayRoom }
          : null,
      ]}
      {...keyboardProps}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.colors["text.secondary"]}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors["surface.card"]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={content}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={edges} testID={testID}>
      {keyboardAware ? (
        <ScrollFieldIntoView.Provider value={showFocusedField}>{page}</ScrollFieldIntoView.Provider>
      ) : (
        page
      )}
      {overlay ? (
        <SafeAreaView
          pointerEvents="box-none"
          edges={overlayEdges}
          style={styles.overlay}
          testID={testID ? `${testID}-overlay` : undefined}
          onLayout={(event) => {
            const next = event.nativeEvent.layout.height;
            setOverlayHeight((prev) => (prev === next ? prev : next));
          }}
        >
          {overlay}
        </SafeAreaView>
      ) : null}
    </SafeAreaView>
  );
}
