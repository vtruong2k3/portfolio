"use client";

/**
 * TechIconOrbit — quỹ đạo các Tech_Icon_Card bay quanh tâm trong Skills Section.
 *
 * Component R3F (sub-scene) này render BÊN TRONG một `<Canvas>` (qua
 * `SceneCanvas`) chứ KHÔNG tự tạo `<Canvas>` riêng. Nó chỉ điều phối bố cục và
 * chuyển động; toàn bộ toán học quỹ đạo nằm trong hàm thuần
 * `computeOrbitPosition` và việc chọn số thẻ nằm trong `selectCardCount`
 * (`lib/three/orbit.ts`), giúp tách logic để kiểm thử dựa trên thuộc tính.
 *
 * Bố cục (Req 7.2, 7.3, 7.10):
 * - `selectCardCount(skills.length, tier)` chọn 6–8 thẻ, tier `low` tối đa 6,
 *   và không vượt quá số kỹ năng khả dụng.
 * - Mỗi thẻ cách đều nhau trên vòng tròn bán kính `ORBIT_RADIUS` (góc gốc =
 *   `index * 360 / total`).
 *
 * Chuyển động (Req 7.5, 7.6, 7.9, 7.13):
 * - Mỗi frame, vị trí quỹ đạo được tính lại bằng `computeOrbitPosition` theo
 *   Orbit_Motion_Config (xoay 6°/s + bay ±0.05 chu kỳ 4s) và áp trực tiếp vào
 *   `group.position` (không gây re-render React).
 * - Khi `reducedMotion === true`: thẻ đứng yên tại vị trí gốc tĩnh — `useFrame`
 *   không cập nhật vị trí, và vị trí khởi tạo lấy từ `computeOrbitPosition` với
 *   `reduced: true`.
 *
 * Mỗi thẻ được bọc trong một `<group>` đảm nhận VỊ TRÍ quỹ đạo; bản thân
 * `TechIconCard` dùng drei `<Billboard>` (đặt `basePosition` = gốc tương đối)
 * để luôn hướng mặt về camera (Req 7.4).
 *
 * Hover (Req 7.7, 7.8): chỉ một thẻ được hover tại một thời điểm; trạng thái
 * hover do component này giữ và truyền xuống từng `TechIconCard`.
 *
 * _Requirements: 7.2, 7.3, 7.5, 7.6, 7.9, 7.10, 7.13_
 */

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

import { TechIconCard } from "./TechIconCard";
import {
  computeOrbitPosition,
  selectCardCount,
  type Vec3,
} from "@/lib/three/orbit";
import type { GraphicsTier } from "@/lib/three/graphicsTier";
import type { Skill } from "@/types/skill";

/** Bán kính quỹ đạo (đơn vị thế giới). */
const ORBIT_RADIUS = 2.6;

export interface TechIconOrbitProps {
  /** Danh sách kỹ năng (từ `useSkills()`); sẽ được cắt 6–8 theo tier. */
  skills: Skill[];
  /** Reduced_Motion_Mode: khi bật, các thẻ đứng yên (Req 7.9). */
  reducedMotion: boolean;
  /** Graphics_Tier hiện tại; tier `low` giới hạn ≤ 6 thẻ (Req 7.10). */
  tier: GraphicsTier;
}

export function TechIconOrbit({
  skills,
  reducedMotion,
  tier,
}: TechIconOrbitProps) {
  // Số thẻ hiển thị: 6–8, ≤ 6 trên tier `low`, không vượt số kỹ năng khả dụng.
  const cardCount = useMemo(
    () => selectCardCount(skills.length, tier),
    [skills.length, tier],
  );

  // Cắt danh sách kỹ năng theo số thẻ đã chọn.
  const visibleSkills = useMemo(
    () => skills.slice(0, cardCount),
    [skills, cardCount],
  );

  // Refs tới group bọc mỗi thẻ — vị trí quỹ đạo được set imperatively mỗi frame.
  const groupRefs = useRef<Array<Group | null>>([]);

  // Chỉ một thẻ được hover tại một thời điểm.
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Vị trí khởi tạo (tĩnh) cho mỗi thẻ — dùng làm `position` ban đầu của group.
  // Khi reducedMotion, đây cũng là vị trí cuối cùng (useFrame không cập nhật).
  const initialPositions = useMemo<Vec3[]>(() => {
    const total = visibleSkills.length;
    return visibleSkills.map((_, index) =>
      computeOrbitPosition({
        index,
        total,
        radius: ORBIT_RADIUS,
        elapsedSec: 0,
        reduced: true,
      }).position,
    );
  }, [visibleSkills]);

  // Cập nhật vị trí quỹ đạo mỗi frame (Req 7.5, 7.6, 7.13). Khi reduced motion,
  // không cập nhật để giữ thẻ đứng yên (Req 7.9).
  useFrame((state) => {
    if (reducedMotion) return;
    const total = visibleSkills.length;
    const elapsedSec = state.clock.getElapsedTime();
    for (let index = 0; index < total; index++) {
      const group = groupRefs.current[index];
      if (!group) continue;
      const { position } = computeOrbitPosition({
        index,
        total,
        radius: ORBIT_RADIUS,
        elapsedSec,
        reduced: false,
      });
      group.position.set(position[0], position[1], position[2]);
    }
  });

  return (
    <group>
      {visibleSkills.map((skill, index) => (
        <group
          key={skill.id}
          ref={(node) => {
            groupRefs.current[index] = node;
          }}
          position={initialPositions[index]}
        >
          <TechIconCard
            iconUrl={skill.icon ?? ""}
            label={skill.name}
            basePosition={[0, 0, 0]}
            hovered={hoveredIndex === index}
            reducedMotion={reducedMotion}
            onHover={() => setHoveredIndex(index)}
            onLeave={() =>
              setHoveredIndex((prev) => (prev === index ? null : prev))
            }
          />
        </group>
      ))}
    </group>
  );
}

export default TechIconOrbit;
