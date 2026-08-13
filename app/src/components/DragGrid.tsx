import React, { useRef, useState } from 'react';
import { Animated, LayoutAnimation, PanResponder, Platform, Pressable, UIManager, View } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SHIFT_ANIM = {
  duration: 160,
  update: { type: 'easeInEaseOut' as const },
  create: { type: 'easeInEaseOut' as const, property: 'opacity' as const },
  delete: { type: 'easeInEaseOut' as const, property: 'opacity' as const },
};

/**
 * iOS-homescreen-style reorder: long-press a cell to lift it, drag to its new
 * slot (neighbors animate aside), release to commit. Works as a list (columns=1)
 * or a wrapping grid. Cells must share a fixed height.
 *
 * Every cell is absolutely positioned and stays mounted for the whole gesture —
 * unmounting the touch's responder view mid-drag would kill the gesture.
 *
 * Taps are handled here too (`onPressItem`) so item content should be plain
 * views, not Pressables. Wrap the parent ScrollView with `scrollEnabled` driven
 * by `onDragActive` — a native scroll would fight the drag gesture otherwise.
 */
export function DragGrid<T>({ data, keyOf, renderItem, columns, itemHeight, onReorder, onPressItem, extraCell, onDragActive }: {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number, dragging: boolean, pressed: boolean) => React.ReactNode;
  columns: number;
  itemHeight: number;
  onReorder: (from: number, to: number) => void;
  onPressItem?: (item: T, index: number) => void;
  /** Trailing non-draggable cell (e.g. a "New" tile). Items can't be dropped past it. */
  extraCell?: React.ReactNode;
  onDragActive?: (active: boolean) => void;
}) {
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<{ index: number; hover: number } | null>(null);
  const dragRef = useRef<{ index: number; hover: number } | null>(null);
  const panActive = useRef(false);
  const pan = useRef(new Animated.ValueXY()).current;
  // Lift/jiggle share the transform with the JS-driven `pan`, so no native driver.
  const lift = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const wobbleLoop = useRef<Animated.CompositeAnimation | null>(null);
  const liftScale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const wobbleRot = wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-2.5deg', '2.5deg'] });

  const cellW = width > 0 ? width / columns : 0;
  const count = data.length;
  const rows = Math.max(1, Math.ceil((count + (extraCell ? 1 : 0)) / columns));
  const layout = useRef({ cellW, columns, itemHeight, count, rows });
  layout.current = { cellW, columns, itemHeight, count, rows };

  const setDragBoth = (d: { index: number; hover: number } | null) => { dragRef.current = d; setDrag(d); };
  const slotPos = (slot: number, cw: number) => ({ x: (slot % columns) * cw, y: Math.floor(slot / columns) * itemHeight });

  /** Where item i sits right now: the dragged item keeps its origin slot (pan moves
   * it visually); the rest flow around the gap that follows the finger. */
  const slotOf = (i: number) => {
    const d = drag;
    if (!d || i === d.index) return i;
    let s = i > d.index ? i - 1 : i;
    if (s >= d.hover) s += 1;
    return s;
  };

  const startDrag = (i: number) => {
    panActive.current = false;
    pan.setValue({ x: 0, y: 0 });
    setDragBoth({ index: i, hover: i });
    onDragActive?.(true);
    Animated.spring(lift, { toValue: 1, friction: 5, tension: 200, useNativeDriver: false }).start();
    wobble.setValue(0);
    wobbleLoop.current?.stop();
    wobbleLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(wobble, { toValue: 1, duration: 90, useNativeDriver: false }),
        Animated.timing(wobble, { toValue: -1, duration: 180, useNativeDriver: false }),
        Animated.timing(wobble, { toValue: 0, duration: 90, useNativeDriver: false }),
      ])
    );
    wobbleLoop.current.start();
  };

  const finish = (commit: boolean) => {
    const d = dragRef.current;
    if (!d) return;
    if (commit && d.hover !== d.index) onReorder(d.index, d.hover);
    setDragBoth(null);
    panActive.current = false;
    onDragActive?.(false);
    wobbleLoop.current?.stop();
    wobbleLoop.current = null;
    wobble.setValue(0);
    lift.setValue(0);
  };

  const responder = useRef(
    PanResponder.create({
      // Steal moves from child Pressables only while an item is lifted.
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => dragRef.current !== null,
      onMoveShouldSetPanResponder: () => dragRef.current !== null,
      // Don't let anything (e.g. the ScrollView) take the gesture back mid-drag.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => { panActive.current = true; },
      onPanResponderMove: (_, g) => {
        const d = dragRef.current;
        if (!d) return;
        pan.setValue({ x: g.dx, y: g.dy });
        const L = layout.current;
        if (!L.cellW) return;
        const o = slotPos(d.index, L.cellW);
        const col = Math.min(L.columns - 1, Math.max(0, Math.floor((o.x + g.dx + L.cellW / 2) / L.cellW)));
        const row = Math.min(L.rows - 1, Math.max(0, Math.floor((o.y + g.dy + L.itemHeight / 2) / L.itemHeight)));
        const idx = Math.min(L.count - 1, Math.max(0, row * L.columns + col));
        if (idx !== d.hover) {
          LayoutAnimation.configureNext(SHIFT_ANIM);
          setDragBoth({ ...d, hover: idx });
        }
      },
      onPanResponderRelease: () => finish(true),
      onPanResponderTerminate: () => finish(true),
    })
  ).current;

  return (
    <View
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      {...responder.panHandlers}
      style={{ height: rows * itemHeight }}
    >
      {width > 0 && data.map((item, i) => {
        const isDrag = drag?.index === i;
        const pos = slotPos(slotOf(i), cellW);
        return (
          <Animated.View
            key={keyOf(item)}
            style={{
              position: 'absolute', left: pos.x, top: pos.y, width: cellW, height: itemHeight,
              zIndex: isDrag ? 20 : 0, elevation: isDrag ? 8 : 0,
              transform: isDrag
                ? [{ translateX: pan.x }, { translateY: pan.y }, { scale: liftScale }, { rotate: wobbleRot }]
                : [],
              ...(isDrag ? { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } } : {}),
            }}
          >
            <Pressable
              delayLongPress={220}
              onLongPress={() => startDrag(i)}
              onPress={() => onPressItem?.(item, i)}
              // Lifted but never moved (pan not granted) — release should drop it back.
              onPressOut={() => {
                if (dragRef.current && !panActive.current) setTimeout(() => { if (dragRef.current && !panActive.current) finish(false); }, 80);
              }}
              style={{ flex: 1 }}
            >
              {({ pressed }) => renderItem(item, i, !!isDrag, pressed && !isDrag)}
            </Pressable>
          </Animated.View>
        );
      })}
      {width > 0 && extraCell && (
        <View style={{ position: 'absolute', left: slotPos(count, cellW).x, top: slotPos(count, cellW).y, width: cellW, height: itemHeight }}>
          {extraCell}
        </View>
      )}
    </View>
  );
}
